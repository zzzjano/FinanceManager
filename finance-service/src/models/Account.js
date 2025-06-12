const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'CASH', 'OTHER'],
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'PLN'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: String,
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
// One index for userId and name to ensure unique account names per user
// One index for userId and type to optimize queries by account type
accountSchema.index({ userId: 1, name: 1 }, { unique: true });
accountSchema.index({ userId: 1, type: 1 });

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
