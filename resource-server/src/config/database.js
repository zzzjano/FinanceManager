const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectToDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true
  };

  try {
    await mongoose.connect(uri, options);
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = {
  connectToDatabase
};
