const Model = require("./model.js");
class Workout extends Model {
  static tableName = "workouts";
  static jsonFields = [];



  static import(data){

    let competitive = data.competitive || 0;

    // Form the base payload that applies to all workouts
    let workoutRecord = {
      id: data.id,
      taken_at: data.created_at,
      type: data.fitness_discipline,
      duration: data.performance.duration,
      competitive: competitive,


      ride_id: data.ride.id,
      user_id: data.user_id
    }

    // Some free rides have an ID of all 0s, replace this with null
    // to keep consistency in dataset
    if (workoutRecord.ride_id == "00000000000000000000000000000000"){
      workoutRecord.ride_id = null;
    }


    // If the workout is "cycling", conditionally add the necessary
    // performance metrics before upserting
    if (workoutRecord.type == "cycling" &&
        data.performance &&
        data.performance.summaries.length > 0 &&
        data.performance.metrics.length > 0
      ){

      // Occasionally, some records don't have all the metrics
      // so attempt to read them and default to (0)s otherwise
      let defaultMetric = { max_value: 0, average_value: 0 };

      let output      = data.performance.metrics[0] || defaultMetric;
      let cadence     = data.performance.metrics[1] || defaultMetric;
      let resistance  = data.performance.metrics[2] || defaultMetric;
      let speed       = data.performance.metrics[3] || defaultMetric;

      workoutRecord = Object.assign(workoutRecord, {
        total_output:     data.performance.summaries[0].value,
        max_output:       output.max_value,
        avg_output:       output.average_value,
        max_cadence:      cadence.max_value,
        avg_cadence:      cadence.average_value,
        max_resistance:   resistance.max_value,
        avg_resistance:   resistance.average_value,
        max_speed:        speed.max_value,
        avg_speed:        speed.average_value,
      });
    }


    let workout = this.upsert(workoutRecord)
    return workout;
  }


  // Helper to select the common/unique rides between two users
  static compareWorkoutRides(options){
    // Pull the mode from the options and default to INTERSECT
    let mode = (options.mode || "common").toLowerCase();

    if (mode != "common" && mode != "unique"){
      logger.error(`Invalid commonRide mode provided: ${mode}`);
      return false;
    };


    let rideSQL = (options.rideID) ? "= ?" : "NOT NULL";
    let modeSQL = (mode == "common") ? "INTERSECT" : "EXCEPT";
    let sql = `
      SELECT DISTINCT
        ride_id
      FROM
        workouts
      WHERE
        user_id = ? AND
        type = 'cycling' AND
        competitive = 1 AND
        ride_id ${rideSQL}

      ${modeSQL}

      SELECT DISTINCT
        ride_id
      FROM
        workouts
      WHERE
        user_id = ? AND
        type = 'cycling' AND
        competitive = 1 AND
        ride_id ${rideSQL}
     `

    // Since we are using a union (intersect/except), if we
    // want to count then we will have to wrap statement
    if (options.count){
      sql = `
        SELECT
          COUNT(*) as count
        FROM ( ${sql} )
      `;
    }

    // If pagination options are provided, append the necessary
    // limit/offset
    let limitInt = parseInt(options.limit);
    if (limitInt){
      let pageInt = parseInt(options.page) || 0;
      sql = sql.concat(` LIMIT ${limitInt} OFFSET ${ limitInt * pageInt}`);
    }

    const stmt = this.db.prepare(sql);

    // If we are just counting, no need to format the results
    // into the corresponding model, just return the count
    if (options.count){
      const record = stmt.get(options.userA.id, options.userB.id);
      return record.count;
    }

    let sqlArguments = [];
    if (options.rideID){
      sqlArguments = [options.userA.id, options.rideID, options.userB.id, options.rideID];
    } else {
      sqlArguments = [options.userA.id, options.userB.id];
    }

    const records = stmt.all(...sqlArguments)
    const rideIDs = records.map( r => { return r.ride_id });
    return rideIDs;
  }


