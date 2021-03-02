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

    case 'fetch':
      switch(process.argv[3]){
        case 'user':
          rb.fetchUser(process.argv[4]);
          break;

        case 'ride':
          rb.fetchRide(process.argv[4]);
          break;

        case 'workout':
          rb.fetchWorkout(process.argv[4]);
          break;

        case 'workouts':
          rb.fetchWorkouts(process.argv[4], process.argv[5]);
          break;

        default:
          console.warn("Unrecognized fetch target");
          process.exit(1);
      }
      break;


    case 'get':
      switch(process.argv[3]){
        case 'user':
          rb.getUser(process.argv[4]);
          break;

        case 'ride':
          rb.getRide(process.argv[4]);
          break;

        case 'workout':
          rb.getWorkout(process.argv[4]);
          break;

        case 'workouts':
          rb.getWorkouts(process.argv[4]);
          break;

        default:
          console.warn("Unrecognized get target");
          process.exit(1);
      }
      break;

    case 'common':
      rb.commonWorkouts(process.argv[3], process.argv[4]);
      break;

    default:
      console.log("Unknown argument");
      process.exit(1);
  }
})();
