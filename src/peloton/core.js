console.log("rickybobby peloton api");

const fetch = require('node-fetch');


class PelotonAPI {
  BASE_URL = "https://api.onepeloton.com"
  #config;
  #session;


  // TODO - move to urls helper file
  pelotonURLS = {
    auth: () => { return `${this.BASE_URL}/auth/login`; },
    user: (userID) => { return `${this.BASE_URL}/api/user/${userID}`; },
    workout: (workoutID) => { return `${this.BASE_URL}/api/workout/${workoutID}`; },
    workouts: (userID, page = 0) => { return `${this.BASE_URL}/api/user/${userID}/workouts?joins=peloton.ride&page=${page}`;  },
    ride: (rideID) => { return `${this.BASE_URL}/api/ride/${rideID}`; },
    performance: (workoutID) => { return `${this.BASE_URL}/api/workout/${workoutID}/performance_graph`; }
  }


  requestHeaders(){
    let headers = {
      'Content-Type': 'application/json',
    };

    // If the session is set on this Peloton client, add the cookie
    // to the headers
    if (this.#session){
      headers['Cookie'] = `peloton_session_id=${this.#session};`;
    }

    return headers;
  }

  constructor(config){
    this.#config = config;
  }

  set sessionID(id){
    this.#session = id;
  }

  get username(){
    return this.#config.username;
  }


  async login(username, password){
    console.log(`PelotonAPI:login(${username}, *******) -> ${this.PELOTON_LOGIN}`);
    const payload = JSON.stringify({username_or_email: username, password: password});

    const data = await this.post({
      url: this.pelotonURLS.auth(),
      data: JSON.stringify({
        username_or_email: username,
        password: password
      })
    });

    // Format the login response accordingly
    // TODO - should probably type this out into its own LoginResponse class
    const loginResponse = {
      user: data.data.user_data,
      session: {
        session_id: data.data.session_id,
        user_id:    data.data.user_id,
        username:   username
      },
      raw: data
    }

    return loginResponse;
  }


  async getUser(user){
    const url = this.pelotonURLS.user(user);
    console.log({url});

    const data = await this.get({
      url: url
    });

    // Format the user response accordingly
    // TODO - should probably type this out into its own UserResponse class
    const userResponse = {
      user: data.data,
      raw: data
    }

    return userResponse;
  }

  async getRide(rideID){
    const url = this.pelotonURLS.ride(rideID);
    console.log({url});

    const data = await this.get({
      url: url
    });

    // Format the user response accordingly
    // TODO - should probably type this out into its own RideResponse class
    const rideResponse = {
      ride: data.data,
      raw: data
    }

    return rideResponse;
  }


  async getWorkout(workoutID){
    const url = this.pelotonURLS.workout(workoutID);
    console.log({url});

    const data = await this.get({
      url: url
    });

    // Format the user response accordingly
    // TODO - should probably type this out into its own WorkoutResponse class
    const workoutResponse = {
      workout: data.data,
      raw: data
    }

    return workoutResponse;
  }


  // Initial cursor to kick off workout walking from page 0
  workoutCursor(userID){
    return {
      next: async () => { return this.getWorkouts(userID, 0); }
    }
  }


  async getWorkouts(userID, page = 0){
    const url = this.pelotonURLS.workouts(userID, page);
    console.log({url});

    let resp = await this.get({
      url: url
    });

    let data = resp.data;
    console.log({data});

    return {
      workouts: data.data,
      moreAvailable: (data.page + 1) < resp.data.page_count,
      next: async () => { return this.getWorkouts(userID, data.page + 1); }
    }
  }


  async getPerformanceGraph(workoutID){
    const url = this.pelotonURLS.performance(workoutID);
    console.log({url});

    const data = await this.get({
      url: url
    });

    // Format the user response accordingly
    // TODO - should probably type this out into its own RideResponse class
    const performanceGraphResponse = {
      performance: data.data,
      raw: data
    }

    return performanceGraphResponse;
  }


  async post(request){
    request.method = 'POST';
    return await this.request(request);
  }

  async get(request){
    request.method = 'GET';
    return await this.request(request);
  }

  async request(request){
    console.debug({request});
    let response;
    let data;
    try {
      response = await fetch(request.url, {
        method: request.method,
        headers: this.requestHeaders(),
        body: request.data,
      });
      console.debug(response);

      data = await response.json();
      return {
        status: response.status,
        data: data,
        http: {
          request: request,
          response: response
        }
      }
    } catch(err) {
      console.error(`Failed to request ${request.url}`);
      console.error(err)
      console.debug(request);
      console.debug(response);
      console.debug(data);
      return;
    }
  }
}

module.exports = PelotonAPI;
