const Model = require("./model.js");
class User extends Model {
  static tableName = "users";
  static jsonFields = ["streaks"];


  // Helper to create a proper User record given
  // the data from the raw Peloton User API response
  static import(data){
    let user = this.upsert({
      id:         data.id,
      username:   data.username,

      location:   data.location,
      image_url:  data.image_url,
      streaks:    data.streaks,

      cycling_workout_count:    data.total_pedaling_metric_workouts,
      noncycling_workout_count: data.total_non_pedaling_metric_workouts
    });

    return user;
  }
}

module.exports = User;
