#!/usr/bin/env node

// TODO - wrap this in a config reader helper
const fs      = require('fs');
const YAML    = require('yaml');

var path = require('path');
global.baseDir = path.dirname(require.main.filename);

// TODO - grab from environment parameter
const file    = fs.readFileSync(global.baseDir + "/rickybobby.yml", 'utf8')
const config  = YAML.parse(file);


global.logger     = require("./src/logger.js").configure(config);
const printHelp   = require('./src/help.js');
const RickyBobby  = require("./src/core.js");


function startup(){
  const rb = new RickyBobby(config);

  // TODO - replace with proper optparser
  (async () => {
    switch(process.argv[2]){
      case 'migrate':
        rb.db.migrate(process.argv[3]);
        break;

      case 'authenticate':
        await rb.authenticate(config.peloton.username, config.peloton.password);
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
            resource = await rb.fetchWorkouts(process.argv[4], process.argv[5], process.argv[6]);
            break;

          default:
            logger.warn("Unrecognized fetch target");
            process.exit(1);
        }

        logger.info(resource)
        break;

      case 'rebuild':
        if (process.argv[3]){
          rb.rebuildResource(process.argv[3]);
        } else {
          let data = await rb.rebuild();
        };
        break;

      case 'remove':
        rb.remove(process.argv[3]);
        break;

      case 'sync':
        await rb.sync();
        break;

      case 'search':
        let r = rb.searchUsername(process.argv[3]);
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

      case 'unique':
        rb.uniqueWorkouts(process.argv[3], process.argv[4]);

      case 'web':
        rb.web.start();
        break;

      default:
        printHelp();
        process.exit(1);
    }
  })();
}



try {
  startup();
} catch(e){
  console.log(e);
  console.log(e.name);
  switch(e.name){
    case "HelpError":
      printHelp();
      break;
    default:
      console.error(e);
  }

  process.exit(1);
}
