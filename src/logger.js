const winston = require('winston');

const options = {
  file: {
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    filename: 'logs/app.log',
    maxsize: 5242880, // 5MB,
    maxFiles: 5,
  },
  console: {
    level: (process.env.RB_LOG_LEVEL || 'info').toLowerCase(),
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} [${info.level}] ${info.message}`,
      )
    )
  }
};

var logger = winston.createLogger({
  transports: [
    new winston.transports.Console(options.console)
  ],
  exitOnError: false, // do not exit on handled exceptions
});


// Configure stream to use with morgan (express logging)
// Add in the newline stripping to clean up the express logs
logger.stream = {
  write: function(message, encoding){
    logger.info(message.substring(0,message.lastIndexOf('\n')));
  }
};


module.exports = logger;
