const Model = require("./model.js");
class User extends Model {
  static tableName = "users";
}

module.exports = User;
