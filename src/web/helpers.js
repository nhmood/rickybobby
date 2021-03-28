const dateFormat = require('dateformat');

class Helpers {
  static formatDate(epoch, short = false){
    let datetime = new Date(epoch * 1000);

    let format = short ? 'dddd m/d/yy' :  'dddd m/d/yy @ h:M TT';
    let formatted = dateFormat(datetime, format);
    return formatted;
  }


  static chunk(data, chunkSize){
    let chunks = [];
    // Start the chunk with -1 so the "group" clause increments on
    // start to index 0
    for (let index = 0, chunk = -1; index < data.length; index++){
      if (index % chunkSize == 0){
        chunk++;
      }

      // Grab the chunk and initialize the array if new, then append the data
      chunks[chunk] = chunks[chunk] || [];
      chunks[chunk].push(data[index])
    }

    return chunks;
  }
}

module.exports = Helpers;
