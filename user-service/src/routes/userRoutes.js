const express = require('express');
const { requireRole, ROLES } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Health check
router.get('/health', userController.healthCheck);

// Public routes
router.post('/users/register', userController.registerUser);
router.post('/users/forgot-password', userController.forgotPassword);
router.post('/users/reset-password', userController.resetPassword);

// Protected routes
router.get('/users', requireRole(ROLES.ADMIN), userController.getAllUsers);
router.get('/users/:id', requireRole([ROLES.ADMIN, ROLES.USER]), userController.getUserById);
router.put('/users/:id', requireRole([ROLES.ADMIN, ROLES.USER]), userController.updateUser);
router.delete('/users/:id', requireRole(ROLES.ADMIN), userController.deleteUser);

// User preferences
router.get('/users/:id/preferences', requireRole([ROLES.ADMIN, ROLES.USER]), userController.getUserPreferences);
router.put('/users/:id/preferences', requireRole([ROLES.ADMIN, ROLES.USER]), userController.updateUserPreferences);

module.exports = router;
