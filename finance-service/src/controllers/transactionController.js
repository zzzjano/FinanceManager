const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');
const budgetController = require('./budgetController');

// Get all transactions for the authenticated user
const getAllTransactions = async (req, res, next) => {
  try {
    // Build filter object based on query parameters
    const userRoles = req.auth.realm_access?.roles
    const filter = userRoles.includes('admin') && req.query.userId
      ? { userId: req.query.userId }
      : { userId: req.auth.sub };
    
    // Add date range filters if provided
    if (req.query.startDate) {
      filter.date = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filter.date = { ...filter.date, $lte: new Date(req.query.endDate) };
    }
    
    // Add account filter if provided
    if (req.query.accountId) {
      filter.accountId = req.query.accountId;
    }
    
    // Add category filter if provided
    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }
    
    // Add type filter if provided
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Add min/max amount filters if provided
    if (req.query.minAmount) {
      filter.amount = { $gte: parseFloat(req.query.minAmount) };
    }
    
    if (req.query.maxAmount) {
      filter.amount = { ...filter.amount, $lte: parseFloat(req.query.maxAmount) };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;
    
    // Sorting
    const sort = req.query.sort || '-date';
    
    const transactions = await Transaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    const totalCount = await Transaction.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      results: transactions.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      data: { transactions }
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    next(error);
  }
};

// Create a new transaction
const createTransaction = async (req, res, next) => {
  try {
    const { 
      accountId, 
      categoryId, 
      amount, 
      type, 
      date,
      description,
      payee,
      isRecurring,
      tags
    } = req.body;
    
    // Set userId based on current user (or specified user if admin)
    const userRoles = req.auth.realm_access?.roles
    const userId = userRoles.includes('admin') && req.body.userId
      ? req.body.userId
      : req.auth.sub;
    
    // Verify that the account exists and belongs to the user
    const account = await Account.findOne({ 
      _id: accountId,
      userId
    });
    
    if (!account) {
      return res.status(404).json({
        status: 'fail',
        message: 'Account not found or does not belong to the user'
      });
    }
    
    // Create the new transaction
    const newTransaction = await Transaction.create({
      userId,
      accountId,
      categoryId,
      amount,
      type,
      date: date || new Date(),
      description,
      payee,
      isRecurring,
      tags
    });
    
    // Update account balance based on transaction type
    let balanceChange = 0;
    
    if (type === 'income') {
      balanceChange = amount;
    } else if (type === 'expense') {
      balanceChange = -amount;
    }
    // For transfers, would need to handle both from and to accounts
    
    await Account.findByIdAndUpdate(
      accountId,
      { $inc: { balance: balanceChange } }
    );    // Check if this transaction affects any active budgets and update them
    let budgetAlerts = null;
    if (type === 'expense') {
      budgetAlerts = await budgetController.updateBudgetsForTransaction(newTransaction);
      
      // Create notifications from budget alerts if any
      if (budgetAlerts && budgetAlerts.length > 0) {
        const notificationController = require('./notificationController');
        await notificationController.createBudgetNotifications(budgetAlerts, userId);
      }
    }
    
    res.status(201).json({
      status: 'success',
      data: { 
        transaction: newTransaction,
        budgetAlerts
      }
    });
  } catch (error) {
    logger.error('Error creating transaction:', error);
    next(error);
  }
};

