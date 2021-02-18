console.log("rickybobby peloton api");

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
    console.debug({request});
    let response;
    let data;
    try {
      response = await fetch(request.url, {
        method: request.method,
        headers: {'Content-Type': 'application/json'},
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
