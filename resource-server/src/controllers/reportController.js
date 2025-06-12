const { logger } = require('../utils/logger');
const reportService = require('../services/reportService');

/**
 * Get periodic report data (day/week/month/year)
 * @route GET /api/reports/periodic
 */
const getPeriodicReport = async (req, res, next) => {
  try {
    const response = await reportService.getPeriodicReport(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error generating periodic report:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

/**
 * Get expense trends over time
 * @route GET /api/reports/trends
 */
const getTrends = async (req, res, next) => {
  try {
    const response = await reportService.getTrends(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error generating trends report:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

/**
 * Get category distribution for visualization
 * @route GET /api/reports/category-distribution
 */
const getCategoryDistribution = async (req, res, next) => {
  try {
    const response = await reportService.getCategoryDistribution(req);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error generating category distribution:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

/**
 * Export data in various formats
 * @route GET /api/reports/export
 */
const exportData = async (req, res, next) => {
  try {
    const response = await reportService.exportData(req, res);
    
    // If this is a CSV export, response is handled by the stream in the service
    if (req.query.format?.toLowerCase() === 'csv') {
      return;
    }
    
    // For JSON response, send it back
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error exporting data:', error);
    
    // Forward specific error responses from the finance service
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    next(error);
  }
};

module.exports = {
  getPeriodicReport,
  getTrends,
  getCategoryDistribution,
  exportData
};
