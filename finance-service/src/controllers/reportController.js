const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');

// Helper function to generate transactions data (adapted from original exportData)
async function _generateTransactionsExportData(userId, type, startDate, endDate) {
  const matchCriteria = { userId };
  if (startDate && endDate) {
    matchCriteria.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  if (type) {
    matchCriteria.type = type;
  }

  const transactions = await Transaction.aggregate([
    { $match: matchCriteria },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'accounts',
        localField: 'accountId',
        foreignField: '_id',
        as: 'account'
      }
    },
    { $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        date: 1,
        description: 1,
        amount: 1,
        type: 1,
        categoryName: '$category.name',
        accountName: '$account.name',
        payee: 1,
        notes: 1,
        tags: 1,
        createdAt: 1
      }
    },
    { $sort: { date: -1 } }
  ]);

  return {
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    type,
    count: transactions.length,
    transactions
  };
}

// Helper function to generate periodic report data (adapted from getPeriodicReport)
async function _generatePeriodicReportData(userId, period, queryStartDate, queryEndDate) {
  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period)) {
    throw new Error(`Invalid period. Allowed values: ${validPeriods.join(', ')}`);
  }

  let start, end;
  if (queryStartDate && queryEndDate) {
    start = new Date(queryStartDate);
    end = new Date(queryEndDate);
  } else {
    const now = new Date();
    if (period === 'day') {
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(new Date().setHours(23, 59, 59, 999)); // Use new Date() for end to avoid modifying start's date part
    } else if (period === 'week') {
      const currentDay = now.getDay();
      const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
  }

  let groupBy;
  let dateFormat;
  if (period === 'day') {
    groupBy = { year: { $year: "$date" }, month: { $month: "$date" }, day: { $dayOfMonth: "$date" }, hour: { $hour: "$date" } };
    dateFormat = "%Y-%m-%d %H:00";
  } else if (period === 'week' || period === 'month') {
    groupBy = { year: { $year: "$date" }, month: { $month: "$date" }, day: { $dayOfMonth: "$date" } };
    dateFormat = "%Y-%m-%d";
  } else if (period === 'year') {
    groupBy = { year: { $year: "$date" }, month: { $month: "$date" } };
    dateFormat = "%Y-%m";
  }

  const periodicReport = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: { date: groupBy, type: "$type" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    {
      $group: {
        _id: "$_id.date",
        incomes: { $push: { $cond: [{ $eq: ["$_id.type", "income"] }, { total: "$total", count: "$count" }, null] } },
        expenses: { $push: { $cond: [{ $eq: ["$_id.type", "expense"] }, { total: "$total", count: "$count" }, null] } }
      }
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        dateFormatted: { $dateToString: { format: dateFormat, date: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: { $ifNull: ["$_id.day", 1] }, hour: { $ifNull: ["$_id.hour", 0] } } } } },
        income: { total: { $sum: { $map: { input: "$incomes", as: "i", in: { $ifNull: ["$$i.total", 0] } } } }, count: { $sum: { $map: { input: "$incomes", as: "i", in: { $ifNull: ["$$i.count", 0] } } } } },
        expense: { total: { $sum: { $map: { input: "$expenses", as: "i", in: { $ifNull: ["$$i.total", 0] } } } }, count: { $sum: { $map: { input: "$expenses", as: "i", in: { $ifNull: ["$$i.count", 0] } } } } }
      }
    },
    { $project: { date: 1, dateFormatted: 1, income: 1, expense: 1, balance: { $subtract: ["$income.total", "$expense.total"] } } },
    { $sort: { "date.year": 1, "date.month": 1, "date.day": 1, "date.hour": 1 } }
  ]);
  return { period, startDate: start, endDate: end, report: periodicReport };
}

