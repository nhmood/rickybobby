const Model = require("./model.js");
class Session extends Model {
  static tableName = "sessions";
  static jsonFields = ["data"];
}

module.exports = Session;
