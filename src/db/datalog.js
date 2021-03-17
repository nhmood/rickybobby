const Model = require("./model.js");
class Datalog extends Model {
  static tableName = "datalogs";
  static jsonFields = ["data"];


  static import(target, data){
    let datalog = this.upsert({
      id:         `${target}_${data.id}`,
      data:       data,
      target:     target,
      target_id:  data.id
    });

    return datalog;
  }
}

module.exports = Datalog;
