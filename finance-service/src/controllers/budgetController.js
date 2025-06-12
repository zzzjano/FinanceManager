// filepath: c:\Users\milew\Documents\FinanceManager\finance-service\src\controllers\budgetController.js
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');

// Get all budgets for the authenticated user
const getAllBudgets = async (req, res, next) => {
  try {
    // Build filter object based on query parameters
    const userRoles = req.auth.realm_access?.roles

    const filter = userRoles.includes('admin') && req.query.userId
      ? { userId: req.query.userId }
      : { userId: req.auth.sub };
    
    // Add status filter if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Add date filters if provided
    if (req.query.date) {
      const date = new Date(req.query.date);
      filter.startDate = { $lte: date };
      filter.endDate = { $gte: date };
    }
    
    // Add type filter if provided
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;
    
    // Sorting
    const sort = req.query.sort || '-createdAt';
    
    const budgets = await Budget.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v');
    
    const totalCount = await Budget.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      results: budgets.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      data: { budgets }
    });
  } catch (error) {
    logger.error('Error fetching budgets:', error);
    next(error);
  }
};

// Get a budget by ID
const getBudgetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id).select('-__v');

    if (!budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    const userRoles = req.auth.realm_access?.roles || [];
    
    // Check if user has access to this budget
    if (!userRoles.includes('admin') && budget.userId !== req.auth.sub) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found or you do not have permission to access it'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { budget }
    });
  } catch (error) {
    logger.error(`Error fetching budget with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Create a new budget
const createBudget = async (req, res, next) => {
  try {
    const { 
      name,
      description, 
      type, 
      startDate,
      endDate,
      categories,
      notificationThreshold,
      categoryId, // Support for single category budget
      amount      // Amount for single category budget
    } = req.body;

    const userRoles = req.auth.realm_access?.roles
    
    // Set userId based on current user (or specified user if admin)
    const userId = userRoles.includes('admin') && req.body.userId
      ? req.body.userId
      : req.auth.sub;
    
    // Handle case where client provides a single categoryId and amount instead of categories array
    if (categoryId && amount !== undefined) {
      // Find the category to verify it exists and belongs to the user
      const foundCategory = await Category.findOne({
        _id: categoryId,
        userId,
        type: 'expense'
      });
      
      if (!foundCategory) {
        return res.status(404).json({
          status: 'fail',
          message: 'Category not found or does not belong to the user'
        });
      }
      
      // Create enriched category entry
      const categoryEntry = {
        categoryId,
        categoryName: foundCategory.name,
        limit: parseFloat(amount),
        spent: 0
      };
      
      // Create the new budget with the single category
      const newBudget = await Budget.create({
        userId,
        name,
        description,
        type,
        startDate,
        endDate,
        categories: [categoryEntry],
        totalLimit: parseFloat(amount),
        totalSpent: 0,
        isActive: true,
        notificationThreshold: notificationThreshold || req.body.warningThreshold || 80
      });
      
      res.status(201).json({
        status: 'success',
        data: { budget: newBudget }
      });
    }
    // Handle case with categories array
    else if (categories && categories.length > 0) {
      const categoryIds = categories.map(cat => cat.categoryId);
      
      // Find all matching categories
      const foundCategories = await Category.find({
        _id: { $in: categoryIds },
        userId,
        type: 'expense'
      });
      
      // Verify all categories were found
      if (foundCategories.length !== categoryIds.length) {
        return res.status(404).json({
          status: 'fail',
          message: 'One or more categories not found or do not belong to the user'
        });
      }
      
      // Add category names to the budget entries
      const enrichedCategories = categories.map(cat => {
        const foundCategory = foundCategories.find(fc => 
          fc._id.toString() === cat.categoryId.toString());
        return {
          ...cat,
          categoryName: foundCategory.name
        };
      });
      
      // Calculate total limit based on categories
      const totalLimit = enrichedCategories.reduce(
        (sum, cat) => sum + cat.limit, 0
      );
      
      // Create the new budget with enriched categories and total
      const newBudget = await Budget.create({
        userId,
        name,
        description,
        type,
        startDate,
        endDate,
        categories: enrichedCategories,
        totalLimit,
        totalSpent: 0,
        isActive: true,
        notificationThreshold
      });
      
      res.status(201).json({
        status: 'success',
        data: { budget: newBudget }
      });
    } 
    else {
      // Create a budget without category limits (just total limit)
      const newBudget = await Budget.create({
        userId,
        name,
        description,
        type,
        startDate,
        endDate,
        categories: [],
        totalLimit: req.body.totalLimit || 0,
        totalSpent: 0,
        isActive: true,
        notificationThreshold: notificationThreshold || req.body.warningThreshold || 80
      });
      
      res.status(201).json({
        status: 'success',
        data: { budget: newBudget }
      });
    }
  } catch (error) {
    logger.error('Error creating budget:', error);
    next(error);
  }
};

// Update a budget
const updateBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id);

    if (!budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    const userRoles = req.auth.realm_access?.roles || [];

    // Check if user has access to update this budget
    if (!userRoles.includes('admin') && budget.userId !== req.auth.sub) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found or you do not have permission to update it'
      });
    }
    
    // Update allowed fields
    const { 
      name,
      description, 
      type, 
      startDate,
      endDate,
      categories,
      notificationThreshold,
      isActive
    } = req.body;
    
    // Handle category updates if provided
    if (categories && categories.length > 0) {
      const categoryIds = categories.map(cat => cat.categoryId);
      
      // Find all matching categories
      const foundCategories = await Category.find({
        _id: { $in: categoryIds },
        userId: budget.userId,
        type: 'expense'
      });
      
      // Verify all categories were found
      if (foundCategories.length !== categoryIds.length) {
        return res.status(404).json({
          status: 'fail',
          message: 'One or more categories not found or do not belong to the user'
        });
      }
      
      // Add category names to the budget entries
      const enrichedCategories = categories.map(cat => {
        const foundCategory = foundCategories.find(fc => 
          fc._id.toString() === cat.categoryId.toString());
        
        const existingCategory = budget.categories.find(bc => 
          bc.categoryId.toString() === cat.categoryId.toString());
        
        return {
          categoryId: cat.categoryId,
          categoryName: foundCategory.name,
          limit: cat.limit,
          spent: existingCategory ? existingCategory.spent : 0
        };
      });
      
      // Calculate total limit and retain existing spent values
      const totalLimit = enrichedCategories.reduce(
        (sum, cat) => sum + cat.limit, 0
      );
      
      budget.categories = enrichedCategories;
      budget.totalLimit = totalLimit;
    }
    
    // Update other fields if provided
    if (name) budget.name = name;
    if (description) budget.description = description;
    if (type) budget.type = type;
    if (startDate) budget.startDate = startDate;
    if (endDate) budget.endDate = endDate;
    if (notificationThreshold !== undefined) budget.notificationThreshold = notificationThreshold;
    if (isActive !== undefined) budget.isActive = isActive;
    if (req.body.totalLimit !== undefined && (!categories || categories.length === 0)) {
      budget.totalLimit = req.body.totalLimit;
    }
    
    await budget.save();
    
    res.status(200).json({
      status: 'success',
      data: { budget }
    });
  } catch (error) {
    logger.error(`Error updating budget with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete a budget
const deleteBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id);

    if (!budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    const userRoles = req.auth.realm_access?.roles || [];

    // Check if user has access to delete this budget
    if (!userRoles.includes('admin') && budget.userId !== req.auth.sub) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found or you do not have permission to delete it'
      });
    }
    
    await Budget.findByIdAndDelete(id);
    
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting budget with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Get budget progress
const getBudgetProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id);

    if (!budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found'
      });
    }

    const userRoles = req.auth.realm_access?.roles || [];

    // Check if user has access to this budget's progress
    if (!userRoles.includes('admin') && budget.userId !== req.auth.sub) {
      return res.status(404).json({
        status: 'fail',
        message: 'Budget not found or you do not have permission to access its progress'
      });
    }
    
    // Calculate current spend for this budget period
    const transactions = await Transaction.find({
      userId: budget.userId,
      type: 'expense',
      date: { $gte: budget.startDate, $lte: budget.endDate }
    });
    
    // Reset spent values
    budget.totalSpent = 0;
    budget.categories.forEach(cat => {
      cat.spent = 0;
    });
    
    // Recalculate spent amounts
    transactions.forEach(transaction => {
      budget.totalSpent += transaction.amount;
      
      // Update category spent if it exists in this budget
      const category = budget.categories.find(cat => 
        cat.categoryId.toString() === transaction.categoryId?.toString());
      
      if (category) {
        category.spent += transaction.amount;
      }
    });
    
    await budget.save();
    
    // Prepare the response with additional progress data
    const response = {
      budget: budget.toObject(),
      categoryProgress: budget.categories.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        limit: cat.limit,
        spent: cat.spent,
        remaining: Math.max(0, cat.limit - cat.spent),
        percentage: cat.limit > 0 ? Math.min(100, Math.round((cat.spent / cat.limit) * 100)) : 0
      })),
      totalProgress: {
        limit: budget.totalLimit,
        spent: budget.totalSpent,
        remaining: Math.max(0, budget.totalLimit - budget.totalSpent),
        percentage: budget.totalLimit > 0 ? Math.min(100, Math.round((budget.totalSpent / budget.totalLimit) * 100)) : 0
      },
      alerts: []
    };
    
    // Add alerts for categories that have exceeded or are near their limits
    response.categoryProgress.forEach(cat => {
      if (cat.percentage >= 100) {
        response.alerts.push({
          type: 'error',
          message: `Budget limit exceeded for category ${cat.categoryName}`
        });
      } else if (cat.percentage >= budget.notificationThreshold) {
        response.alerts.push({
          type: 'warning',
          message: `Budget for ${cat.categoryName} is at ${cat.percentage}% of limit`
        });
      }
    });
      // Add total budget alert
    if (response.totalProgress.percentage >= 100) {
      response.alerts.push({
        type: 'error',
        message: `Total budget limit exceeded`
      });
    } else if (response.totalProgress.percentage >= budget.notificationThreshold) {
      response.alerts.push({
        type: 'warning',
        message: `Total budget is at ${response.totalProgress.percentage}% of limit`
      });
    }
    
    // Generate notifications from the alerts if they don't already exist
    if (response.alerts.length > 0) {
      const notificationController = require('./notificationController');
      
      // Map the response alerts to budget alert format for notification creation
      const budgetAlerts = response.alerts.map(alert => {
        // Figure out if this is a category alert or total budget alert
        const isCategoryAlert = alert.message.includes('category');
        
        // Extract category info if it's a category alert
        let categoryName = null;
        if (isCategoryAlert) {
          const categoryProgress = response.categoryProgress.find(
            cat => alert.message.includes(cat.categoryName)
          );
          if (categoryProgress) {
            return {
              budgetId: budget._id,
              budgetName: budget.name,
              type: 'category',
              categoryName: categoryProgress.categoryName,
              limit: categoryProgress.limit,
              spent: categoryProgress.spent,
              message: alert.message
            };
          }
        } else {
          // It's a total budget alert
          return {
            budgetId: budget._id,
            budgetName: budget.name,
            type: 'total',
            limit: response.totalProgress.limit,
            spent: response.totalProgress.spent,
            message: alert.message
          };
        }
      }).filter(alert => alert); // Filter out any undefined entries
      
      // Create notifications for the alerts
      await notificationController.createBudgetNotifications(budgetAlerts, budget.userId);
    }
    
    res.status(200).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    logger.error(`Error getting budget progress for ID ${req.params.id}:`, error);
    next(error);
  }
};

