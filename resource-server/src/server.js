require("./instrument.js");

const Sentry = require("@sentry/node");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectToDatabase } = require('./config/database');
const { setupLogger } = require('./utils/logger');
const { authMiddleware } = require('./middleware/auth');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { rateLimit } = require('express-rate-limit')

const limiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Load environment variables
require('dotenv').config();

// Initialize logger
const logger = setupLogger();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin resource sharing
app.use(express.json()); // Parse JSON request bodies
app.use(limiter)
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // HTTP request logging

// Connect to database
connectToDatabase()
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('Database connection error:', err);
    process.exit(1);
  });

// Authentication middleware - validates OAuth2 tokens
app.use(authMiddleware);

// API routes
app.use('/api', routes);

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

Sentry.setupExpressErrorHandler(app);

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Resource server listening on port ${PORT}`);
});

module.exports = app; // For testing purposes
