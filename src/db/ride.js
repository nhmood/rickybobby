const Model = require("./model.js");
class Ride  extends Model {
  static tableName = "rides";
  static jsonFields = ["data"];
}

module.exports = Ride;
