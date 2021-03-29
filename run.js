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

        case 'following':
          rb.fetchFollowing(process.argv[4]);
          break;

        case 'ride':
          rb.fetchRide(process.argv[4]);
          break;

        case 'instructor':
          rb.fetchInstructor(process.argv[4]);
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

    case 'rebuild':
      rb.rebuild(process.argv[3]);
      break;

    case 'get':
      switch(process.argv[3]){
        case 'username':
          let user = rb.getUsername(process.argv[4]);
          if (!user){ process.exit(1) };

          console.log(user.json());
          break

        default:
          let record = rb.getResource(process.argv[3], process.argv[4]);
          if (!record){ process.exit(1) };

          console.log(record.json());
      };
      break;

    case 'common':
      rb.commonWorkouts(process.argv[3], process.argv[4]);
      break;

    case 'web':
      rb.web.start();
      break;

    default:
      console.log("Unknown argument");
      process.exit(1);
  }
})();
