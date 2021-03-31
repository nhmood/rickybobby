const express = require('express');
const bodyParser = require('body-parser');
const morgan  = require('morgan');
const helpers = require('./helpers');

class Web {
  port = process.env.PORT || 3000;
  PAGE_LIMIT = 10;

  constructor(config, db, glue){
    this.glue = glue;
    this.db = db;

    this.app = express();
    this.app.use(morgan('combined'));

    this.app.set('view engine', 'ejs');
    this.app.set('views', `${__dirname}/views`);
    this.app.disable('view cache');

    this.app.use(express.static(`${__dirname}/public`));
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.use(bodyParser.json())


    this.app.get('/about', (req, res) => {
      res.render('about', {
        title: "about"
      });
    });

    // Render main page including recent workout summaries
    this.app.get('/', (req, res) => {
      // Grab the latest workouts and map them to pull in
      // the associated ride, instructor, and performance info
      // TODO - might want to restructure workout model to normalize
      //        required data or join to get all data at once
      let recentWorkouts = this.db.Workout.where({
        orderBy: {
          field: 'taken_at',
          direction: 'desc'
        },
        limit: 10
      });

      recentWorkouts.forEach(w => {
        let user = this.db.User.get(w.user_id);
        w.user = user;

        let ride = this.db.Ride.get(w.ride_id);
        w.ride = ride;

        let instructor = this.db.Instructor.get(ride.instructor_id);
        w.instructor = instructor;
      });

      // Render the index template
      res.render('index', {
        title: "if you're not first, you're last",
        helpers: helpers,
        workouts: {
          data: recentWorkouts,
          debug: JSON.stringify(recentWorkouts, null, 2)
        }
      });
    });


    // User search handler - mainly for form POST until we move to JS based
    this.app.post('/users/search', (req, res) => {
      let username = req.body.username;

      let users = this.db.User.search(username);
      users = users.map(user => {
        return {
          id: user.id,
          username: user.username,
          image_url: user.image_url
        }
      });

      res.setHeader('Content-Type', 'application/json');
      res.json(users);
    });


    // Rider list endpoint
    this.app.get('/users', (req, res) => {
      // Lookup the user count and determine the page bounds
      let userCount = this.db.User.count();
      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(userCount / this.PAGE_LIMIT)]);

      // Look users with proper page/limit
      let userList = {
        tracked: [],
        untracked: []
      };

      let users = this.db.User.where({
      });

      // Split users out into tracked and nontracked
      users.forEach(user => {
        let group = user.tracked ? 'tracked' : 'untracked';
        userList[group].push( user );
      });

      // Generate pagination for workout data
      const pagination = {
        total: userCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (userCount / this.PAGE_LIMIT) ? page + 1 : null
      }

      // Map users into groups of (6) for display purposes
      userList.tracked = helpers.chunk(userList.tracked, 4);
      userList.untracked = helpers.chunk(userList.untracked, 4);

      // Render riders template with associated data
      res.render('users', {
        title: "Riders",
        users: {
          data: userList,
          debug: JSON.stringify(users, null, 2)
        },
        pagination: {
          data: pagination,
          debug: JSON.stringify(pagination, null, 2)
        }
      });
    });




    // User lookup endpoint
    this.app.get('/users/:username', (req, res) => {
      let username = req.params.username;
      let user = this.db.User.first({username: username});


      // If the tracked value on the user record is undefined,
      // then attempt to track the user and return early with the appropriate message
      if (!user.tracked){

        // To prevent multiple writes to the DB, only update the tracked state
        // one time if this is the first time viewing this page
        if (user.tracked == undefined){
          user.update({tracked: 0});
        }

        // Render the users template with the associated data
        return res.render('user_new_track', {
          title: `${user.username}`,
          helpers: helpers,
          not_tracked: true,
          user: {
            username: username,
            data: user
          },
          pagination: {
            data: {prev_page: null, next_page: null}
          },
          workouts: {
            data: []
          }
        });
      }


      // TODO - ERROR HERE IF NOT FOUND

      // Lookup the workout count and determine the page bounds
      let workoutCount = this.db.Workout.count({user_id: user.id});
      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(workoutCount / this.PAGE_LIMIT)]);

      // Lookup the associated workouts for the user with proper page/limits
      let workouts = this.db.Workout.where({
        conditions: {
          user_id: user.id
        },
        orderBy: {
          field: "taken_at",
          direction: "desc"
        },
        limit: this.PAGE_LIMIT,
        page: page - 1
      });



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
        let ride = this.db.Ride.get(w.ride_id) || {};
        w.ride = ride;

        let instructor = this.db.Instructor.get(ride.instructor_id);
        w.instructor = instructor || { image_url: "/images/peloton.jpg" };
      });

      // Lookup the followers associated with this user, map them to
      // proper User objects, then chunk them into groups of (6) for display
      let following = this.db.Following.fromUser(user.id);
      following.users = following.users.map(user => { return new this.db.User(user) });
      following.users = helpers.chunk(following.users, 6);


      // Generate pagination for workout data
      const pagination = {
        total: workoutCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (workoutCount / this.PAGE_LIMIT) ? page + 1 : null
      }


      // Render the users template with the associated data
      res.render('user', {
        title: `${user.username}`,
        helpers: helpers,
        following: following,
        user: {
          username: username,
          data: user,
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





    // Shake and bake search handler - mainly for form POST until we move to JS based
    this.app.post('/shakeandbake', (req, res) => {
      let usernameA = req.body.usernameA;
      let usernameB = req.body.usernameB
      res.redirect(301, `/shakeandbake?users=${usernameA},${usernameB}`);
    });


    // User comparison endpoint
    // TODO - once await is removed from getResource calls, we can remove the
    //        async prefix and await usage in this endpoint
    this.app.get('/shakeandbake', (req, res) => {
      let usersParam = req.query.users;
      let usernames = usersParam.split(",");

      let usernameA = usernames[0];
      let usernameB = usernames[1];

      let userA = this.db.User.first({username: usernameA});
      let userB = this.db.User.first({username: usernameB});


      if (userA == undefined || userB == undefined){
        logger.warn(`Could not find users / ${usernameA} / ${usernameB}`);
        res.redirect(301, '/');
        return;
      }

      if (!userA.tracked){
        logger.warn(`${userA.username} not tracked!`);
        return res.redirect(301, `/users/${userA.username}`);
      }

      if (!userB.tracked){
        logger.warn(`${userB.username} not tracked!`);
        return res.redirect(301, `/users/${userB.username}`);
      }

      // Use the rickybobby "glue" handler to perform the commonWorkouts call
      // for the two users then render the data
      let comparison = this.glue.commonWorkouts(usernameA, usernameB);
      res.render('shakeandbake', {
        helpers: helpers,
        title: `${userA.username} vs. ${userB.username}`,
        userA: {
          data: userA,
          debug: JSON.stringify(userA),
        },
        userB: {
          data: userB,
          debug: JSON.stringify(userB),
        },
        summary: {
          data: comparison.summary,
          debug: JSON.stringify(comparison.summary)
        },
        rides: {
          data: comparison.rides,
          debug: JSON.stringify(comparison.rides)
        }
      });
    })

  }


  start(){
    this.app.listen(this.port, '0.0.0.0', () => {
      logger.info(`rickybobby webserver listening at http://0.0.0.0:${this.port}`);
    });
  }
}


module.exports = Web;
