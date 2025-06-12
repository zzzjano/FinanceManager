const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Account'
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String
  },
  payee: {
    type: String
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for query optimization
// One index for userId and date to optimize queries by user and date
// One index for accountId and date to optimize queries by account and date
// One index for categoryId and date to optimize queries by category and date
// One index for userId, type, and date to optimize queries by user, type, and date
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ accountId: 1, date: -1 });
transactionSchema.index({ categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
