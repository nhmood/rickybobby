const Model = require("./model.js");
class Ride  extends Model {
  static tableName = "rides";
  static jsonFields = [];


  // Helper to create a proper User record given
  // the data from the raw Peloton User API response
  static import(data){
    let ride = this.upsert({
      id: data.id,

      type:         data.fitness_discipline,
      description:  data.description,

      difficulty_level:         data.difficulty_level,
      difficulty_rating_avg:    data.difficulty_rating_avg,
      difficulty_rating_count:  data.difficulty_rating_count,

      overall_rating_avg:   data.overall_rating_avg,
      overall_rating_count: data.overall_rating_count,

      instructor_id: data.instructor_id
    });

    return ride;
  }
}

module.exports = Ride;
