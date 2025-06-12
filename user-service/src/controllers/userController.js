const User = require('../models/User');
const { logger } = require('../utils/logger');
const axios = require('axios');
const qs = require('querystring');
const crypto = require('crypto');

// Get all users (admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-__v');
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    logger.error('Error fetching all users:', error);
    next(error);
  }
};

// Get a specific user by ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // If user is not admin, they can only access their own data
    const userRoles = req.auth.realm_access?.roles
    if (!userRoles.includes('admin') && req.auth.sub !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden - You can only access your own user data'
      });
    }

    const user = await User.findOne({ keycloakId: id }).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    logger.error(`Error fetching user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Get user preferences
const getUserPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // If user is not admin, they can only access their own data
    const userRoles = req.auth.realm_access?.roles
    if (!userRoles.includes('admin') && req.auth.sub !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden - You can only access your own preferences'
      });
    }

    const user = await User.findOne({ keycloakId: id }).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { preferences: user.preferences }
    });
  } catch (error) {
    logger.error(`Error fetching preferences for user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update user preferences
const updateUserPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currency, language, theme } = req.body;
    
    // If user is not admin, they can only update their own preferences
    const userRoles = req.auth.realm_access?.roles
    if (!userRoles.includes('admin') && req.auth.sub !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden - You can only update your own preferences'
      });
    }
    
    const updatedUser = await User.findOneAndUpdate(
      { keycloakId: id },
      { 
        preferences: {
          currency: currency || undefined,
          language: language || undefined,
          theme: theme || undefined
        } 
      },
      { new: true, runValidators: true }
    ).select('preferences');
    
    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { preferences: updatedUser.preferences }
    });
  } catch (error) {
    logger.error(`Error updating preferences for user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update a user
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;
    
    // If user is not admin, they can only update their own data
    const userRoles = req.auth.realm_access?.roles;
    if (!userRoles.includes('admin') && req.auth.sub !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden - You can only update your own user data'
      });
    }
    
    // Prevent role updates except by admin
    if (req.body.role && !userRoles.includes('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden - Only admins can update user roles'
      });
    }
    const updatedUser = await User.findOneAndUpdate(
      { keycloakId: id },
      { firstName, lastName, email, ...((userRoles.includes('admin') && req.body.role) ? { role: req.body.role } : {}) },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error(`Error updating user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete a user (admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOneAndDelete({ keycloakId: id });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error(`Error deleting user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Register a new user
const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, username } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !username) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: firstName, lastName, email, password, username'
      });
    }

    // Step 1: Get admin token from Keycloak to manage users
    const adminTokenResponse = await axios.post(
      `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/finance-manager/protocol/openid-connect/token`,
      qs.stringify({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: process.env.KEYCLOAK_ADMIN,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const adminToken = adminTokenResponse.data.access_token;

    // Step 2: Create a new user in Keycloak
    const keycloakUser = {
      firstName,
      lastName,
      email,
      username,
      enabled: true,
      emailVerified: true,
      credentials: [{
        type: 'password',
        value: password,
        temporary: false
      }],
      attributes: {
        registeredAt: [new Date().toISOString()]
      }
    };

    await axios.post(
      `${process.env.KEYCLOAK_AUTH_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
      keycloakUser,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Step 3: Get the user ID from Keycloak
    const keycloakUsersResponse = await axios.get(
      `${process.env.KEYCLOAK_AUTH_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?username=${username}&exact=true`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const keycloakId = keycloakUsersResponse.data[0].id;

    // Step 4: Assign the 'user' role to the new user
    const userRoleResponse = await axios.get(
      `${process.env.KEYCLOAK_AUTH_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles/user`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const userRole = userRoleResponse.data;

    await axios.post(
      `${process.env.KEYCLOAK_AUTH_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/role-mappings/realm`,
      [userRole],
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Step 5: Create a user in our database
    const newUser = await User.create({
      keycloakId,
      email,
      firstName,
      lastName,
      role: 'user',
      preferences: {
        currency: req.body.currency || 'USD',
        language: req.body.language || 'en',
        theme: req.body.theme || 'light'
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: newUser.keycloakId,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          preferences: newUser.preferences
        }
      }
    });
  } catch (error) {
    logger.error('Error registering new user:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status || 400).json({
        status: 'error',
        message: error.response.data.errorMessage || error.message
      });
    }
    
    next(error);
  }
};

// New function to request a password reset
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an email address'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      // We still return 200 but skip the actual token generation
      return res.status(200).json({
        status: 'success',
        message: 'If your email exists in our system, you will receive a password reset link shortly.'
      });
    }

    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set password reset token and expiration (10 minutes from now)
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // In a real implementation, you would send an email here
    // For now, we'll just return the token in the response
    
    // Constructing the reset URL (in a real app, this would be in the email)
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    res.status(200).json({
      status: 'success',
      message: 'If your email exists in our system, you will receive a password reset link shortly.',
      // Include the token and URL for demo purposes only!
      // In production, these would be sent via email and not returned in the API response
      resetToken: resetToken,
      resetUrl: resetUrl
    });
  } catch (error) {
    logger.error('Error in forgotPassword:', error);
    next(error);
  }
};

// New function to reset the password with the token
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a token and new password'
      });
    }

    // Find user with the given token that hasn't expired
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }

    // Step 1: Get admin token from Keycloak to manage users
    const adminTokenResponse = await axios.post(
      `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/finance-manager/protocol/openid-connect/token`,
      qs.stringify({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: process.env.KEYCLOAK_ADMIN,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const adminToken = adminTokenResponse.data.access_token;

    // Update the user's password in Keycloak
    await axios.put(
      `${process.env.KEYCLOAK_AUTH_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${user.keycloakId}/reset-password`,
      {
        type: 'password',
        value: newPassword,
        temporary: false
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Clear the reset token and expiration
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Your password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    logger.error('Error in resetPassword:', error);
    next(error);
  }
};

// Health check endpoint
const healthCheck = async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'User service is running',
    timestamp: new Date()
  });
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUser,
  getUserPreferences,
  updateUserPreferences,
  healthCheck,
  forgotPassword,
  resetPassword
};
