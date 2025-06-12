const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['budgetWarning', 'budgetExceeded', 'categoryWarning', 'categoryExceeded', 'system']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedModel'
  },
  relatedModel: {
    type: String,
    enum: ['Budget', 'Transaction', 'Account', 'Category']
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'danger'],
    default: 'info'
  }
}, { timestamps: true });

// Create indexes for better query performance
// Index for userId and createdAt to quickly retrieve notifications for a user
// Index for userId and isRead to filter read/unread notifications
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
