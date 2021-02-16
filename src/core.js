console.log("rickybobby core");

const db = require("./db/core.js");
const peloton = require("./peloton/core.js");


class RickyBobby {
  db;
  peloton;
  constructor(config){
    console.log(config);

    this.db       = new db(config.database);
    this.peloton  = new peloton(config.peloton_api);
  }
}

module.exports = RickyBobby;
