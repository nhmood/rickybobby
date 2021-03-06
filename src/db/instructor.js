const Model = require("./model.js");
class Instructor extends Model {
  static tableName = "instructors";
  static jsonFields = ["data"];
}

module.exports = Instructor;
