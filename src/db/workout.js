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


  static commonWorkouts(userA, userB){
    let sql = `
      SELECT DISTINCT
        workout.*
      FROM
        workouts as workout
      JOIN
        users AS u
      ON
        workout.user_id = u.id
      WHERE
        workout.user_id IN(?, ?) AND
        ride_id IN (
          SELECT DISTINCT
            ride_id
          FROM
            workouts
          WHERE
            user_id = ? AND
            type = 'cycling'

          INTERSECT

          SELECT DISTINCT
            ride_id
          FROM
            workouts
          WHERE
            user_id = ? AND
            type = 'cycling'
        )
      ORDER BY
        workout.ride_id;
    `;


    const stmt = this.db.prepare(sql);
    const records = stmt.all(userA.id, userB.id, userA.id, userB.id);

    const models = records.map(r => { return new this(r) });
    return models;
  }


  static uniqueWorkouts(opts){
    const takenBy = opts.takenBy;
    const notTakenBy = opts.notTakenBy;

    // TODO - figure out proper return or exception raising
    if (!takenBy || !notTakenBy){
      console.warn(`Invalid parameters provided for uniqueWorkouts -> ${opts}`);
      return false;
    }

    let sql = `
      SELECT DISTINCT
        workout.*
      FROM
        workouts as workout
      JOIN
        users AS u
      ON
        workout.user_id = u.id
      WHERE
        workout.user_id IN(?, ?) AND
        ride_id IN (
          SELECT DISTINCT
            ride_id
          FROM
            workouts
          WHERE
            user_id = ? AND
            type = 'cycling'

          EXCEPT

          SELECT DISTINCT
            ride_id
          FROM
            workouts
          WHERE
            user_id = ? AND
            type = 'cycling'
        )
      ORDER BY
        workout.taken_at DESC
    `;

    const stmt = this.db.prepare(sql);
    const records = stmt.all(takenBy.id, notTakenBy.id, takenBy.id, notTakenBy.id);

    const models = records.map(r => { return new this(r) });
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
