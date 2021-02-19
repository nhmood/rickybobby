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
    case 'migrate':
      rb.db.migrate(process.argv[3]);
      break;

    case 'authenticate':
      await rb.authenticate(process.env.RB_PTON_USER, process.env.RB_PTON_PASS);
      break;

    case 'test':
      rb.setup();
      break;

    case 'user':
      rb.getUser(process.argv[3]);
      break;

    case 'fetch':
      rb.fetchUser(process.argv[3]);
      break;

    case 'workouts':
      rb.getWorkouts(process.argv[3]);
      break;

    default:
      console.log("Unknown argument");
      process.exit(1);
  }
})();
