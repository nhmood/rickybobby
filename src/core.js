console.log("rickybobby core");

const db = require("./db/core.js");
const peloton = require("./peloton/core.js");


class RickyBobby {
  db;
  peloton;
  constructor(config){
    console.log(config);

    this.db       = new db(config.database);
    this.peloton  = new peloton(config.peloton_api);
  }


  async authenticate(username, password){
    console.log(`Authenticating Peloton API with ${username}`);

    const loginData = await this.peloton.login(username, password);
    console.log({loginData});

    // TODO - add better error handling
    if (loginData == undefined){
      console.error(`Failed to login ${username}, existing`);
      process.exit(1);
    }

    // Handle the session portion of the response
    this.db.Session.upsert({
      username: username,
      data: loginData.session
    })
  }


  setup(){
    // Attempt to lookup a session for the currently configured
    // peloton user and if not issue
    console.log(`Looking up session for ${this.peloton.username}`);
    let session = this.db.Session.get( this.peloton.username );
    if (session == undefined){
      console.warn(`No session found for ${this.peloton.username} - run authenticate with password in env`);
      process.exit(1);
    }

    console.log({session});
    this.peloton.sessionID = session.data.session_id;
    console.log(this.peloton);
  }


  async getUser(username){
    let user = this.db.User.first({
      username: username
    });
    if (user == undefined){
      console.warn(`No user found for ${username}`);
      process.exit(1);
    }

    console.log({user});
    return user;
  }


  async fetchUser(username){
    this.setup();

    const userData = await this.peloton.getUser(username);
    console.log({userData});

    this.db.User.upsert({
      id: userData.user.id,
      username: userData.user.username,
      data: userData.user
    })

  }
}

module.exports = RickyBobby;
