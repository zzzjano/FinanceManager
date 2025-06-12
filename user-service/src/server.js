require("./instrument.js");
const Sentry = require("@sentry/node");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDatabase } = require('./config/database');
const { logger } = require('./utils/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Authentication middleware
app.use(authMiddleware);

// Routes
app.use('/api', routes);

Sentry.setupExpressErrorHandler(app);

// Error handling
app.use(errorHandler);

// Connect to MongoDB
connectDatabase();

// Start server
const server = app.listen(PORT, () => {
  logger.info(`User Service running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`, err);
  server.close(() => process.exit(1));
});

module.exports = app;
