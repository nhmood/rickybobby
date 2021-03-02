console.log("rickybobby core");

const db = require("./db/core.js");
const peloton = require("./peloton/core.js");


class RickyBobby {
  db;
  peloton;
  constructor(config){
    console.log(config);

    this.db       = new db(config.database);
    this.peloton  = new peloton(config.peloton_api);
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async authenticate(username, password){
    console.log(`Authenticating Peloton API with ${username}`);

    const loginData = await this.peloton.login(username, password);
    console.log({loginData});

    // TODO - add better error handling
    if (loginData == undefined){
      console.error(`Failed to login ${username}, existing`);
      process.exit(1);
    }

    // Handle the session portion of the response
    this.db.Session.upsert({
      username: username,
      data: loginData.session
    })
  }


  setup(){
    // Attempt to lookup a session for the currently configured
    // peloton user and if not issue
    console.log(`Looking up session for ${this.peloton.username}`);
    let session = this.db.Session.get( this.peloton.username );
    if (session == undefined){
      console.warn(`No session found for ${this.peloton.username} - run authenticate with password in env`);
      process.exit(1);
    }

    console.log({session});
    this.peloton.sessionID = session.data.session_id;
    console.log(this.peloton);
  }


  async getUser(username){
    let user = this.db.User.first({
      username: username
    });
    if (user == undefined){
      console.warn(`No user found for ${username}`);
      process.exit(1);
    }

    console.log({user});
    return user;
  }


  async fetchUser(username){
    this.setup();

    const userData = await this.peloton.getUser(username);
    console.log({userData});

    let user = this.db.User.upsert({
      id:       userData.user.id,
      username: userData.user.username,
      data:     userData.user
    });

    return user;
  }


  async getRide(rideID){
    let ride = this.db.Ride.get(rideID);
    if (ride == undefined){
      console.warn(`No ride found for ${rideID}`);
      process.exit(1);
    }

    console.log({ride});
    return ride;
  }


  async fetchRide(rideID){
    this.setup();

    const rideData = await this.peloton.getRide(rideID);
    console.log({rideData});

    let ride = this.db.Ride.upsert({
      id:   rideData.ride.id,
      data: rideData.ride
    });
    console.log({ride});
    return ride;
  }


  async getWorkout(workoutID){
    let workout = this.db.Workout.get(workoutID);
    if (workout == undefined){
      console.warn(`No workout found for ${workoutID}`);
      process.exit(1);
    }

    console.log({workout});
    return workout;
  }


  async getWorkouts(username){
    let user = await this.getUser(username);
    console.log({user});

    let workouts = this.db.Workout.where({user_id: user.id});
    if (workouts == undefined){
      console.warn(`No workouts found for ${username}`);
      process.exit(1);
    }

    console.log({workouts});
    return workouts;
  }


  async fetchWorkout(workoutID){
    this.setup();

    const workoutData = await this.peloton.getWorkout(workoutID);
    console.log({workoutData});

    let workout = this.db.Workout.upsert({
      id:   workoutData.workout.id,
      data: workoutData.workout
    });
    console.log({workout});

    const performanceGraphData = await this.peloton.getPerformanceGraph(workoutID);
    console.log({performanceGraphData});
    const performance = performanceGraphData.performance;

    workout.update({performance: performance});
    return workout;
  }


  async fetchWorkouts(username, forceFetch = false){
    this.setup();

    let user = await this.getUser(username);
    console.log({user});

    console.log("Initializing workoutCursor");
    let workoutCursor = this.peloton.workoutCursor(user.id);
    while(true){
      workoutCursor = await workoutCursor.next();
      console.log({workoutCursor});

      // Walk through the workout set returned from the API
      // This data is returned by newest first (reverse chronological)
      // While walking through the data, if the matching record already
      // exists in the database, then we can safely stop processing data
      console.log("Processing workouts for cursor");
      for (let i = 0; i < workoutCursor.workouts.length; i++){
        let workout = workoutCursor.workouts[i];
        console.log(`Processing workout:${workout.id} from API`);
        console.log({workout});


        // The workout data is joined with the associated ride information
        // Pull out the ride to be stored separately, and reinsert the ride_id
        // into the workout object

        let ride = workout.peloton.ride;
        delete workout.peloton;
        workout.ride_id = ride.id;
        console.debug({workout});
        console.debug({ride});

        // TODO - figure out whether we want to upsert, first/create, or first OR create
        console.log(`Upserting Ride:${ride.id}`);
        let rideRecord = this.db.Ride.upsert({
          id: ride.id,
          data: ride
        })
        console.log({rideRecord});

        // If we find a workout that already exists for this user, we can
        // stop processing since results are returned chronologically
        let workoutRecord = this.db.Workout.get(workout.id);
        if (workoutRecord != undefined){
          console.log(`${this.db.Workout.tableName}:${workout.id} already exists, workouts up to date`);
          // TODO - not sure how I feel about storing the earlyExit flag in workoutCursor
          //        break from here seems to apply to the for loop and not the parent while
          workoutCursor.earlyExit = true;
          break;
        }

        console.log(`${this.db.Workout.tableName}:${workout.id} not found, creating`);
        workoutRecord = this.db.Workout.create({
          id: workout.id,
          data: workout,

          user_id: user.id,
          ride_id: ride.id
        });
        console.log({workoutRecord});

        // Grab the associated performance graph data which has the comparison
        // metrics we need
        let performanceGraphData = await this.peloton.getPerformanceGraph(workout.id);
        console.log({performanceGraphData});
        let performance = performanceGraphData.performance;

        workoutRecord.update({performance: performance});
      }

      // Break if there is no more new data available to process
      if (!workoutCursor.moreAvailable || (!forceFetch && workoutCursor.earlyExit)){
        console.log(`No more data for ${user.id}:${user.username}`);
        break;
      }
      await this.sleep(2000);
    }
  }


  // Fetch the performance information associated with a specified workout
  async fetchPerformanceGraph(workoutID){
    this.setup();

    // First attempt to lookup a the db backed workout by ID
    // If the record is not found, perform the fetch then return immediately as
    // the workout fetch will automatically pull the performanceGraph information
    let workout = this.db.Workout.get(workoutID);
    if (workoutRecord == undefined){
      console.log(`${this.db.Workout.tableName}:${workoutID} not found, fetching`);
      return this.fetchWorkout(workoutID);
    }

    const performanceGraphData = await this.peloton.getPerformanceGraph(workoutID);
    console.log({performanceGraphData});
    const performance = performanceGraphData.performance;

    workout.update({performance: performance});
    return workout;
  }
}

module.exports = RickyBobby;
