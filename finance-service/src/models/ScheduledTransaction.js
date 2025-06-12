const mongoose = require('mongoose');

const scheduledTransactionSchema = new mongoose.Schema({
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
  baseTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    description: 'Reference to the original transaction that this schedule is based on'
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
  description: {
    type: String
  },
  payee: {
    type: String
  },
  tags: [{
    type: String
  }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true,
    default: 'monthly'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  nextExecutionDate: {
    type: Date,
    required: true,
    index: true
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
    description: 'For monthly schedules, the day of month when the transaction should occur'
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    description: 'For weekly schedules, the day of week when the transaction should occur (0 = Sunday)'
  },
  autoExecute: {
    type: Boolean,
    default: false,
    description: 'Whether the transaction should be executed automatically'
  },
  lastExecutionDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
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
// One index for userId and nextExecutionDate to quickly retrieve upcoming scheduled transactions
// One index for accountId and status to quickly find active scheduled transactions for an account
scheduledTransactionSchema.index({ userId: 1, nextExecutionDate: 1, status: 1 });
scheduledTransactionSchema.index({ accountId: 1, status: 1 });

const ScheduledTransaction = mongoose.model('ScheduledTransaction', scheduledTransactionSchema);

module.exports = ScheduledTransaction;
