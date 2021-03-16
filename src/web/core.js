const express = require('express');
const bodyParser = require('body-parser');
const morgan  = require('morgan');
const mustacheExpress = require('mustache-express');

class Web {
  port = process.env.PORT || 3000;
  PAGE_LIMIT = 10;

  constructor(config, db, glue){
    this.glue = glue;
    this.db = db;

    this.app = express();
    this.app.use(morgan('combined'));

    this.app.engine('html', mustacheExpress());
    this.app.set('view engine', 'html');
    this.app.set('views', `${__dirname}/views`);
    this.app.disable('view cache');

    this.app.use(express.static(`${__dirname}/public`));
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.use(bodyParser.json())


    // Render main page including recent workout summaries
    this.app.get('/', (req, res) => {
      // Grab the latest workouts and map them to pull in
      // the associated ride, instructor, and performance info
      // TODO - might want to restructure workout model to normalize
      //        required data or join to get all data at once
      let recentWorkouts = this.db.Workout.recent(10);
      recentWorkouts.forEach(w => {
        let user = this.db.User.get(w.user_id);
        w.user = user;

        let ride = this.db.Ride.get(w.ride_id);
        w.ride = ride;

        let instructor = this.db.Instructor.get(ride.data.instructor_id);
        w.instructor = instructor;

        // Pull the average output metric for the workout
        if (w.performance.average_summaries[0]){
          w.avg_output = w.performance.average_summaries[0].value;
        }
      });

      // Render the index template
      res.render('index', {
        workouts: {
          data: recentWorkouts,
          debug: JSON.stringify(recentWorkouts, null, 2)
        }
      });
    });


    // User search handler - mainly for form POST until we move to JS based
    this.app.post('/users/search', (req, res) => {
      let username = req.body.username;
      res.redirect(301, `/users/${username}`);
    });


    // User lookup endpoint
    this.app.get('/users/:username', (req, res) => {
      let username = req.params.username;
      let user = this.db.User.first({username: username});

      // TODO - ERROR HERE IF NOT FOUND

      // Lookup the workout count and determine the page bounds
      let workoutCount = this.db.Workout.count({user_id: user.id});
      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(workoutCount / this.PAGE_LIMIT)]);

      // Lookup the associated workouts for the user with proper page/limits
      let workouts = this.db.Workout.where({
        user_id: user.id
      }, this.PAGE_LIMIT, page - 1);



      /*
       * TODO - not sure if this is the most efficient, although SQLite is supposed
       *        to handle multiple small queries pretty well
       * TODO - instructor and ride can technically both be cached
       *
       * Can reduce the ride and instructor ids down to a single set and perform
       * a single query to fetch all, then reassemble into objects
       * let rideIDs = workouts.reduce((result, workout) => { result[workout.ride_id] = true; return result }, {});
       * let rides = Object.keys(rideIDs).forEach((result, rideID) => {
       *   let ride = this.db.Ride.where({id: rideID});
       *   workout.ride = ride;
       * })
       *
      */
      // For each workout, grab associated ride and instructor
      workouts.forEach(w => {
        let ride = this.db.Ride.get(w.ride_id);
        w.ride = ride;

        let instructor = this.db.Instructor.get(ride.data.instructor_id);
        w.instructor = instructor;
      });


      // Generate pagination for workout data
      const pagination = {
        total: workoutCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (workoutCount / this.PAGE_LIMIT) ? page + 1 : null
      }


      // Render the users template with the associated data
      res.render('users', {
        user: {
          username: username,
          data: user.data,
          debug: JSON.stringify(user, null, 2)
        },
        pagination: {
          data: pagination,
          debug: JSON.stringify(pagination, null, 2)
        },
        workouts: {
          data: workouts,
          debug: JSON.stringify(workouts, null, 2),
        }
      });
    });



    // Rider list endpoint
    this.app.get('/riders', (req, res) => {
      // Lookup the user count and determine the page bounds
      let userCount = this.db.User.count();
      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(userCount / this.PAGE_LIMIT)]);

      // Look users with proper page/limit
      let users = this.db.User.where({}, this.PAGE_LIMIT, page - 1);

      // Generate pagination for workout data
      const pagination = {
        total: userCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (userCount / this.PAGE_LIMIT) ? page + 1 : null
      }


      // Render riders template with associated data
      res.render('riders', {
        riders: {
          data: users,
          debug: JSON.stringify(users, null, 2)
        },
        pagination: {
          data: pagination,
          debug: JSON.stringify(pagination, null, 2)
        }
      });
    });



    // Shake and bake search handler - mainly for form POST until we move to JS based
    this.app.post('/shakeandbake', (req, res) => {
      let usernameA = req.body.usernameA;
      let usernameB = req.body.usernameB
      res.redirect(301, `/shakeandbake?users=${usernameA},${usernameB}`);
    });


    // User comparison endpoint
    // TODO - once await is removed from getResource calls, we can remove the
    //        async prefix and await usage in this endpoint
    this.app.get('/shakeandbake', async(req, res) => {
      let usersParam = req.query.users;
      let usernames = usersParam.split(",");

      let usernameA = usernames[0];
      let usernameB = usernames[1];

      let userA = this.db.User.first({username: usernameA});
      let userB = this.db.User.first({username: usernameB});


      if (userA == undefined || userB == undefined){
        console.log(`Could not find users / ${usernameA} / ${usernameB}`);
        res.redirect(301, '/');
        return;
      }

      // Use the rickybobby "glue" handler to perform the commonWorkouts call
      // for the two users then render the data
      let commonWorkouts = await this.glue.commonWorkouts(usernameA, usernameB);
      res.render('shakeandbake', {
        title: `${userA.username} vs. ${userB.username}`,
        userA: {
          data: userA.data,
          wins: commonWorkouts.wins[ userA.id ],
          winner: commonWorkouts.wins[ userA.id ] > commonWorkouts.wins[ userB.id ],
          debug: JSON.stringify({user: userA, wins: commonWorkouts.wins[ userA.id ]}, null, 2)
        },
        userB: {
          data: userB.data,
          winner: commonWorkouts.wins[ userA.id ] < commonWorkouts.wins[ userB.id ],
          wins: commonWorkouts.wins[ userB.id ],
          debug: JSON.stringify({user: userB, wins: commonWorkouts.wins[ userB.id ]}, null, 2)
        },
        workouts: {
          data: Object.values(commonWorkouts),
          debug: JSON.stringify(Object.values(commonWorkouts), null, 2)
        }
      });
    })

  }


  start(){
    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`rickybobby webserver listening at http://0.0.0.0:${this.port}`);
    });
  }
}


module.exports = Web;