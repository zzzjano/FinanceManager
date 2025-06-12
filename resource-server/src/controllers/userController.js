const { logger } = require('../utils/logger');
const userService = require('../services/userService');

// Get all users (admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const authToken = req.headers.authorization;
    const result = await userService.getAllUsers(authToken);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching all users:', error);
    next(error);
  }
};

// Get a specific user by ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authToken = req.headers.authorization;
    const result = await userService.getUserById(id, authToken);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error fetching user with ID ${req.params.id}:`, error);
    
    // Forward status code and error message from the user service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Update a user
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    const authToken = req.headers.authorization;
    
    const result = await userService.updateUser(id, userData, authToken);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error updating user with ID ${req.params.id}:`, error);
    
    // Forward status code and error message from the user service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Delete a user (admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authToken = req.headers.authorization;
    
    await userService.deleteUser(id, authToken);
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting user with ID ${req.params.id}:`, error);
    
    // Forward status code and error message from the user service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Register a new user
const registerUser = async (req, res, next) => {
  try {
    const userData = req.body;
    
    // Validate required fields
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.password || !userData.username) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide firstName, lastName, email, username and password'
      });
    }

    const result = await userService.registerUser(userData);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error registering user:', error);
    
    // Forward status code and error message from the user service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Get user preferences
const getUserPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authToken = req.headers.authorization;
    
    const result = await userService.getUserPreferences(id, authToken);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error getting preferences for user ${req.params.id}:`, error);
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Update user preferences
const updateUserPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    const preferencesData = req.body;
    const authToken = req.headers.authorization;
    
    const result = await userService.updateUserPreferences(id, preferencesData, authToken);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error updating preferences for user ${req.params.id}:`, error);
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Forgot password request
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide your email address'
      });
    }

    const result = await userService.forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error handling forgot password request:', error);
    
    // Forward status code and error message from the user service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

// Reset password with token
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid token and new password'
      });
    }

    const result = await userService.resetPassword(token, newPassword);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error handling password reset:', error);
    
    // Forward status code and error message from the user service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUser,
  getUserPreferences,
  updateUserPreferences,
  forgotPassword,
  resetPassword
};
