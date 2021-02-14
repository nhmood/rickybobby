console.log("pelobattle database");

const fs     = require('fs');
const sqlite = require('better-sqlite3');


class Database {
  #config;
  #dbPath;
  #db;

  migrate(migrationPath){
    let migration;
    try {
      migration = fs.readFileSync(migrationPath, 'utf8');
    } catch(err) {
      console.error(`Failed to open migration @ ${migrationPath} - ${err}`);
      process.exit(1);
    }

    this.#db.exec(migration);
  }

  constructor(config){
    this.#config = config;
    this.setup(this.#config.path);
  }

  setup(path){
    if (path == undefined || path.length == 0){
      console.error("pelobattle db path not specified");
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
    });

    return db;
  }
}



module.exports = Database;
