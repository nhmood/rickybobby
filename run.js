#!/usr/bin/env node

const RickyBobby = require("./src/core.js");


// TODO - replace with YAML/TOML
const rb = new RickyBobby({
  database: {
    path: process.env.RB_DB,
  },
  peloton_api: {
    username:  process.env.RB_PTON_USER,
  }
})
console.log(rb);



(async () => {
  switch(process.argv[2]){
    default:
      console.log("Unknown argument");
      process.exit(1);
  }
})();