// Helper function to generate trends data (adapted from getTrends)
async function _generateTrendsData(userId, months = 12, queryStartDate, queryEndDate) {
  let start, end;
  if (queryStartDate && queryEndDate) {
    start = new Date(queryStartDate);
    end = new Date(queryEndDate);
  } else {
    // Calculate date range (default to last X months)
    // end.setDate(end.getDate() + 1); // Include today // Old logic
    end.setHours(23, 59, 59, 999); // Set to end of current day
    
    start.setMonth(start.getMonth() - parseInt(months));
    start.setDate(1); // Start from the beginning of the month
    start.setHours(0,0,0,0); // Set to the beginning of the day
  }

  const trends = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$type", categoryId: "$categoryId" }, total: { $sum: "$amount" } } },
    { $lookup: { from: 'categories', localField: '_id.categoryId', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { year: "$_id.year", month: "$_id.month", type: "$_id.type" }, categories: { $push: { categoryId: "$_id.categoryId", categoryName: "$category.name", total: "$total" } }, totalAmount: { $sum: "$total" } } },
    { $group: { _id: { year: "$_id.year", month: "$_id.month" }, data: { $push: { type: "$_id.type", categories: "$categories", total: "$totalAmount" } } } },
    { $project: { _id: 0, date: "$_id", period: { $dateToString: { format: "%Y-%m", date: { $dateFromParts: { year: "$_id.year", month: "$_id.month" } } } }, data: 1 } },
    { $sort: { "date.year": 1, "date.month": 1 } }
  ]);
  return { months: parseInt(months), startDate: start, endDate: end, trends };
}

// Helper function to generate category distribution data (adapted from getCategoryDistribution)
async function _generateCategoryDistributionData(userId, type = 'expense', startDate, endDate) {
  if (!['income', 'expense'].includes(type)) {
    throw new Error('Invalid type. Allowed values: income, expense');
  }
  const matchCriteria = { userId, type };
  if (startDate && endDate) {
    matchCriteria.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const distribution = await Transaction.aggregate([
    { $match: matchCriteria },
    { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, categoryId: '$_id', name: '$category.name', color: '$category.color', icon: '$category.icon', total: 1, count: 1 } },
    { $sort: { total: -1 } }
  ]);
  const grandTotal = distribution.reduce((sum, item) => sum + item.total, 0);
  const distributionWithPercentage = distribution.map(item => ({ ...item, percentage: grandTotal > 0 ? parseFloat((item.total / grandTotal * 100).toFixed(2)) : 0 }));
  
  return {
    type,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    grandTotal,
    distribution: distributionWithPercentage
  };
}

