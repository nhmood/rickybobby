const Model = require("./model.js");
class APIData extends Model {
  static tableName = "api_data";
  static jsonFields = ["data"];


  static import(target, data){
    let apiData = this.upsert({
      id:         `${target}_${data.id}`,
      data:       data,
      target:     target,
      target_id:  data.id
    });

    return apiData;
  }
}

module.exports = APIData;