// Get active budgets that a transaction might affect
const getActiveBudgetsForTransaction = async (userId, date, categoryId) => {
  try {
    const filter = {
      userId,
      isActive: true,
      startDate: { $lte: date },
      endDate: { $gte: date }
    };
    
    const budgets = await Budget.find(filter);
    
    // If category provided, filter to only include budgets that have this category
    // or have no specific categories (just a total budget)
    if (categoryId) {
      return budgets.filter(budget => 
        budget.categories.length === 0 || 
        budget.categories.some(cat => cat.categoryId.toString() === categoryId.toString())
      );
    }
    
    return budgets;
  } catch (error) {
    logger.error(`Error getting active budgets for transaction:`, error);
    throw error;
  }
};

// Check and update budgets when a new transaction is created
const updateBudgetsForTransaction = async (transaction) => {
  try {
    // Only process expense transactions
    if (transaction.type !== 'expense') return null;
    
    const { userId, amount, date, categoryId } = transaction;
    
    // Find all active budgets that this transaction affects
    const affectedBudgets = await getActiveBudgetsForTransaction(userId, date, categoryId);
    
    if (!affectedBudgets || affectedBudgets.length === 0) return null;
    
    const budgetAlerts = [];
    
    // Update each affected budget
    for (const budget of affectedBudgets) {
      // Update total spent
      budget.totalSpent += amount;
      
      // Find the specific category in the budget if it exists
      const budgetCategory = categoryId ? 
        budget.categories.find(cat => cat.categoryId.toString() === categoryId.toString()) : 
        null;
      
      // Update category spent if it exists in this budget
      if (budgetCategory) {
        budgetCategory.spent += amount;
        
        // Check if category limit exceeded
        if (budgetCategory.spent >= budgetCategory.limit) {
          budgetAlerts.push({
            budgetId: budget._id,
            budgetName: budget.name,
            type: 'category',
            categoryName: budgetCategory.categoryName,
            limit: budgetCategory.limit,
            spent: budgetCategory.spent,
            message: `Category "${budgetCategory.categoryName}" in budget "${budget.name}" has exceeded its limit of ${budgetCategory.limit}`
          });
        } else if ((budgetCategory.spent / budgetCategory.limit * 100) >= budget.notificationThreshold) {
          budgetAlerts.push({
            budgetId: budget._id,
            budgetName: budget.name,
            type: 'category',
            categoryName: budgetCategory.categoryName,
            limit: budgetCategory.limit,
            spent: budgetCategory.spent,
            message: `Category "${budgetCategory.categoryName}" in budget "${budget.name}" has reached ${Math.round(budgetCategory.spent / budgetCategory.limit * 100)}% of its limit`
          });
        }
      }
      
      // Check if total budget limit exceeded
      if (budget.totalLimit > 0) {
        if (budget.totalSpent >= budget.totalLimit) {
          budgetAlerts.push({
            budgetId: budget._id,
            budgetName: budget.name,
            type: 'total',
            limit: budget.totalLimit,
            spent: budget.totalSpent,
            message: `Total budget "${budget.name}" has exceeded its limit of ${budget.totalLimit}`
          });
        } else if ((budget.totalSpent / budget.totalLimit * 100) >= budget.notificationThreshold) {
          budgetAlerts.push({
            budgetId: budget._id,
            budgetName: budget.name,
            type: 'total',
            limit: budget.totalLimit,
            spent: budget.totalSpent,
            message: `Total budget "${budget.name}" has reached ${Math.round(budget.totalSpent / budget.totalLimit * 100)}% of its limit`
          });
        }
      }
      
      await budget.save();
    }
    
    return budgetAlerts.length > 0 ? budgetAlerts : null;
  } catch (error) {
    logger.error(`Error updating budgets for transaction:`, error);
    return null;
  }
};

module.exports = {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetProgress,
  getActiveBudgetsForTransaction,
  updateBudgetsForTransaction
};