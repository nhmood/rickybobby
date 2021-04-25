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
        workoutA.*
      FROM
        workouts AS workoutA
      INNER JOIN
        workouts AS workoutB
      ON
        workoutA.ride_id  = workoutB.ride_id AND
        workoutA.user_id != workoutB.user_id
      WHERE
        workoutA.user_id IN(?, ?) AND
        workoutB.user_id IN(?, ?) AND
        workoutA.type = 'cycling';
    `;



    const stmt = this.db.prepare(sql);
    const records = stmt.all(userA.id, userB.id, userA.id, userB.id);

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
