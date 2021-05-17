const express = require('express');
const bodyParser = require('body-parser');
const morgan  = require('morgan');
const helpers = require('./helpers');

class Web {
  port = process.env.PORT || 3000;
  PAGE_LIMIT = {
    users: 16,
    workouts: 10,
    compare: 10,
  };

  constructor(config, db, glue){
    this.glue = glue;
    this.db = db;

    this.app = express();
    this.app.use(morgan('combined', {'stream': logger.stream}));

    this.app.set('view engine', 'ejs');
    this.app.set('views', `${__dirname}/views`);
    this.app.disable('view cache');

    this.app.use(express.static(`${__dirname}/public`, {maxage: '2h'}));
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

        // If we have a valid ride_id/ride then attempt to grab the
        // instructor, otherwise just set the title to Free Ride
        if (ride){
          let instructor = this.db.Instructor.get(ride.instructor_id);
          w.instructor = instructor;
        } else {
          w.ride = {title: "Free Ride"}
        }
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
    this.app.post('/api/v1/users/search', (req, res) => {
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

    this.app.get('/api/v1/users', (req, res) => {
      let userCount = this.db.User.count();

      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(userCount / this.PAGE_LIMIT.users )]);

      let users = this.db.User.where({
        limit: this.PAGE_LIMIT.users,
        page: page - 1
      });

      users = users.map(user => {
        return {
          id: user.id,
          username: user.username,
          image_url: user.image_url
        }
      });

      // Generate pagination for workout data
      const pagination = {
        total: userCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (userCount / this.PAGE_LIMIT.users ) ? page + 1 : null
      }

      let payload = {
        users: users,
        pagination: pagination
      };

      res.setHeader('Content-Type', 'application/json');
      res.json(payload);
    });


    // Rider list endpoint
    this.app.get('/users', (req, res) => {
      // Lookup the user count and determine the page bounds
      let userCount = this.db.User.count();
      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(userCount / this.PAGE_LIMIT.users )]);

      let users = this.db.User.where({
        limit: this.PAGE_LIMIT.users,
        page: page - 1
      });

      // Generate pagination for workout data
      const pagination = {
        total: userCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (userCount / this.PAGE_LIMIT.users ) ? page + 1 : null
      }

      // Map users into groups of (4) for display purposes
      let userList = helpers.chunk(users, 4);

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


      if (!user){
        return res.redirect(301, `/users/`);
      }

      // If the tracked value on the user record is undefined,
      // then attempt to track the user and return early with the appropriate message
      if (!user.tracked || user.private){
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
      page = Math.min(...[page, Math.ceil(workoutCount / this.PAGE_LIMIT.workouts )]);

      // Lookup the associated workouts for the user with proper page/limits
      let workouts = this.db.Workout.where({
        conditions: {
          user_id: user.id
        },
        orderBy: {
          field: "taken_at",
          direction: "desc"
        },
        limit: this.PAGE_LIMIT.workouts,
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
        next_page: page < (workoutCount / this.PAGE_LIMIT.workouts ) ? page + 1 : null
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


      let summary = this.db.Workout.commonWorkoutSummary({
        userA: userA,
        userB: userB
      });

      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(summary.rideCount / this.PAGE_LIMIT.compare )]);

      // Use the rickybobby "glue" handler to perform the commonWorkouts call
      // for the two users then render the data
      let comparison = this.glue.commonWorkouts({
        usernameA: usernameA,
        usernameB: usernameB,
        limit: this.PAGE_LIMIT.compare,
        page: page - 1,
      })


      // Generate pagination for workout data
      const pagination = {
        total: summary.rideCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (summary.rideCount / this.PAGE_LIMIT.compare ) ? page + 1 : null
      }


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
          data: summary,
          debug: JSON.stringify(comparison.summary)
        },
        rides: {
          data: comparison.rides,
          debug: JSON.stringify(comparison.rides)
        },
        pagination: {
          data: pagination,
          debug: JSON.stringify(pagination, null, 2)
        },
      });
    })


    this.app.get('/slingshot', (req, res) => {
      let takenByUsername    = req.query.takenBy;
      let notTakenByUsername = req.query.notTakenBy;

      let takenBy    = this.db.User.first({username: takenByUsername});
      let notTakenBy = this.db.User.first({username: notTakenByUsername});


      if (takenBy == undefined || notTakenBy == undefined){
        logger.warn(`Could not find users / ${takenByUsername} / ${notTakenByUsername}`);
        res.redirect(301, '/');
        return;
      }

      if (!takenBy.tracked){
        logger.warn(`${takenBy.username} not tracked!`);
        return res.redirect(301, `/users/${takenBy.username}`);
      }

      if (!notTakenBy.tracked){
        logger.warn(`${notTakenBy.username} not tracked!`);
        return res.redirect(301, `/users/${notTakenBy.username}`);
      }


      // Get total count of unique rides available
      let uniqueCount = this.db.Workout.compareWorkoutRides({
        mode: "unique",
        userA: takenBy,
        userB: notTakenBy,
        count: true
      });

      // Format pagination
      let page = parseInt(req.query.p) || 1;
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(uniqueCount / this.PAGE_LIMIT.compare )]);

      // Generate pagination for workout data
      const pagination = {
        total: uniqueCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (uniqueCount / this.PAGE_LIMIT.compare ) ? page + 1 : null
      }


      // Find all the rides that are exclusively taken by userA
      let unique = this.db.Workout.uniqueWorkouts({
        takenBy: takenBy,
        notTakenBy: notTakenBy,
        limit: this.PAGE_LIMIT.compare,
        page: page - 1,
      })


      // For each workout, grab associated ride and instructor
      unique.forEach(w => {
        let ride = this.db.Ride.get(w.ride_id) || {};
        w.ride = ride;

        let instructor = this.db.Instructor.get(ride.instructor_id);
        w.instructor = instructor || { image_url: "/images/peloton.jpg" };
      });


      // Grab the summary so we can show the overall scores
      let summary = this.db.Workout.commonWorkoutSummary({
        userA: takenBy,
        userB: notTakenBy
      });

      res.render('slingshot', {
        helpers: helpers,
        title: `Rides for ${notTakenBy.username} to beat ${takenBy.username}`,
        userA: {
          data: notTakenBy,
          debug: JSON.stringify(notTakenBy),
        },
        userB: {
          data: takenBy,
          debug: JSON.stringify(takenBy),
        },
        workouts: {
          data: unique,
          debug: JSON.stringify(unique),
        },
        summary: {
          data: summary,
          debug: JSON.stringify(summary),
        },
        pagination: {
          data: pagination,
          debug: JSON.stringify(pagination)
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
