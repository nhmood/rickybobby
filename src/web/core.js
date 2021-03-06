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

    this.app.get('/', (req, res) => {
      res.render('index', {});
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
