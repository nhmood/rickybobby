const Model = require("./model.js");
class Instructor extends Model {
  static tableName = "instructors";
  static jsonFields = [];


  // Helper to create a proper Instructor record given
  // the data from the raw Peloton User API response
  static import(data){
    let instructor = this.upsert({
      id:     data.id,
      name:   data.name,
      image_url:  data.image_url
    });

    return instructor;
  }


}

module.exports = Instructor;
