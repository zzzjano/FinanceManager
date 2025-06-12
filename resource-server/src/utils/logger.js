const winston = require('winston');

let logger;

// Set up logger with appropriate format and log levels
const setupLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'resource-server' },
    transports: [
      // Write all logs to console
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      // Write all logs with level 'error' and below to error.log
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      // Write all logs to combined.log
      new winston.transports.File({ filename: 'logs/combined.log' })
    ]
  });

  return logger;
};

module.exports = {
  setupLogger,
  logger: logger || console
};
