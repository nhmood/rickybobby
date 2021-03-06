console.log("rickybobby database");

const fs     = require('fs');
const sqlite = require('better-sqlite3');
const models = {
  Session:    require('./session.js'),
  User:       require('./user.js'),
  Ride:       require('./ride.js'),
  Instructor: require('./instructor.js'),
  Workout:    require('./workout.js')
};


class Database {
  #config;
  #dbPath;
  #db;


  constructor(config){
    this.#config = config;
    this.setup(this.#config.path);
    this.setupModels();
  }


  migrate(migrationPath){
    let migration;
    try {
      migration = fs.readFileSync(migrationPath, 'utf8');
    } catch(err) {
      console.error(`Failed to open migration @ ${migrationPath} - ${err}`);
      process.exit(1);
    }

    console.log(`Executing Migration - ${migrationPath}`);
    console.log(migration);
    let result = this.#db.exec(migration);
  }


  setup(path){
    if (path == undefined || path.length == 0){
      console.error("rickybobby db path not specified");
      process.exit(1);
    }

    this.#dbPath = path;
    this.#db = this.connect(this.#dbPath);
  }


  connect(path){
    let db;
    try {
      db = new sqlite(path);
    } catch(err){
      console.error(`Failed to open sqlite database @ ${dbPath} - ${err}`);
      process.exit(1);
    }

    console.log(`Opened sqlite DB @ ${path}`);
    process.on('SIGINT', () => {
      db.close();
      process.exit(1);
    });

    return db;
  }


  setupModels(){
    this.Session    = models.Session.setup(this.#db);
    this.User       = models.User.setup(this.#db);
    this.Ride       = models.Ride.setup(this.#db);
    this.Instructor = models.Instructor.setup(this.#db);
    this.Workout    = models.Workout.setup(this.#db);
  }
}

module.exports = Database;
