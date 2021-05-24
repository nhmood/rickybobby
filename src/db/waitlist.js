const Model = require("./model.js");
class Waitlist extends Model {
  static tableName = "waitlists";
}

module.exports = Waitlist;
