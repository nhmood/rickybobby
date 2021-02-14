console.log("pelobattle peloton api");

const fetch = require('node-fetch');


class PelotonAPI {
  BASE_URL = "https://api.onepeloton.com"
  #config;

  constructor(config){
    this.#config = config;
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
    console.log({request});
    let response;
    let data;
    try {
      response = await fetch(request.url, {
        method: request.method,
        headers: {'Content-Type': 'application/json'},
        body: request.data,
      });

      data = await response.json();
      return data;
    } catch(err) {
      console.error(`Failed to request ${request.url}`);
      console.error(err)
      console.log(request);
      console.log(response);
      console.log(data);
      return;
    }
  }
}

module.exports = PelotonAPI;
