const Model = require("./model.js");
class Workout extends Model {
  static tableName = "workouts";
  static jsonFields = ["data", "performance"];


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
        workoutA.user_id IN (?, ?) AND
        workoutA.fitness_discipline = 'cycling';
    `;



    const stmt = this.db.prepare(sql);
    const records = stmt.all(userA.id, userB.id);

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
