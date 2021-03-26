const dateFormat = require('dateformat');

class Helpers {
  static formatDate(epoch){
    let datetime = new Date(epoch * 1000);

    let formatted = dateFormat(datetime, 'dddd m/d/yy @ h:M TT')
    return formatted;
  }
}

module.exports = Helpers;
