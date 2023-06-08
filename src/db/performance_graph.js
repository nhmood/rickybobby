const Model = require("./model.js");
class PerformanceGraph extends Model {
  static tableName = "performance_graphs";
  static jsonFields = ["data"];


  static import(data){
    let performance_graph = this.upsert({
      workout_id: data.workout_id,
      data:       data.data
    });

    return performance_graph;
  }

}

module.exports = PerformanceGraph;
