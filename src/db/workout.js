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
      workoutRecord = Object.assign(workoutRecord, {
        total_output:     data.performance.summaries[0].value,
        max_output:       data.performance.metrics[0].max_value,
        avg_output:       data.performance.metrics[0].average_value,
        max_cadence:      data.performance.metrics[1].max_value,
        avg_cadence:      data.performance.metrics[1].average_value,
        max_resistance:   data.performance.metrics[2].max_value,
        avg_resistance:   data.performance.metrics[2].average_value,
        max_speed:        data.performance.metrics[3].max_value,
        avg_speed:        data.performance.metrics[3].average_value,
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

    console.log({models});
    return models;
  }


  // Get recent workouts
  // TODO - put proper order by syntax into Model.where
  static recent(limit){
    let sql = `SELECT * FROM workouts ORDER BY created_at asc`;

    // If the limit parameter is present and a valid integer, append to the SQL statement
    let limitInt = parseInt(limit);
    if (limitInt){
      sql = sql.concat(` LIMIT ${limitInt}`);
    }

    const stmt = this.db.prepare(sql);
    const records = stmt.all();

    const models = records.map(r => { return new this(r) });
    console.log({models});
    return models;
  }
}

module.exports = Workout;
