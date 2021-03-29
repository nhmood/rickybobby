const Model = require("./model.js");
class User extends Model {
  static tableName = "users";
  static jsonFields = ["streaks"];


  // Helper to create a proper User record given
  // the data from the raw Peloton User API response
  static import(data){
    let user = this.upsert({
      id:         data.id,
      username:   data.username.toLowerCase(),

      location:   data.location,
      image_url:  data.image_url,
      streaks:    data.streaks,

      cycling_workout_count:    data.total_pedaling_metric_workouts,
      noncycling_workout_count: data.total_non_pedaling_metric_workouts
    });

    return user;
  }

  // Grab all users that have a tracked value of NOT NULL
  // TODO - update Model.where to support "NOT" conditions
  //        probably need to update to support NULL too
  static tracked(){
    let sql = `SELECT * FROM users WHERE tracked NOT NULL`;
    const stmt = this.db.prepare(sql);
    const records = stmt.all();


    const models = records.map(r => { return new this(r) });
    return models;
  }
}

module.exports = User;
