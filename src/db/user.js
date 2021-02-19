const Model = require("./model.js");
class User extends Model {
  static tableName = "users";
  static jsonFields = ["data"];
}

module.exports = User;
