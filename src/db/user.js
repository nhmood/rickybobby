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

      private:    data.is_profile_private ? 1 : 0,

      cycling_workout_count:    data.total_pedaling_metric_workouts,
      noncycling_workout_count: data.total_non_pedaling_metric_workouts
    });

    return user;
  }

  // Grab all users that have a tracked value of NOT NULL
  // TODO - update Model.where to support "NOT" conditions
  //        probably need to update to support NULL too
  static tracked(){
    let sql = `SELECT * FROM users WHERE tracked NOT NULL AND private != 1`;
    const stmt = this.db.prepare(sql);
    const records = stmt.all();


    const models = records.map(r => { return new this(r) });
    return models;
  }

  static search(substr){
    let sql = `
      SELECT
        id, username, image_url
      FROM
        users
      WHERE
        username LIKE ?;
    `;

    const stmt = this.db.prepare(sql);
    const records = stmt.all(`${substr}%`);

    const models = records.map(r => { return new this(r) });
    return models
  }
}

module.exports = User;
