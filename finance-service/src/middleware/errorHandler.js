const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error handling request:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle JWT authentication errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token finance-service',
      details: err // Include additional error details if available
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: err.message,
      details: err.errors
    });
  }

  // Handle database errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(500).json({
      error: 'DatabaseError',
      message: 'Database operation failed'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Something went wrong'
  });
};

module.exports = errorHandler;
