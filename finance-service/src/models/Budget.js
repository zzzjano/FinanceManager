// filepath: c:\Users\milew\Documents\FinanceManager\finance-service\src\models\Budget.js
const mongoose = require('mongoose');

const budgetCategorySchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  categoryName: {
    type: String,
  },
  limit: {
    type: Number,
    required: true,
    min: 0
  },
  spent: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const budgetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['weekly', 'monthly', 'custom'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  categories: [budgetCategorySchema],
  totalLimit: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notificationThreshold: {
    type: Number,
    default: 80,  // Default notify at 80% of budget
    min: 0,
    max: 100
  }
}, { timestamps: true });

// Indexes for query optimization
// Index for userId and startDate to quickly find budgets for a user within a date range
// Index for userId and isActive to quickly find active budgets
budgetSchema.index({ userId: 1, startDate: 1, endDate: 1 });
budgetSchema.index({ userId: 1, isActive: 1 });

// Virtual field to calculate progress percentage
budgetSchema.virtual('progress').get(function() {
  if (this.totalLimit === 0) return 0;
  return Math.min(100, Math.round((this.totalSpent / this.totalLimit) * 100));
});

// Method to update budget spending when a transaction is created
budgetSchema.methods.updateSpending = function(categoryId, amount) {
  const category = this.categories.find(cat => 
    cat.categoryId.toString() === categoryId.toString());
  
  if (category) {
    category.spent += amount;
    this.totalSpent += amount;
  } else {
    this.totalSpent += amount;
  }
  
  return this.save();
};

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;