// Get a transaction by ID
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id).select('-__v');
    
    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found'
      });
    }
    
    // Check if user has access to this transaction
    const userRoles = req.auth.realm_access?.roles;
    if (!userRoles.includes('admin') && transaction.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this transaction'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { transaction }
    });
  } catch (error) {
    logger.error(`Error fetching transaction with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update a transaction
const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      accountId, 
      categoryId, 
      amount, 
      type, 
      date,
      description,
      payee,
      isRecurring,
      tags
    } = req.body;
    
    // Find the original transaction
    const originalTransaction = await Transaction.findById(id);
    
    if (!originalTransaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found'
      });
    }
    
    // Check if user has access to update this transaction
    const userRoles = req.auth.realm_access?.roles
    if (!userRoles.includes('admin') && originalTransaction.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this transaction'
      });
    }
    
    // If account is changing, verify the new account exists and belongs to user
    if (accountId && accountId !== originalTransaction.accountId.toString()) {
      const newAccount = await Account.findOne({
        _id: accountId,
        userId: originalTransaction.userId
      });
      
      if (!newAccount) {
        return res.status(404).json({
          status: 'fail',
          message: 'New account not found or does not belong to the user'
        });
      }
      
      // Revert the balance change on the original account
      let originalBalanceChange = 0;
      if (originalTransaction.type === 'income') {
        originalBalanceChange = -originalTransaction.amount;
      } else if (originalTransaction.type === 'expense') {
        originalBalanceChange = originalTransaction.amount;
      }
      
      await Account.findByIdAndUpdate(
        originalTransaction.accountId,
        { $inc: { balance: originalBalanceChange } }
      );
      
      // Apply the balance change to the new account
      let newBalanceChange = 0;
      if (type || originalTransaction.type === 'income') {
        newBalanceChange = amount || originalTransaction.amount;
      } else if (type || originalTransaction.type === 'expense') {
        newBalanceChange = -(amount || originalTransaction.amount);
      }
      
      await Account.findByIdAndUpdate(
        accountId,
        { $inc: { balance: newBalanceChange } }
      );
    } else if (amount !== undefined || type !== undefined) {
      // If amount or type changes but account stays the same
      const currentAccount = await Account.findById(originalTransaction.accountId);
      
      // Calculate the net change to apply to the account
      let netBalanceChange = 0;
      
      // Remove the effect of the original transaction
      if (originalTransaction.type === 'income') {
        netBalanceChange -= originalTransaction.amount;
      } else if (originalTransaction.type === 'expense') {
        netBalanceChange += originalTransaction.amount;
      }
      
      // Add the effect of the updated transaction
      const newType = type || originalTransaction.type;
      const newAmount = amount || originalTransaction.amount;
      
      if (newType === 'income') {
        netBalanceChange += newAmount;
      } else if (newType === 'expense') {
        netBalanceChange -= newAmount;
      }
      
      // Apply the net change to the account
      await Account.findByIdAndUpdate(
        originalTransaction.accountId,
        { $inc: { balance: netBalanceChange } }
      );
    }
    
    // Update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      {
        accountId: accountId || originalTransaction.accountId,
        categoryId: categoryId || originalTransaction.categoryId,
        amount: amount || originalTransaction.amount,
        type: type || originalTransaction.type,
        date: date || originalTransaction.date,
        description: description !== undefined ? description : originalTransaction.description,
        payee: payee !== undefined ? payee : originalTransaction.payee,
        isRecurring: isRecurring !== undefined ? isRecurring : originalTransaction.isRecurring,
        tags: tags || originalTransaction.tags
      },
      { new: true, runValidators: true }
    ).select('-__v');

    // Check for budget impacts
    let budgetAlerts = null;    // If transaction was modified in a way that affects budgets (type, amount, category, date)
    const budgetRelevantChange = type !== undefined || 
                                 amount !== undefined || 
                                 categoryId !== undefined || 
                                 date !== undefined;
    
    if (budgetRelevantChange) {
      if (originalTransaction.type === 'expense') {
        // First, remove the impact of the old transaction from budgets
        // This is simulated by creating a reverse transaction with negative amount
        await budgetController.updateBudgetsForTransaction({
          ...originalTransaction.toObject(),
          amount: -originalTransaction.amount,
        });
      }
      
      // Then apply the new transaction to budgets if it's an expense
      if (updatedTransaction.type === 'expense') {
        budgetAlerts = await budgetController.updateBudgetsForTransaction(updatedTransaction);
        
        // Create notifications from budget alerts if any
        if (budgetAlerts && budgetAlerts.length > 0) {
          const notificationController = require('./notificationController');
          await notificationController.createBudgetNotifications(budgetAlerts, updatedTransaction.userId);
        }
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: { 
        transaction: updatedTransaction,
        budgetAlerts
      }
    });
  } catch (error) {
    logger.error(`Error updating transaction with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete a transaction
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found'
      });
    }
    
    // Check if user has access to delete this transaction
    const userRoles = req.auth.realm_access?.roles
    if (!userRoles.includes('admin') && transaction.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete this transaction'
      });
    }
    
    // Revert the balance change on the account
    let balanceChange = 0;
    if (transaction.type === 'income') {
      balanceChange = -transaction.amount;
    } else if (transaction.type === 'expense') {
      balanceChange = transaction.amount;
    }
    
    await Account.findByIdAndUpdate(
      transaction.accountId,
      { $inc: { balance: balanceChange } }
    );    // If this was an expense transaction, update any affected budgets
    if (transaction.type === 'expense') {
      // Create a negative transaction to reverse the effect on budgets
      const budgetAlerts = await budgetController.updateBudgetsForTransaction({
        ...transaction.toObject(),
        amount: -transaction.amount,
      });
      
      // In case of budget alerts from the reversal, create notifications
      if (budgetAlerts && budgetAlerts.length > 0) {
        const notificationController = require('./notificationController');
        await notificationController.createBudgetNotifications(budgetAlerts, transaction.userId);
      }
    }
    
    // Delete the transaction
    await Transaction.findByIdAndDelete(id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error(`Error deleting transaction with ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  getAllTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};