  static commonWorkoutSummary(options){
    let userA = options.userA;
    let userB = options.userB;

    if (!userA || !userB){
      logger.error(`Invalid userA/B passed to compareWorkouts: ${userA}/${userB}`);
      return false;
    }

    let rideIDs = this.compareWorkoutRides(options);
    let rideSQL = rideIDs.map(r => `?`).join(",");

    let sql = `
      SELECT
        w.user_id, COUNT(*) as wins
      FROM (
        SELECT DISTINCT
          u.username, workout.ride_id, max(workout.total_output), workout.user_id
        FROM
          workouts as workout
        JOIN
          users u
        ON
          workout.user_id = u.id
        WHERE
          workout.user_id IN (?, ?) AND
          workout.ride_id IN (${rideSQL}) AND
          workout.competitive = 1
          GROUP BY
            workout.ride_id
      ) as w
      GROUP BY
        w.user_id
    `;

    const stmt = this.db.prepare(sql);
    const records = stmt.all(userA.id, userB.id, rideIDs);

    // Format payload as has summary hash with wins, winner (bool), and total
    // TODO - we can probably move away from this legacy format now that we are
    //        using EJS instead of mustache
    let summaryA = records[0];
    let summaryB = records[1];

    // Return empty summary payload if no common workouts are found
    if (!summaryA && !summaryB){
      let payload = {
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

      return payload;
    }

    // If there is no record[1], this means there are no wins for one of the
    // two users, we need to figure out which one and populate their record
    if (!summaryB){
      summaryB = {wins: 0, user_id: summaryA.user_id == userA.id ? userB.id : userA.id};
    }

    let payload = {
      wins: {
        [summaryA.user_id]: summaryA.wins,
        [summaryB.user_id]: summaryB.wins
      },
      winner: {
        [summaryA.user_id]: summaryA.wins > summaryB.wins,
        [summaryB.user_id]: summaryA.wins < summaryB.wins
      },
      rideCount: rideIDs.length
    }

    return payload;
  }

  static compareWorkouts(options){
    let userA = options.userA;
    let userB = options.userB;

    if (!userA || !userB){
      logger.error(`Invalid userA/B passed to compareWorkouts: ${userA}/${userB}`);
      return false;
    }

    // If the count option is passed, return the count, otherwise
    // grab all the fields of the queried workout
    let selectSQL = options.count ? "COUNT(*)" : "workout.*";

    let rideIDs = this.compareWorkoutRides(options);
    let rideSQL = rideIDs.map(r => `?`).join(",");

    let sql = `
      SELECT
        ${selectSQL}
      FROM
        workouts as workout
      WHERE
        workout.user_id IN(?, ?) AND
        ride_id IN (${rideSQL})
      ORDER BY
        workout.taken_at DESC
    `;


    const stmt = this.db.prepare(sql);
    const records = stmt.all(userA.id, userB.id, rideIDs);

    const models = records.map(r => { return new this(r) });
    return models;
  }


  static commonWorkouts(options){
    let models = this.compareWorkouts({
      mode: "common",
      userA: options.userA,
      userB: options.userB,
      limit: options.limit,
      page:  options.page,
      rideID: options.rideID
    });

    return models;
  }

  static uniqueWorkouts(options){
    let models = this.compareWorkouts({
      mode: "unique",
      userA: options.takenBy,
      userB: options.notTakenBy,
      limit: options.limit,
      page:  options.page
    });

    return models;
  }


  // Get recent workouts
  // TODO - put proper order by syntax into Model.where
  static recent(limit){
    let sql = `SELECT * FROM workouts ORDER BY taken_at desc`;

    // If the limit parameter is present and a valid integer, append to the SQL statement
    let limitInt = parseInt(limit);
    if (limitInt){
      sql = sql.concat(` LIMIT ${limitInt}`);
    }

    const stmt = this.db.prepare(sql);
    const records = stmt.all();

    const models = records.map(r => { return new this(r) });
    logger.debug({models});
    return models;
  }



  static recentlyWorkedOut(limit){
    let sql = `
      SELECT
        *, max(taken_at) as latest
      FROM
        workouts
      GROUP BY
        user_id
      ORDER BY
        taken_at DESC
    `;


    // If the limit parameter is present and a valid integer, append to the SQL statement
    let limitInt = parseInt(limit);
    if (limitInt){
      sql = sql.concat(` LIMIT ${limitInt}`);
    }

    const stmt = this.db.prepare(sql);
    const records = stmt.all();

    const models = records.map(r => { return new this(r) });
    logger.debug({models});
    return models;
  }


}

module.exports = Workout;
