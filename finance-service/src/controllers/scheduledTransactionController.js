const ScheduledTransaction = require('../models/ScheduledTransaction');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');

// Get all scheduled transactions for the authenticated user
const getAllScheduledTransactions = async (req, res, next) => {
  try {
    const userRoles = req.auth.realm_access?.roles;
    // Build filter object based on query parameters
    const filter = userRoles.includes('admin') && req.query.userId
      ? { userId: req.query.userId }
      : { userId: req.auth.sub };
    
    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Add account filter if provided
    if (req.query.accountId) {
      filter.accountId = req.query.accountId;
    }
    
    // Add frequency filter if provided
    if (req.query.frequency) {
      filter.frequency = req.query.frequency;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;
    
    // Sorting
    const sort = req.query.sort || 'nextExecutionDate';
    
    const scheduledTransactions = await ScheduledTransaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    const totalCount = await ScheduledTransaction.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      results: scheduledTransactions.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      data: { scheduledTransactions }
    });
  } catch (error) {
    logger.error('Error fetching scheduled transactions:', error);
    next(error);
  }
};

// Create a new scheduled transaction
const createScheduledTransaction = async (req, res, next) => {
  try {
    const { 
      accountId, 
      categoryId, 
      amount, 
      type, 
      description,
      payee,
      tags,
      frequency,
      startDate,
      endDate,
      dayOfMonth,
      dayOfWeek,
      autoExecute,
      baseTransactionId
    } = req.body;
    
    // Set userId based on current user (or specified user if admin)
    const userRoles = req.auth.realm_access?.roles;
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
    
    // Calculate the next execution date based on frequency and start date
    const calculatedStartDate = startDate ? new Date(startDate) : new Date();
    let nextExecutionDate = new Date(calculatedStartDate);
    
    switch (frequency) {
      case 'daily':
        // For daily, next execution is the next day
        nextExecutionDate.setDate(nextExecutionDate.getDate() + 1);
        break;
      case 'weekly':
        // For weekly, use the specified day of week or add 7 days
        if (dayOfWeek !== undefined) {
          // Set to the next occurrence of the specified day of week
          const currentDay = nextExecutionDate.getDay();
          const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
          nextExecutionDate.setDate(nextExecutionDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
        } else {
          // If no specific day is set, just add 7 days
          nextExecutionDate.setDate(nextExecutionDate.getDate() + 7);
        }
        break;
      case 'monthly':
        // For monthly, use the specified day of month or same day next month
        if (dayOfMonth) {
          // Move to next month
          nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
          // Set the specified day of month
          nextExecutionDate.setDate(Math.min(dayOfMonth, new Date(
            nextExecutionDate.getFullYear(),
            nextExecutionDate.getMonth() + 1,
            0
          ).getDate()));
        } else {
          // If no specific day is set, just add one month to the current date
          nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
        }
        break;
      case 'quarterly':
        // For quarterly, add 3 months
        nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 3);
        // If dayOfMonth is specified, adjust day
        if (dayOfMonth) {
          nextExecutionDate.setDate(Math.min(dayOfMonth, new Date(
            nextExecutionDate.getFullYear(),
            nextExecutionDate.getMonth() + 1,
            0
          ).getDate()));
        }
        break;
      case 'yearly':
        // For yearly, add one year
        nextExecutionDate.setFullYear(nextExecutionDate.getFullYear() + 1);
        // If dayOfMonth is specified, adjust day
        if (dayOfMonth) {
          nextExecutionDate.setDate(Math.min(dayOfMonth, new Date(
            nextExecutionDate.getFullYear(),
            nextExecutionDate.getMonth() + 1,
            0
          ).getDate()));
        }
        break;
    }
    
    // Create the new scheduled transaction
    const newScheduledTransaction = await ScheduledTransaction.create({
      userId,
      accountId,
      categoryId,
      baseTransactionId,
      amount,
      type,
      description,
      payee,
      tags,
      frequency,
      startDate: calculatedStartDate,
      endDate: endDate ? new Date(endDate) : null,
      nextExecutionDate,
      dayOfMonth,
      dayOfWeek,
      autoExecute: autoExecute || false,
      status: 'active'
    });
    
    res.status(201).json({
      status: 'success',
      data: { scheduledTransaction: newScheduledTransaction }
    });
  } catch (error) {
    logger.error('Error creating scheduled transaction:', error);
    next(error);
  }
};

