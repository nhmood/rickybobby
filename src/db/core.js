logger.info("rickybobby database");

const fs     = require('fs');
const sqlite = require('better-sqlite3');
const models = {
  Session:    require('./session.js'),
  Datalog:    require('./datalog.js'),
  User:       require('./user.js'),
  Ride:       require('./ride.js'),
  Instructor: require('./instructor.js'),
  Workout:    require('./workout.js'),
  Following:  require('./following.js')
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
      logger.error(`Failed to open migration @ ${migrationPath} - ${err}`);
      process.exit(1);
    }

    logger.info(`Executing Migration - ${migrationPath}`);
    logger.info(migration);
    let result = this.#db.exec(migration);
  }


  setup(path){
    if (path == undefined || path.length == 0){
      logger.error("rickybobby db path not specified");
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
      logger.error(`Failed to open sqlite database @ ${dbPath} - ${err}`);
      process.exit(1);
    }

    logger.info(`Opened sqlite DB @ ${path}`);
    process.on('SIGINT', () => {
      db.close();
      process.exit(1);
    });

    return db;
  }


  setupModels(){
    this.Session    = models.Session.setup(this.#db);
    this.Datalog    = models.Datalog.setup(this.#db);
    this.User       = models.User.setup(this.#db);
    this.Ride       = models.Ride.setup(this.#db);
    this.Instructor = models.Instructor.setup(this.#db);
    this.Workout    = models.Workout.setup(this.#db);
    this.Following  = models.Following.setup(this.#db);
  }

  resource(name){
    // Format the resource name and attempt to grab the model from this.db
    const modelName = name[0].toUpperCase() + name.slice(1);
    const model = this[modelName];

    // If there is no associated model for this resource, print and error and return
    if (model == undefined){
      logger.warn(`Unrecognized data model ${name}/${modelName}`);
      return false;
    }

    return model;
  }
}

module.exports = Database;
