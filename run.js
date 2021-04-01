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
});



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
      let resource;
      switch(process.argv[3]){
        case 'user':
          resource = await rb.fetchUser(process.argv[4]);
          break;

        case 'following':
          resource = await rb.fetchFollowing(process.argv[4]);
          break;

        case 'ride':
          resource = await rb.fetchRide(process.argv[4]);
          break;

        case 'instructor':
          resource = await rb.fetchInstructor(process.argv[4]);
          break;

        case 'workout':
          resource = await rb.fetchWorkout(process.argv[4]);
          break;

        case 'workouts':
          resource = await rb.fetchWorkouts(process.argv[4], process.argv[5]);
          break;

        default:
          logger.warn("Unrecognized fetch target");
          process.exit(1);
      }

      logger.info(resource)
      break;

    case 'rebuild':
      rb.rebuild(process.argv[3]);
      break;

    case 'remove':
      rb.remove(process.argv[3]);
      break;

    case 'sync':
      await rb.sync();
      break;

    case 'get':
      switch(process.argv[3]){
        case 'username':
          let user = rb.getUsername(process.argv[4]);
          if (!user){ process.exit(1) };

          logger.info(user.json());
          break

        default:
          let record = rb.getResource(process.argv[3], process.argv[4]);
          if (!record){ process.exit(1) };

          logger.info(record.json());
      };
      break;

    case 'common':
      rb.commonWorkouts(process.argv[3], process.argv[4]);
      break;

    case 'web':
      rb.web.start();
      break;

    default:
      logger.info("Unknown argument");
      process.exit(1);
  }
})();
