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

  uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
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




  getResource(resource, id){
    let model = this.db.resource(resource);
    if (!model){ return false; };

    // Attempt to lookup the associated record by ID
    let record = model.get(id);
    if (record == undefined){
      console.warn(`${resource}:${id} not found`);
      return false;
    }

    return record;
  }

  storeResource(resource, data){
    let model = this.db.resource(resource);
    if (!model){ return false; };

    let datalog = this.db.Datalog.import(resource, data);
    let record = model.import(datalog.data)

    return {
      datalog: datalog,
      record: record
    }
  }


  getUsername(username){
    let user = this.db.User.first({username: username});
    if (user == undefined){
      console.warn(`No user found for ${username}`);
      process.exit(1);
    }

    return user;
  }


  rebuild(resource){
    let model = this.db.resource(resource);
    if (!model){ return false; };

    // Get all the associated api_data records for the target
    // then walk through and reimport the records to the model
    let datalogs = this.db.Datalog.where({
      conditions: {
        target: resource
      }
    });
    datalogs.forEach(datalog => {
      console.log(`Rebuilding ${resource} from Datalog:${datalog.id}`);
      model.import(datalog.data);
    });
  }



  async fetchUser(identifier){
    this.setup();

    // Fetch the data from the Peloton API then pass to the
    // storeResource helper to store the raw API data + model
    // NOTE - identifier can be username OR user_id
    const userData = await this.peloton.getUser(identifier);
    let storage = this.storeResource('user', userData.user);

    // Update the tracked parameter of the returned User record
    // to signal this is an explicit fetch and not a follower import
    storage.record.update({tracked: 1});

    return storage.record;
  }


  async fetchFollowing(identifier){
    this.setup();

    let user = this.getUsername(identifier) || this.getUser(identifier);

    // Fetch the data from the Peloton API then pass to the
    // storeResource helper to store the raw API data + model
    // NOTE - identifier can be username OR user_id
    const followingData = await this.peloton.getFollowing(user.id);
    console.log(followingData.following);
    followingData.following.data.forEach(follow => {

      // Create a "Following" object that contains the parent user
      // along with the following user to be stored (for rebuild)
      let pair = {
        id:           `${user.id}_${follow.id}`,
        user_id:      user.id,
        following_id: follow.id
      };
      let following = this.storeResource('following', pair);
      console.log({following});


      // Next, store the raw User record
      let storage = this.storeResource('user', follow);
      console.log({storage});
    });


    // Just return the count of followers stored
    return followingData.following.length;
  }


  async fetchRide(rideID){
    this.setup();

    // Fetch the data from the Peloton API then pass to the
    // storeResource helper to store the raw API data + model
    const rideData = await this.peloton.getRide(rideID);
    let storage = this.storeResource('ride', rideData.ride);

    return storage.record;
  }


  async fetchInstructor(instructorID){
    this.setup();

    // Fetch the data from the Peloton API then pass to the
    // storeResource helper to store the raw API data + model
    const instructorData = await this.peloton.getInstructor(instructorID);
    let storage = this.storeResource('instructor', instructorData.instructor);

    return storage.record;
  };


  async getWorkouts(username){
    let user = await this.getUser(username);
    console.log({user});

    let workouts = this.db.Workout.where({
      conditions: {
        user_id: user.id
      }
    });
    if (workouts == undefined){
      console.warn(`No workouts found for ${username}`);
      process.exit(1);
    }

    console.log({workouts});
    return workouts;
  }


  async fetchWorkout(workoutID){
    this.setup();

    // Fetch the workout and performance graph data from the Peloton API
    const workoutData = await this.peloton.getWorkout(workoutID);
    const performanceData = await this.peloton.getPerformanceGraph(workoutID);

    // Combine the workoutData and performanceData
    const data = workoutData.workout;
    data.performance = performanceData.performance;

    // Pass the data to the storeResource helper to store the raw API data + model
    let storage = this.storeResource('workout', data);

    return storage.record;
  }


  // TODO - determine whether we want to fetch by username or user id
  async fetchWorkouts(username, forceFetch = false){
    this.setup();

    // Validate that the user we want to fetch exists
    let user = this.getUsername(username);
    if (!user){
      console.log(`User:${username} not found`);
      return false;
    }

    // Walk through the workoutCursor until we run out of data to process
    console.log(`Initializing workoutCursor for ${user.id}/${user.username}`);
    let workoutCursor = this.peloton.workoutCursor(user.id);
    while(true){
      workoutCursor = await workoutCursor.next();
      console.log({workoutCursor});

      // Walk through the workout set returned from the API
      // This data is returned by newest first (reverse chronological)
      // While walking through the data, if the matching record already
      // exists in the database, then we can safely stop processing data
      console.log(`Processing ${workoutCursor.workouts.length} workouts for cursor for ${user.id}/${user.username}`);
      for (let i = 0; i < workoutCursor.workouts.length; i++){
        this.sleep(1000);
        let workout = workoutCursor.workouts[i];
        console.log(`Processing workout:${workout.id} from API for ${user.id}/${user.username}`);
        console.debug({workout});

        // The workout data is joined with the associated ride information (into .peloton.ride)
        // Pull out the ride to be stored separately, and reinsert the ride object into the workout
        // NOTE - the ride data comes from a join and MAY be empty (free ride, etc)
        //        check for the join data otherwise use an empty {} as the ride
        let joinData = workout.peloton;
        let ride = joinData ? joinData.ride : {};
        workout.ride = ride;
        console.debug({workout});
        console.debug({ride});


        // If we have a valid ride from the join data, use it accordingly to fetch
        // an actual Ride and Instructor record
        if (ride.id){
          // Attempt to lookup the Ride (by ID) and store it if we don't
          let rideRecord = this.db.Ride.get(ride.id);
          if (rideRecord == undefined){
            rideRecord = this.storeResource('ride', ride);
            console.debug({rideRecord});
          }


          // Attempt to lookup the Instructor (by ID) and fetch it if we don't
          // The fetch function will call out to the API and store the data accordingly
          let instructorRecord = this.db.Instructor.get(ride.instructor_id);
          if (instructorRecord == undefined){
            instructorRecord = await this.fetchInstructor(ride.instructor_id)
            console.debug({instructorRecord});
          }
        }


        // If we find a workout that already exists for this user, we can
        // stop processing since results are returned chronologically
        let workoutRecord = this.db.Workout.get(workout.id);
        if (workoutRecord != undefined){
          console.log(`${this.db.Workout.tableName}:${workout.id} already exists, workouts up to date for ${user.id}/${user.username}`);
          // TODO - not sure how I feel about storing the earlyExit flag in workoutCursor
          //        break from here seems to apply to the for loop and not the parent while
          workoutCursor.earlyExit = true;
          break;
        }

        console.log(`${this.db.Workout.tableName}:${workout.id} not found, creating`);

        // Fetch the performance graph data and merge it into the workout data
        const performanceData = await this.peloton.getPerformanceGraph(workout.id);
        workout.performance = performanceData.performance;

        console.log({workout});

        workoutRecord = this.storeResource('workout', workout);
        console.log({workoutRecord});
      }

      // Break if there is no more new data available to process
      if (!workoutCursor.moreAvailable || (!forceFetch && workoutCursor.earlyExit)){
        console.log(`No more data for ${user.id}:${user.username}`);
        break;
      }
      await this.sleep(2000);
    }
  }


  async sync(){
    // Walk through all the tracked users and sync their state
    let users = this.db.User.tracked();
    console.log(`Syncing ${users.length} users`);
    for (let i = 0; i < users.length; i++){
      let user = users[i];

      console.log(`${user.username}: Sync User`);
      let syncStart = new Date();

      // Fetch the latest user info
      console.log(`${user.username}: Fetching User Info`);
      await this.fetchUser(user.id);
      await this.sleep(1000);

      // Fetch the latest user following
      console.log(`${user.username}: Fetching User Following`);
      await this.fetchFollowing(user.username);
      await this.sleep(1000);

      // Fetch the latest workouts
      console.log(`${user.username}: Fetching Workouts`);
      await this.fetchWorkouts(user.username);
      await this.sleep(1000);

      user.update({tracked: (new Date()).getTime() });


      let syncEnd = new Date();
      console.log(`Sync User: ${user.username} / total: ${ (syncEnd - syncStart) / 1000}s`);
    };
  }

  // Handler for common workout finder
  // Grabs common workouts (rides) between two users
  // then formats the payloads to include necessary components
  // NOTE - formatted payload is VERY GET /shakeandbake centric
  //        this is mainly because mustache js templating is super rigid
  //        if we move to handlebars or something maybe we can just push the
  //        data and let the view handle pulling data components from various components
  commonWorkouts(usernameA, usernameB){
    let userA = this.getUsername(usernameA);
    let userB = this.getUsername(usernameB);

    // Get all the common workouts between the two users using the workout model
    // helper method (performs specific SQL for joins)
    // TODO - db.Workout.commonWorkouts should ideally be updated to provide a limited
    //        list back and support pagination
    let workouts = this.db.Workout.commonWorkouts(userA, userB);


    // Create a summary container for total wins/rides
    let summary = {
      wins: {
        [userA.id]: 0,
        [userB.id]: 0
      },
      winner: {
        [userA.id]: false,
        [userB.id]: false
      },
      rideCount: 0
    };


    // Grab the unique set of Ride IDs for the set of workouts
    // and begin to build the container structure for the comparison
    // TODO - update DB.where to support array -> IN (?,..)
    let rideIDs = [...new Set( workouts.map(w => w.ride_id) )];
    let comparison = rideIDs.reduce((reducer, ride_id) => {
      // Grab the ride by id from the database, then the associated
      // instructor for the ride (by id) and create the base container
      // for all the related workout comparison data
      let ride = this.db.Ride.get(ride_id);
      let instructor = this.db.Instructor.get(ride.instructor_id);

      // Format the payload for the specified ride as described above
      reducer[ride_id] = {
        ride: ride,
        instructor: instructor,
        last_taken_at: 0,
        users: {
          [userA.id]: {
            id: userA.id,
            winner: false,
            workouts: []
          },
          [userB.id]: {
            id: userB.id,
            winner: false,
            workouts: []
          }
        }
      }


      return reducer
    }, {});


    // Walk through the workouts and populate them into
    // the associated ride->user->workouts array and set
    // the last_taken_at field for the ride (so we can sort later)
    workouts.forEach(w => {
      let ride = comparison[ w.ride_id ];
      ride.users[w.user_id].workouts.push(w);
      ride.last_taken_at = Math.max(ride.last_taken_at, w.taken_at)
    });


    // For all the rides, walk through the individual users
    // workouts (in case there are multiple) and sort by
    // best output for the final userA <=> userB comparison
    Object.values(comparison).forEach(ride => {
      // TODO - if we only have one workout entry we may just
      //        want to skip the sorting, not sure of perf hit
      Object.values(ride.users).forEach(user => {
        // Create a 2D array where each element is a pair of
        // [total output, workout] so we can call Array.sort
        // which (I think) sorts by the first entry
        let outputList = user.workouts.map(workout => [workout.total_output, workout]);

        // Sort the output then filter the sorted list to just pull out the
        // actual workout (2nd entry) (in order)
        // NOTE - the sort syntax is because default Array.sort behavior is to
        //        convert the elements to strings and compare the utf-16 code units (??!?!!?)
        user.workouts = outputList.sort((a, b) => a[0] - b[0]).map(output => output[1]).reverse();
      })
    });



    // Now that we have our built out comparison structure, the final step is to
    // just compare the best (index 0) workout for each ride between userA and userB
    // to determine who has the better output and set the winner
    // TODO - determine how we want to handle ties
    Object.values(comparison).forEach(ride => {
      let bestUserA = ride.users[userA.id].workouts[0];
      let bestUserB = ride.users[userB.id].workouts[0];

      // Compare the best output from userA and userB and set the winner user ID
      // then key into the ride->users->userID to set the winner flat to true
      let winnerUserID = bestUserA.total_output > bestUserB.total_output ? userA.id : userB.id;
      ride.users[winnerUserID].winner = true;

      // Increment the summary for the winning user
      summary.wins[winnerUserID] += 1;
    })

    // The final step is converting the comparison list into an array
    // that is sorted by the last_taken_at for each ride
    let rideTaken = Object.values(comparison).map(ride => [ride.last_taken_at, ride]);
    let rideSorted = rideTaken.sort((a, b) => a[0] - b[0]).reverse();
    let rideList = rideSorted.map(ride => ride[1]);

    // Set the total ride count in the summary and the winner
    summary.rideCount = rideIDs.length;
    let winnerUserID = summary.wins[userA.id] > summary.wins[userB.id] ? userA.id : userB.id;
    summary.winner[winnerUserID] = true;


    console.log(summary)

    return {
      summary: summary,
      rides: rideList
    }
  }
}

module.exports = RickyBobby;
