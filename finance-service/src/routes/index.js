const express = require('express');
const router = express.Router();
const { requireRole, ROLES } = require('../middleware/auth');
const { 
  transactionValidators, 
  scheduledTransactionValidators,
  accountValidators,
  categoryValidators,
  reportValidators,
  budgetValidators
} = require('../middleware/validators');

// Import controllers
const categoryController = require('../controllers/categoryController');
const transactionController = require('../controllers/transactionController');
const accountController = require('../controllers/accountController');
const reportController = require('../controllers/reportController');
const scheduledTransactionController = require('../controllers/scheduledTransactionController');
const budgetController = require('../controllers/budgetController');

// Health check route (defined in server.js)

// Category routes
router.get('/categories', requireRole([ROLES.ADMIN, ROLES.USER]), categoryValidators.getAll, categoryController.getAllCategories);
router.post('/categories', requireRole([ROLES.ADMIN, ROLES.USER]), categoryValidators.create, categoryController.createCategory);
router.get('/categories/:id', requireRole([ROLES.ADMIN, ROLES.USER]), categoryValidators.getById, categoryController.getCategoryById);
router.put('/categories/:id', requireRole([ROLES.ADMIN, ROLES.USER]), categoryValidators.update, categoryController.updateCategory);
router.delete('/categories/:id', requireRole([ROLES.ADMIN, ROLES.USER]), categoryValidators.delete, categoryController.deleteCategory);

// Transaction routes
router.get('/transactions', requireRole([ROLES.ADMIN, ROLES.USER]), transactionValidators.getAll, transactionController.getAllTransactions);
router.post('/transactions', requireRole([ROLES.ADMIN, ROLES.USER]), transactionValidators.create, transactionController.createTransaction);
router.get('/transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), transactionValidators.getById, transactionController.getTransactionById);
router.put('/transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), transactionValidators.update, transactionController.updateTransaction);
router.delete('/transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), transactionValidators.delete, transactionController.deleteTransaction);

// Account routes
router.get('/accounts', requireRole([ROLES.ADMIN, ROLES.USER]), accountController.getAllAccounts);
router.post('/accounts', requireRole([ROLES.ADMIN, ROLES.USER]), accountValidators.create, accountController.createAccount);
router.get('/accounts/:id', requireRole([ROLES.ADMIN, ROLES.USER]), accountValidators.getById, accountController.getAccountById);
router.put('/accounts/:id', requireRole([ROLES.ADMIN, ROLES.USER]), accountValidators.update, accountController.updateAccount);
router.delete('/accounts/:id', requireRole([ROLES.ADMIN, ROLES.USER]), accountValidators.delete, accountController.deleteAccount);

// New advanced reporting routes
router.get('/reports/periodic', requireRole([ROLES.ADMIN, ROLES.USER]), reportValidators.periodic, reportController.getPeriodicReport);
router.get('/reports/trends', requireRole([ROLES.ADMIN, ROLES.USER]), reportController.getTrends);
router.get('/reports/category-distribution', requireRole([ROLES.ADMIN, ROLES.USER]), reportValidators.categoryDistribution, reportController.getCategoryDistribution);
router.get('/reports/export', requireRole([ROLES.ADMIN, ROLES.USER]), reportController.exportData);

// Scheduled transaction routes
router.get('/scheduled-transactions', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionValidators.getAll, scheduledTransactionController.getAllScheduledTransactions);
router.post('/scheduled-transactions', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionValidators.create, scheduledTransactionController.createScheduledTransaction);
router.get('/scheduled-transactions/upcoming', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionController.getUpcomingTransactions);
router.get('/scheduled-transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionValidators.getById, scheduledTransactionController.getScheduledTransactionById);
router.put('/scheduled-transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionValidators.update, scheduledTransactionController.updateScheduledTransaction);
router.delete('/scheduled-transactions/:id', requireRole([ROLES.ADMIN, ROLES.USER]), scheduledTransactionValidators.delete, scheduledTransactionController.deleteScheduledTransaction);
router.post('/scheduled-transactions/process', scheduledTransactionController.processDueTransactions);

// Budget routes
router.get('/budgets', requireRole([ROLES.ADMIN, ROLES.USER]), budgetValidators.getAll, budgetController.getAllBudgets);
router.post('/budgets', requireRole([ROLES.ADMIN, ROLES.USER]), budgetValidators.create, budgetController.createBudget);
router.get('/budgets/:id', requireRole([ROLES.ADMIN, ROLES.USER]), budgetValidators.getById, budgetController.getBudgetById);
router.get('/budgets/:id/progress', requireRole([ROLES.ADMIN, ROLES.USER]), budgetValidators.getBudgetProgress, budgetController.getBudgetProgress);
router.put('/budgets/:id', requireRole([ROLES.ADMIN, ROLES.USER]), budgetValidators.update, budgetController.updateBudget);
router.delete('/budgets/:id', requireRole([ROLES.ADMIN, ROLES.USER]), budgetValidators.delete, budgetController.deleteBudget);

// Notifications routes
const notificationController = require('../controllers/notificationController');
const { notificationValidators } = require('../middleware/validators');
router.get('/notifications', requireRole([ROLES.ADMIN, ROLES.USER]), notificationValidators.getAll, notificationController.getUserNotifications);
router.get('/notifications/unread-count', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.getUnreadCount);
router.put('/notifications/:id/read', requireRole([ROLES.ADMIN, ROLES.USER]), notificationValidators.markAsRead, notificationController.markAsRead);
router.put('/notifications/mark-all-read', requireRole([ROLES.ADMIN, ROLES.USER]), notificationController.markAllAsRead);
router.delete('/notifications/:id', requireRole([ROLES.ADMIN, ROLES.USER]), notificationValidators.delete, notificationController.deleteNotification);
router.delete('/notifications', requireRole([ROLES.ADMIN, ROLES.USER]), notificationValidators.deleteAll, notificationController.deleteAllNotifications);

module.exports = router;
