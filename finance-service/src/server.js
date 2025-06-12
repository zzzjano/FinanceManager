require("./instrument.js");
const Sentry = require("@sentry/node");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const axios = require('axios');
const { setupLogger } = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

require('dotenv').config();

const logger = setupLogger();

// Initialize express app
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));


// Middleware

app.use(authMiddleware);

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Finance service is healthy'
  });
});

Sentry.setupExpressErrorHandler(app);

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
connectDatabase();

// Schedule recurring transactions processing (runs every hour)
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('* * * * *', async () => {
    try {
      logger.info('Running scheduled transaction processing');
      
      // Call our own API to process transactions
      const response = await axios.post(`http://localhost:${process.env.PORT || 3003}/api/scheduled-transactions/process`);
      
      logger.info(`Scheduled transaction processing complete: ${JSON.stringify(response.data.data.results)}`);
    } catch (error) {
      logger.error('Error processing scheduled transactions:', error);
    }
  });
}

// Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  logger.info(`Finance service running on port ${PORT}`);
});

module.exports = app;
