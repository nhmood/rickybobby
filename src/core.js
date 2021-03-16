console.log("rickybobby core");

const db = require("./db/core.js");
const peloton = require("./peloton/core.js");
const web = require("./web/core.js");


class RickyBobby {
  db;
  peloton;
  constructor(config){
    console.log(config);

    this.db       = new db(config.database);
    this.peloton  = new peloton(config.peloton_api);
    this.web      = new web(config.web, this.db, this);
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


  // TODO - remove async and references, only required for network fetch
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


  // TODO - remove async and references, only required for network fetch
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


  // TODO - remove async and references, only required for network fetch
  async getInstructor(instructorID){
    let instructor = this.db.Instructor.get(instructorID);
    if (instructor == undefined){
      console.warn(`No instructor found for ${instructorID}`);
      process.exit(1);
    }

    console.log({instructor});
    return instructor;
  }


  async fetchInstructor(instructorID){
    this.setup();

    const instructorData = await this.peloton.getInstructor(instructorID);
    console.log({instructorData});

    let instructor = this.db.Instructor.upsert({
      id:   instructorData.instructor.id,
      data: instructorData.instructor
    });
    console.log({instructor});
    return instructor;
  }



  // TODO - remove async and references, only required for network fetch
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
      data: workoutData.workout,
      fitness_discipline: workoutData.workout.fitness_discipline,
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
      this.sleep(500);
      workoutCursor = await workoutCursor.next();
      console.log({workoutCursor});

      // Walk through the workout set returned from the API
      // This data is returned by newest first (reverse chronological)
      // While walking through the data, if the matching record already
      // exists in the database, then we can safely stop processing data
      console.log("Processing workouts for cursor");
      for (let i = 0; i < workoutCursor.workouts.length; i++){
        this.sleep(500);
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

        let instructorRecord = this.db.Instructor.get(ride.instructor_id);
        if (instructorRecord == undefined){
          console.log(`${this.db.Instructor.tableName}:${ride.instructor_id} not found, fetching`);
          let instructorData = await this.peloton.getInstructor(ride.instructor_id);
          console.log({instructorData});

          // Insert record into database
          instructorRecord = this.db.Instructor.create({
            id:   instructorData.instructor.id,
            data: instructorData.instructor
          })
          console.log({instructorRecord});
        }


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
          fitness_discipline: workout.fitness_discipline,

          user_id: user.id,
          ride_id: ride.id
        });
        console.log({workoutRecord});

        // Grab the associated performance graph data which has the comparison
        // metrics we need
        let performanceGraphData = await this.peloton.getPerformanceGraph(workout.id);
        console.log({performanceGraphData});
        let performance = performanceGraphData.performance;
        console.log({workoutRecord});

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


  // Handler for common workout finder
  // Grabs common workouts (rides) between two users
  // then formats the payloads to include necessary components
  // NOTE - formatted payload is VERY GET /shakeandbake centric
  //        this is mainly because mustache js templating is super rigid
  //        if we move to handlebars or something maybe we can just push the
  //        data and let the view handle pulling data components from various components
  async commonWorkouts(usernameA, usernameB){
    let userA = await this.getUser(usernameA);
    let userB = await this.getUser(usernameB);

    // Get all the common workouts between the two users using the workout model
    // helper method (performs specific SQL for joins)
    let commonWorkouts = this.db.Workout.commonWorkouts(userA, userB);


    /*
     *  Format the payload as an object where the keys are ride_id,
     *  the value is another object that has ride info, latest taken workout,
     *  and a list of the associated workouts
     *  {
     *    "ride_id": {
     *      "ride_info": {},
     *      "last_taken_workout": DateTime,
     *      "workouts": []
     *    }...
     *  }
     */

    // Create a cache of rides between the common workouts
    // TODO - can move this over to map/reduce once we get rid of
    //        async resource calls, little messy otherwise
    let rides = {};
    for (let i = 0; i < commonWorkouts.length; i++){
      // Grab the workout we are processing and the rideID
      let workout = commonWorkouts[i];
      let rideID = workout.ride_id;

      // If the Ride record hasn't been pulled yet, pull it
      // from the database
      if (rides[rideID] == undefined){
        let ride = await this.db.Ride.get(rideID)
        rides[rideID] = {
          ride: ride,
          last_taken_workout: 0,
          workouts: []
        }

        // Pull the associated instructor for this ride as well
        let instructor = await this.db.Instructor.get(ride.data.instructor_id);
        ride.instructor = instructor;
      }


      // Push the workout into the array of workouts for this ride
      // and update the last_taken_workout parameter for the ride
      // if applicable (used for sorting later)
      rides[rideID].workouts.push(workout);
      if (rides[rideID].last_taken_workout < workout.created_at){
        rides[rideID].last_taken_workout = workout.created_at;
      }
    }


    // Walk through the rides/workouts and tally the wins
    // for each user
    let wins = {};
    wins[userA.id] = 0
    wins[userB.id] = 0


    // Rides is a object thatt acts like a set (to dedup rides)
    // so walk through the keys to proccess each ride
    // TODO - this doesn't take into account a user taking the same
    //        ride multiple times
    for (let i = 0; i < Object.keys(rides).length; i++){
      // Grab the ride object we are processing
      // and pull out the workouts
      let rideID = Object.keys(rides)[i];
      let workouts = rides[ rideID ].workouts;


      let outputA = workouts[0].performance.average_summaries[0].value;
      let outputB = workouts[1].performance.average_summaries[0].value;

      workouts[0].avg_output = outputA;
      workouts[1].avg_output = outputB;

      // Based on the output pick the winner (index)
      let winner =  outputA > outputB ? 0 : 1;

      wins[ workouts[winner].user_id ] += 1;
      workouts[winner].winner = true;
      rides[rideID].winner = workouts[winner].user_id
    }

    rides.wins = wins;
    return rides;
  }
}

module.exports = RickyBobby;
