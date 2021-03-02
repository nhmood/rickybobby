const Model = require("./model.js");
class Workout extends Model {
  static tableName = "workouts";
  static jsonFields = ["data", "performance"];


  static commonWorkouts(userA, userB){
    let sql = `
      SELECT DISTINCT
        workoutA.*
      FROM
        workouts as workoutA
      INNER JOIN
        workouts as workoutB
      ON
        workoutA.ride_id  = workoutB.ride_id AND
        workoutA.user_id != workoutB.user_id
      WHERE
        workoutA.user_id IN (?, ?);
    `;
    const stmt = this.db.prepare(sql);
    const records = stmt.all(userA.id, userB.id);

    const models = records.map(r => { return new this(r) });

    console.log({models});
    return models;
  }
}

module.exports = Workout;
