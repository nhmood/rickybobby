const Model = require("./model.js");
class Workout extends Model {
  static tableName = "workouts";
  static jsonFields = ["data"];
}

module.exports = Workout;