// Get a scheduled transaction by ID
const getScheduledTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scheduledTransaction = await ScheduledTransaction.findById(id).select('-__v');
    
    if (!scheduledTransaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Scheduled transaction not found'
      });
    }
    
    // Check if user has access to this scheduled transaction
    const userRoles = req.auth.realm_access?.roles;
    if (!userRoles.includes('admin') && scheduledTransaction.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this scheduled transaction'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { scheduledTransaction }
    });
  } catch (error) {
    logger.error(`Error fetching scheduled transaction with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update a scheduled transaction
const updateScheduledTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      accountId, 
      categoryId, 
      amount, 
      type, 
      description,
      payee,
      tags,
      frequency,
      startDate,
      endDate,
      dayOfMonth,
      dayOfWeek,
      autoExecute,
      status
    } = req.body;
    
    // Find the scheduled transaction
    const scheduledTransaction = await ScheduledTransaction.findById(id);
    
    if (!scheduledTransaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Scheduled transaction not found'
      });
    }
    // Check if user has access to update this scheduled transaction
    const userRoles = req.auth.realm_access?.roles;
    if (!userRoles.includes('admin') && scheduledTransaction.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this scheduled transaction'
      });
    }
    
    // If account is changing, verify the new account exists and belongs to user
    if (accountId && accountId !== scheduledTransaction.accountId.toString()) {
      const newAccount = await Account.findOne({
        _id: accountId,
        userId: scheduledTransaction.userId
      });
      
      if (!newAccount) {
        return res.status(404).json({
          status: 'fail',
          message: 'New account not found or does not belong to the user'
        });
      }
    }
    
    // Calculate the next execution date if frequency or related params changed
    let nextExecutionDate = scheduledTransaction.nextExecutionDate;
    
    if (frequency || dayOfMonth !== undefined || dayOfWeek !== undefined || startDate) {
      const baseDate = startDate ? new Date(startDate) : scheduledTransaction.startDate;
      nextExecutionDate = new Date(baseDate);
      
      switch (frequency || scheduledTransaction.frequency) {
        case 'daily':
          // For daily, next execution is the next day
          nextExecutionDate.setDate(nextExecutionDate.getDate() + 1);
          break;
        case 'weekly':
          // For weekly, use the specified day of week or add 7 days
          const dayOfWeekToUse = dayOfWeek !== undefined ? dayOfWeek : scheduledTransaction.dayOfWeek;
          if (dayOfWeekToUse !== undefined) {
            // Set to the next occurrence of the specified day of week
            const currentDay = nextExecutionDate.getDay();
            const daysToAdd = (dayOfWeekToUse - currentDay + 7) % 7;
            nextExecutionDate.setDate(nextExecutionDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
          } else {
            // If no specific day is set, just add 7 days
            nextExecutionDate.setDate(nextExecutionDate.getDate() + 7);
          }
          break;
        case 'monthly':
          // For monthly, use the specified day of month or same day next month
          const dayOfMonthToUse = dayOfMonth !== undefined ? dayOfMonth : scheduledTransaction.dayOfMonth;
          // Move to next month
          nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
          // Set the specified day of month
          if (dayOfMonthToUse) {
            nextExecutionDate.setDate(Math.min(dayOfMonthToUse, new Date(
              nextExecutionDate.getFullYear(),
              nextExecutionDate.getMonth() + 1,
              0
            ).getDate()));
          }
          break;
        case 'quarterly':
          // For quarterly, add 3 months
          nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 3);
          // If dayOfMonth is specified, adjust day
          const quarterlyDayOfMonth = dayOfMonth !== undefined ? dayOfMonth : scheduledTransaction.dayOfMonth;
          if (quarterlyDayOfMonth) {
            nextExecutionDate.setDate(Math.min(quarterlyDayOfMonth, new Date(
              nextExecutionDate.getFullYear(),
              nextExecutionDate.getMonth() + 1,
              0
            ).getDate()));
          }
          break;
        case 'yearly':
          // For yearly, add one year
          nextExecutionDate.setFullYear(nextExecutionDate.getFullYear() + 1);
          // If dayOfMonth is specified, adjust day
          const yearlyDayOfMonth = dayOfMonth !== undefined ? dayOfMonth : scheduledTransaction.dayOfMonth;
          if (yearlyDayOfMonth) {
            nextExecutionDate.setDate(Math.min(yearlyDayOfMonth, new Date(
              nextExecutionDate.getFullYear(),
              nextExecutionDate.getMonth() + 1,
              0
            ).getDate()));
          }
          break;
      }
    }
    
    // Update the scheduled transaction
    const updatedScheduledTransaction = await ScheduledTransaction.findByIdAndUpdate(
      id,
      {
        accountId: accountId || scheduledTransaction.accountId,
        categoryId: categoryId || scheduledTransaction.categoryId,
        amount: amount !== undefined ? amount : scheduledTransaction.amount,
        type: type || scheduledTransaction.type,
        description: description !== undefined ? description : scheduledTransaction.description,
        payee: payee !== undefined ? payee : scheduledTransaction.payee,
        tags: tags || scheduledTransaction.tags,
        frequency: frequency || scheduledTransaction.frequency,
        startDate: startDate ? new Date(startDate) : scheduledTransaction.startDate,
        endDate: endDate ? new Date(endDate) : scheduledTransaction.endDate,
        dayOfMonth: dayOfMonth !== undefined ? dayOfMonth : scheduledTransaction.dayOfMonth,
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : scheduledTransaction.dayOfWeek,
        autoExecute: autoExecute !== undefined ? autoExecute : scheduledTransaction.autoExecute,
        nextExecutionDate,
        status: status || scheduledTransaction.status
      },
      { new: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: { scheduledTransaction: updatedScheduledTransaction }
    });
  } catch (error) {
    logger.error(`Error updating scheduled transaction with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete a scheduled transaction
const deleteScheduledTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the scheduled transaction
    const scheduledTransaction = await ScheduledTransaction.findById(id);
    
    if (!scheduledTransaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Scheduled transaction not found'
      });
    }
    
    // Check if user has access to delete this scheduled transaction
    const userRoles = req.auth.realm_access?.roles;
    if (!userRoles.includes('admin') && scheduledTransaction.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete this scheduled transaction'
      });
    }
    
    await ScheduledTransaction.findByIdAndDelete(id);
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error(`Error deleting scheduled transaction with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Process due scheduled transactions - to be called by a cron job
const processDueTransactions = async (req, res, next) => {
  try {
    
    const now = new Date();
    // Get all active scheduled transactions that are due
    const dueTransactions = await ScheduledTransaction.find({
      status: 'active',
      nextExecutionDate: { $lte: now }
    });
    
    const results = {
      processed: 0,
      autoExecuted: 0,
      pendingApproval: 0,
      insufficientFunds: 0,
      errors: 0
    };
    
    const processedDetails = [];
    
    // Process each due transaction
    for (const scheduledTx of dueTransactions) {
      try {
        // Check if the transaction is set to auto execute
        if (scheduledTx.autoExecute) {
          // Get the associated account
          const account = await Account.findById(scheduledTx.accountId);
          
          if (!account) {
            results.errors++;
            processedDetails.push({
              scheduledTransactionId: scheduledTx._id,
              status: 'error',
              message: 'Account not found'
            });
            continue;
          }
          
          // Check if there are enough funds for expenses
          if (scheduledTx.type === 'expense' && account.balance < scheduledTx.amount) {
            // Insufficient funds - pause the scheduled transaction
            await ScheduledTransaction.findByIdAndUpdate(scheduledTx._id, {
              status: 'paused',
              lastExecutionDate: now
            });
            
            results.insufficientFunds++;
            processedDetails.push({
              scheduledTransactionId: scheduledTx._id,
              status: 'paused',
              message: 'Insufficient funds'
            });
            continue;
          }
            // Create the transaction without using transactions (compatible with standalone MongoDB)
          try {
            // Calculate the next execution date
            let nextExecutionDate = new Date(scheduledTx.nextExecutionDate);
            
            switch (scheduledTx.frequency) {
              case 'daily':
                nextExecutionDate.setDate(nextExecutionDate.getDate() + 1);
                break;
              case 'weekly':
                nextExecutionDate.setDate(nextExecutionDate.getDate() + 7);
                break;
              case 'monthly':
                nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
                // Adjust for month length
                if (scheduledTx.dayOfMonth) {
                  nextExecutionDate.setDate(Math.min(scheduledTx.dayOfMonth, new Date(
                    nextExecutionDate.getFullYear(),
                    nextExecutionDate.getMonth() + 1,
                    0
                  ).getDate()));
                }
                break;
              case 'quarterly':
                nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 3);
                // Adjust for month length
                if (scheduledTx.dayOfMonth) {
                  nextExecutionDate.setDate(Math.min(scheduledTx.dayOfMonth, new Date(
                    nextExecutionDate.getFullYear(),
                    nextExecutionDate.getMonth() + 1,
                    0
                  ).getDate()));
                }
                break;
              case 'yearly':
                nextExecutionDate.setFullYear(nextExecutionDate.getFullYear() + 1);
                // Adjust for month length
                if (scheduledTx.dayOfMonth) {
                  nextExecutionDate.setDate(Math.min(scheduledTx.dayOfMonth, new Date(
                    nextExecutionDate.getFullYear(),
                    nextExecutionDate.getMonth() + 1,
                    0
                  ).getDate()));
                }
                break;
            }
            
            // Check if this scheduled transaction has reached its end date
            let status = 'active';
            if (scheduledTx.endDate && nextExecutionDate > scheduledTx.endDate) {
              status = 'completed';
            }
            
            // Step 1: Create the actual transaction
            const transaction = await Transaction.create({
              userId: scheduledTx.userId,
              accountId: scheduledTx.accountId,
              categoryId: scheduledTx.categoryId,
              amount: scheduledTx.amount,
              type: scheduledTx.type,
              description: scheduledTx.description,
              payee: scheduledTx.payee,
              tags: scheduledTx.tags,
              date: now,
              scheduledTransactionId: scheduledTx._id
            });
            
            // Step 2: Update account balance
            let balanceUpdate = {};
            if (scheduledTx.type === 'income') {
              balanceUpdate = { $inc: { balance: scheduledTx.amount } };
            } else if (scheduledTx.type === 'expense') {
              balanceUpdate = { $inc: { balance: -scheduledTx.amount } };
            }
            
            if (Object.keys(balanceUpdate).length > 0) {
              await Account.findByIdAndUpdate(
                scheduledTx.accountId,
                balanceUpdate
              );
            }
            
            // Step 3: Update the scheduled transaction
            await ScheduledTransaction.findByIdAndUpdate(
              scheduledTx._id,
              {
                nextExecutionDate,
                lastExecutionDate: now,
                status
              }
            );
            
            results.autoExecuted++;
            processedDetails.push({
              scheduledTransactionId: scheduledTx._id,
              transactionId: transaction._id,
              status: 'auto-executed',
              nextExecutionDate
            });
          } catch (error) {
            // If any error occurs, log it and continue processing other transactions
            logger.error(`Error during transaction execution for scheduled transaction ${scheduledTx._id}:`, error);
            results.errors++;
            processedDetails.push({
              scheduledTransactionId: scheduledTx._id,
              status: 'error',
              message: `Error during transaction execution: ${error.message}`
            });
          }        } else {
          // Not auto-execute - just update the next execution date
          // Calculate the next execution date
          let nextExecutionDate = new Date(scheduledTx.nextExecutionDate);
          
          switch (scheduledTx.frequency) {
            case 'daily':
              nextExecutionDate.setDate(nextExecutionDate.getDate() + 1);
              break;
            case 'weekly':
              nextExecutionDate.setDate(nextExecutionDate.getDate() + 7);
              break;
            case 'monthly':
              nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
              // Adjust for month length
              if (scheduledTx.dayOfMonth) {
                nextExecutionDate.setDate(Math.min(scheduledTx.dayOfMonth, new Date(
                  nextExecutionDate.getFullYear(),
                  nextExecutionDate.getMonth() + 1,
                  0
                ).getDate()));
              }
              break;
            case 'quarterly':
              nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 3);
              // Adjust for month length
              if (scheduledTx.dayOfMonth) {
                nextExecutionDate.setDate(Math.min(scheduledTx.dayOfMonth, new Date(
                  nextExecutionDate.getFullYear(),
                  nextExecutionDate.getMonth() + 1,
                  0
                ).getDate()));
              }
              break;
            case 'yearly':
              nextExecutionDate.setFullYear(nextExecutionDate.getFullYear() + 1);
              // Adjust for month length
              if (scheduledTx.dayOfMonth) {
                nextExecutionDate.setDate(Math.min(scheduledTx.dayOfMonth, new Date(
                  nextExecutionDate.getFullYear(),
                  nextExecutionDate.getMonth() + 1,
                  0
                ).getDate()));
              }
              break;
          }
          
          // Check if this scheduled transaction has reached its end date
          let status = 'active';
          if (scheduledTx.endDate && nextExecutionDate > scheduledTx.endDate) {
            status = 'completed';
          }
          
          // Update the scheduled transaction with the new next execution date
          await ScheduledTransaction.findByIdAndUpdate(
            scheduledTx._id,
            {
              nextExecutionDate,
              lastExecutionDate: now,
              status
            }
          );
          
          results.pendingApproval++;
          processedDetails.push({
            scheduledTransactionId: scheduledTx._id,
            status: 'pending-approval',
            nextExecutionDate,
            message: 'Transaction ready for approval'
          });
        }
        
        results.processed++;
      } catch (error) {
        logger.error(`Error processing scheduled transaction ${scheduledTx._id}:`, error);
        results.errors++;
        processedDetails.push({
          scheduledTransactionId: scheduledTx._id,
          status: 'error',
          message: error.message
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        results,
        processedDetails
      }
    });
  } catch (error) {
    logger.error('Error processing due transactions:', error);
    next(error);
  }
};

// Get upcoming scheduled transactions (for notifications and dashboard)
const getUpcomingTransactions = async (req, res, next) => {
  try {
    const userRoles = req.auth.realm_access?.roles
    const userId = userRoles.includes('admin') && req.query.userId
      ? req.query.userId
      : req.auth.sub;
    
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3); // 3 days from now
    
    // Get active scheduled transactions that are due within the next 3 days
    const upcomingTransactions = await ScheduledTransaction.find({
      userId,
      status: 'active',
      nextExecutionDate: { $gte: now, $lte: threeDaysFromNow }
    }).sort('nextExecutionDate');
    
    // Get transactions with insufficient funds (paused)
    const insufficientFundsTransactions = await ScheduledTransaction.find({
      userId,
      status: 'paused'
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        upcomingTransactions,
        insufficientFundsTransactions
      }
    });
  } catch (error) {
    logger.error('Error fetching upcoming transactions:', error);
    next(error);
  }
};

module.exports = {
  getAllScheduledTransactions,
  createScheduledTransaction,
  getScheduledTransactionById,
  updateScheduledTransaction,
  deleteScheduledTransaction,
  processDueTransactions,
  getUpcomingTransactions
};