const express = require('express');
const bodyParser = require('body-parser');
const morgan  = require('morgan');
const mustacheExpress = require('mustache-express');

class Web {
  port = process.env.PORT || 3000;
  PAGE_LIMIT = 10;

  constructor(config, db){
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



    this.app.get('/users/:username', (req, res) => {
      let username = req.params.username;
      console.log(`Attempting to lookup ${username}`);
      let user = this.db.User.first({username: username});
      console.log({user});

      // ERROR HERE IF NOT FOUND

      let workoutCount = this.db.Workout.count({
        user_id: user.id
      });
      console.log(workoutCount);

      let page = parseInt(req.query.p) || 1;
      console.log({page});
      page = Math.max(...[1, page]);
      page = Math.min(...[page, Math.ceil(workoutCount / this.PAGE_LIMIT)]);

      console.log({page});

      let workouts = this.db.Workout.where({
        user_id: user.id
      }, this.PAGE_LIMIT, page - 1);
      console.log({workouts});




      /*
       * TODO - not sure if this is the most efficient, although SQLite is supposed
       * to handle multiple small queries pretty well
       *
       * let rideIDs = workouts.reduce((result, workout) => { result[workout.ride_id] = true; return result }, {});
       * let rides = Object.keys(rideIDs).forEach((result, rideID) => {
       *   let ride = this.db.Ride.where({id: rideID});
       *   workout.ride = ride;
       * })
       *
      */

      workouts.forEach(w => {
        let ride = this.db.Ride.get(w.ride_id);
        w.ride = ride;

        let instructor = this.db.Instructor.get(ride.data.instructor_id);
        w.instructor = instructor;
      });


      const pagination = {
        total: workoutCount,
        prev_page: page > 1 ? page - 1 : null,
        next_page: page < (workoutCount / this.PAGE_LIMIT) ? page + 1 : null
      }


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


    this.app.post('/users/search', (req, res) => {
      let username = req.body.username;
      console.log(`Attempting to lookup ${username}`);
      let user = this.db.User.first({
        username: username
      });
      console.log({user});

      // ERROR IF NOT FOUND
      res.redirect(301, `/users/${username}`);
    });


  }


  start(){
    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`rickybobby webserver listening at http://0.0.0.0:${this.port}`);
    });
  }
}


module.exports = Web;
