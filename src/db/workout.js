const Model = require("./model.js");
class Workout extends Model {
  static tableName = "workouts";
  static jsonFields = [];



  static import(data){
    // Form the base payload that applies to all workouts
    let workoutRecord = {
      id: data.id,
      taken_at: data.created_at,
      type: data.fitness_discipline,
      duration: data.performance.duration,


      ride_id: data.ride.id,
      user_id: data.user_id
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

    let modeSQL = (mode == "common") ? "INTERSECT" : "EXCEPT";
    let sql = `
      SELECT DISTINCT
        ride_id
      FROM
        workouts
      WHERE
        user_id = ? AND
        type = 'cycling'

      ${modeSQL}

      SELECT DISTINCT
        ride_id
      FROM
        workouts
      WHERE
        user_id = ? AND
        type = 'cycling'
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

    const records = stmt.all(options.userA.id, options.userB.id);
    const rideIDs = records.map( r => { return r.ride_id });
    return rideIDs;
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
      SELECT DISTINCT
        ${selectSQL}
      FROM
        workouts as workout
      JOIN
        users AS u
      ON
        workout.user_id = u.id
      WHERE
        workout.user_id IN(?, ?) AND
        ride_id IN (${rideSQL})
      ORDER BY
        workout.ride_id DESC
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
      page:  options.page
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
}

module.exports = Workout;