const getPeriodicReport = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    // Set userId based on current user (or specified user if admin)

    const userRoles = req.auth.realm_access?.roles

    const userId = userRoles.includes('admin') && req.query.userId
      ? req.query.userId
      : req.auth.sub;
    
    // Validate period (day, week, month, year)
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid period. Allowed values: ${validPeriods.join(', ')}`
      });
    }
    
    // Calculate date range if not provided
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to current period if dates not specified
      const now = new Date();
      
      if (period === 'day') {
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
      } else if (period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
    }
    
    // Group by the appropriate time units
    let groupBy;
    let dateFormat;
    
    if (period === 'day') {
      groupBy = {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" },
        hour: { $hour: "$date" }
      };
      dateFormat = "%Y-%m-%d %H:00";
    } else if (period === 'week') {
      groupBy = {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" }
      };
      dateFormat = "%Y-%m-%d";
    } else if (period === 'month') {
      groupBy = {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" }
      };
      dateFormat = "%Y-%m-%d";
    } else if (period === 'year') {
      groupBy = {
        year: { $year: "$date" },
        month: { $month: "$date" }
      };
      dateFormat = "%Y-%m";
    }

    // Aggregation pipeline for periodic summary
    const periodicReport = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            date: groupBy,
            type: "$type"
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          incomes: {
            $push: {
              $cond: [
                { $eq: ["$_id.type", "income"] },
                { total: "$total", count: "$count" },
                null
              ]
            }
          },
          expenses: {
            $push: {
              $cond: [
                { $eq: ["$_id.type", "expense"] },
                { total: "$total", count: "$count" },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          dateFormatted: {
            $dateToString: { format: dateFormat, date: {
              $dateFromParts: {
                year: "$_id.year",
                month: "$_id.month",
                day: { $ifNull: ["$_id.day", 1] },
                hour: { $ifNull: ["$_id.hour", 0] }
              }
            }}
          },
          income: {
            total: { $sum: { $map: { input: "$incomes", as: "i", in: { $ifNull: ["$$i.total", 0] } } } },
            count: { $sum: { $map: { input: "$incomes", as: "i", in: { $ifNull: ["$$i.count", 0] } } } }
          },
          expense: {
            total: { $sum: { $map: { input: "$expenses", as: "i", in: { $ifNull: ["$$i.total", 0] } } } },
            count: { $sum: { $map: { input: "$expenses", as: "i", in: { $ifNull: ["$$i.count", 0] } } } }
          }
        }
      },
      {
        $project: {
          date: 1,
          dateFormatted: 1,
          income: 1,
          expense: 1,
          balance: { 
            $subtract: ["$income.total", "$expense.total"] 
          }
        }
      },
      {
        $sort: { "date.year": 1, "date.month": 1, "date.day": 1, "date.hour": 1 }
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        period,
        startDate: start,
        endDate: end,
        report: periodicReport
      }
    });
  } catch (error) {
    logger.error('Error generating periodic report:', error);
    next(error);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    
    // Set userId based on current user (or specified user if admin)
    const userRoles = req.auth.realm_access?.roles

    const userId = userRoles.includes('admin') && req.query.userId
      ? req.query.userId
      : req.auth.sub;
    
    // Calculate date range (default to last X months)
    const end = new Date();
    // end.setDate(end.getDate() + 1); // Include today // Old logic
    end.setHours(23, 59, 59, 999); // Set to end of current day
    
    const start = new Date();
    start.setMonth(start.getMonth() - parseInt(months));
    start.setDate(1); // Start from the beginning of the month
    start.setHours(0,0,0,0); // Set to the beginning of the day
    
    // Aggregation pipeline for trends
    const trends = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
            categoryId: "$categoryId"
          },
          total: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month",
            type: "$_id.type"
          },
          categories: {
            $push: {
              categoryId: "$_id.categoryId",
              categoryName: "$category.name", 
              total: "$total"
            }
          },
          totalAmount: { $sum: "$total" }
        }
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month"
          },
          data: {
            $push: {
              type: "$_id.type",
              categories: "$categories",
              total: "$totalAmount"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          period: { 
            $dateToString: { 
              format: "%Y-%m", 
              date: { 
                $dateFromParts: { 
                  year: "$_id.year", 
                  month: "$_id.month" 
                } 
              } 
            } 
          },
          data: 1
        }
      },
      {
        $sort: { "date.year": 1, "date.month": 1 }
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        months: parseInt(months),
        startDate: start,
        endDate: end,
        trends
      }
    });
  } catch (error) {
    logger.error('Error generating trends report:', error);
    next(error);
  }
};

const exportData = async (req, res, next) => {
  try {
    const { 
      format = 'json', 
      reportType = 'transactions', // Default to 'transactions'
      startDate, 
      endDate,
      period = 'month', // Default for periodic report
      months = 12,     // Default for trends report
      type             // For transactions and category (e.g., 'income', 'expense')
    } = req.query;
    
    const userRoles = req.auth.realm_access?.roles;
    const userId = userRoles.includes('admin') && req.query.userId
      ? req.query.userId
      : req.auth.sub;
    
    // Validate format
    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid format. Allowed values: ${validFormats.join(', ')}`
      });
    }

    // Validate reportType
    const validReportTypes = ['transactions', 'periodic', 'trends', 'category'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid reportType. Allowed values: ${validReportTypes.join(', ')}`
      });
    }
    
    let exportableData;
    let responseData;
    let warningMessage = null;

    switch (reportType) {
      case 'transactions':
        responseData = await _generateTransactionsExportData(userId, type, startDate, endDate);
        exportableData = responseData.transactions; // For CSV
        break;
      case 'periodic':
        responseData = await _generatePeriodicReportData(userId, period, startDate, endDate);
        exportableData = responseData.report; // For potential future CSV
        break;
      case 'trends':
        responseData = await _generateTrendsData(userId, months, startDate, endDate);
        exportableData = responseData.trends; // For potential future CSV
        break;
      case 'category':
        // 'type' for category distribution defaults to 'expense' in helper if not provided
        responseData = await _generateCategoryDistributionData(userId, type || 'expense', startDate, endDate);
        exportableData = responseData.distribution; // For potential future CSV
        break;
      default:
        // Should be caught by validation above, but as a fallback
        return res.status(400).json({ status: 'error', message: 'Invalid report type specified.' });
    }
    
    if (format.toLowerCase() === 'csv') {
      if (reportType === 'transactions') {
        const fields = [
          'date', 'description', 'amount', 'type', 
          'categoryName', 'accountName', 'payee', 'notes', 'tags'
        ];
        let csv = fields.join(',') + '\\r\\n';
        exportableData.forEach(transaction => {
          const row = fields.map(field => {
            let value = transaction[field];
            if (field === 'date' && value) {
              value = new Date(value).toISOString().split('T')[0];
            } else if (field === 'tags' && Array.isArray(value)) {
              value = value.join(';');
            } else if (typeof value === 'string') {
              if (value.includes(',') || value.includes('\\n') || value.includes('"')) {
                value = '"' + value.replace(/"/g, '""') + '"';
              }
            }
            return value !== undefined && value !== null ? value : '';
          });
          csv += row.join(',') + '\\r\\n';
        });
        
        const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        return res.send(csv);
      } else {
        // For other report types, CSV is not supported, return JSON with a warning
        warningMessage = `CSV export is not currently supported for reportType '${reportType}'. Data is returned in JSON format.`;
        logger.warn(warningMessage);
        // Fall through to JSON response
      }
    }
    
    // JSON response (default or if CSV not supported for the type)
    const jsonResponse = {
      status: 'success',
      reportType,
      data: responseData
    };
    if (warningMessage) {
      jsonResponse.warning = warningMessage;
    }
    res.status(200).json(jsonResponse);

  } catch (error) {
    logger.error(`Error exporting data for reportType '${req.query.reportType}':`, error);
    if (error.message.startsWith('Invalid period') || error.message.startsWith('Invalid type')) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
    next(error);
  }
};

const getCategoryDistribution = async (req, res, next) => {
  try {
    const { startDate, endDate, type = 'expense' } = req.query;
    
    // Validate type
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid type. Allowed values: income, expense'
      });
    }
    
    // Set userId based on current user (or specified user if admin)
    const userRoles = req.auth.realm_access?.roles

    const userId = userRoles.includes('admin') && req.query.userId
      ? req.query.userId
      : req.auth.sub;
    
    // Build match criteria
    const matchCriteria = { userId, type };
    
    if (startDate && endDate) {
      matchCriteria.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Aggregation pipeline for category distribution
    const distribution = await Transaction.aggregate([
      {
        $match: matchCriteria
      },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          name: '$category.name',
          color: '$category.color',
          icon: '$category.icon',
          total: 1,
          count: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    // Calculate grand total
    const grandTotal = distribution.reduce((sum, item) => sum + item.total, 0);
    
    // Add percentage to each category
    const distributionWithPercentage = distribution.map(item => ({
      ...item,
      percentage: grandTotal > 0 ? (item.total / grandTotal * 100).toFixed(2) : 0
    }));
    
    res.status(200).json({
      status: 'success',
      data: {
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        grandTotal,
        distribution: distributionWithPercentage
      }
    });
  } catch (error) {
    logger.error('Error generating category distribution:', error);
    next(error);
  }
};

module.exports = {
  getPeriodicReport,
  getTrends,
  exportData,
  getCategoryDistribution
};
