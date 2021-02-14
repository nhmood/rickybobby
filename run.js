#!/usr/bin/env node

const pelobattle = require("./src/core.js");


// TODO - replace with YAML/TOML
const pb = new pelobattle({
  database: {
    path: process.env.PB_DB,
  },
  peloton_api: {
    username:  process.env.PB_PTON_USER,
  }
})
console.log(pb);



(async () => {
  switch(process.argv[2]){
    default:
      console.log("Unknown argument");
      process.exit(1);
  }
})();
