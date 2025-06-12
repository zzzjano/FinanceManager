const express = require('express');
const router = express.Router();
const { requireRole, ROLES } = require('../middleware/auth');

// Import controllers
const userController = require('../controllers/userController');
const accountController = require('../controllers/accountController');
const categoryController = require('../controllers/categoryController');
const transactionController = require('../controllers/transactionController');
const healthController = require('../controllers/healthController');
const reportController = require('../controllers/reportController');
const budgetController = require('../controllers/budgetController');
const scheduledTransactionController = require('../controllers/scheduledTransactionController');

// Health check routes (no auth required)
router.get('/health', healthController.healthCheck);

// User routes (protected by authentication and role-based access)
router.post('/users/register', userController.registerUser); // Registration endpoint (no auth required)
router.post('/users/forgot-password', userController.forgotPassword); // Forgot password endpoint (no auth required)
router.post('/users/reset-password', userController.resetPassword); // Reset password endpoint (no auth required)
router.get('/users', requireRole(ROLES.ADMIN), userController.getAllUsers);
router.get('/users/:id', requireRole([ROLES.ADMIN, ROLES.USER]), userController.getUserById);
router.put('/users/:id', requireRole([ROLES.ADMIN, ROLES.USER]), userController.updateUser);
router.delete('/users/:id', requireRole(ROLES.ADMIN), userController.deleteUser);

// User preferences routes
router.get('/users/:id/preferences', requireRole([ROLES.ADMIN, ROLES.USER]), userController.getUserPreferences);
router.put('/users/:id/preferences', requireRole([ROLES.ADMIN, ROLES.USER]), userController.updateUserPreferences);

// Account routes
router.get('/accounts', requireRole([ROLES.ADMIN, ROLES.USER]), accountController.getAllAccounts);
router.post('/accounts', requireRole([ROLES.ADMIN, ROLES.USER]), accountController.createAccount);
router.get('/accounts/:id', requireRole([ROLES.ADMIN, ROLES.USER]), accountController.getAccountById);
router.put('/accounts/:id', requireRole([ROLES.ADMIN, ROLES.USER]), accountController.updateAccount);
router.delete('/accounts/:id', requireRole([ROLES.ADMIN, ROLES.USER]), accountController.deleteAccount);

// Category routes
router.get('/categories', requireRole([ROLES.ADMIN, ROLES.USER]), categoryController.getAllCategories);
router.post('/categories', requireRole([ROLES.ADMIN, ROLES.USER]), categoryController.createCategory);
router.get('/categories/:id', requireRole([ROLES.ADMIN, ROLES.USER]), categoryController.getCategoryById);
router.put('/categories/:id', requireRole([ROLES.ADMIN, ROLES.USER]), categoryController.updateCategory);
router.delete('/categories/:id', requireRole([ROLES.ADMIN, ROLES.USER]), categoryController.deleteCategory);

// Transaction routes
router.get('/transactions', requireRole([ROLES.ADMIN, ROLES.USER]), transactionController.getAllTransactions);
router.post('/transactions', requireRole([ROLES.ADMIN, ROLES.USER]), transactionController.createTransaction);
router.get('/transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), transactionController.getTransactionById);
router.put('/transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), transactionController.updateTransaction);
router.delete('/transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), transactionController.deleteTransaction);

// Scheduled transaction routes
router.get('/scheduled-transactions', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionController.getAllScheduledTransactions);
router.post('/scheduled-transactions', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionController.createScheduledTransaction);
router.get('/scheduled-transactions/upcoming', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionController.getUpcomingTransactions);
router.get('/scheduled-transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionController.getScheduledTransactionById);
router.put('/scheduled-transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionController.updateScheduledTransaction);
router.delete('/scheduled-transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionController.deleteScheduledTransaction);

// New advanced reporting routes
router.get('/reports/periodic', requireRole([ROLES.ADMIN, ROLES.USER]), reportController.getPeriodicReport);
router.get('/reports/trends', requireRole([ROLES.ADMIN, ROLES.USER]), reportController.getTrends);
router.get('/reports/category-distribution', requireRole([ROLES.ADMIN, ROLES.USER]), reportController.getCategoryDistribution);
router.get('/reports/export', requireRole([ROLES.ADMIN, ROLES.USER]), reportController.exportData);

// Budget routes
router.get('/budgets', requireRole([ROLES.ADMIN, ROLES.USER]), budgetController.getAllBudgets);
router.post('/budgets', requireRole([ROLES.ADMIN, ROLES.USER]), budgetController.createBudget);
router.get('/budgets/:id', requireRole([ROLES.ADMIN, ROLES.USER]), budgetController.getBudgetById);
router.get('/budgets/:id/progress', requireRole([ROLES.ADMIN, ROLES.USER]), budgetController.getBudgetProgress);
router.put('/budgets/:id', requireRole([ROLES.ADMIN, ROLES.USER]), budgetController.updateBudget);
router.delete('/budgets/:id', requireRole([ROLES.ADMIN, ROLES.USER]), budgetController.deleteBudget);

// Notification routes
const notificationController = require('../controllers/notificationController');
router.get('/notifications', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.getAllNotifications);
router.get('/notifications/unread-count', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.getUnreadCount);
router.put('/notifications/:id/read', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.markAsRead);
router.put('/notifications/mark-all-read', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.markAllAsRead);
router.delete('/notifications/:id', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.deleteNotification);
router.delete('/notifications', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.deleteAllNotifications);

module.exports = router;
