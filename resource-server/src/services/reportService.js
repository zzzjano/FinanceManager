const { logger } = require('../utils/logger');
const axios = require('axios');

const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://finance-service:3003/api';

// Helper to forward the auth token to the finance service
const createConfigWithAuth = (req) => {
  return {
    headers: {
      Authorization: req.headers.authorization
    }
  };
};

/**
 * Report service for handling all reporting and statistics
 */
class ReportService {
  /**
   * Get periodic report data
   */
  static async getPeriodicReport(req) {
    try {
      // Forward query parameters
      const queryString = new URLSearchParams(req.query).toString();
      const url = `${FINANCE_SERVICE_URL}/reports/periodic${queryString ? `?${queryString}` : ''}`;
      
      const response = await axios.get(url, createConfigWithAuth(req));
      return response.data;
    } catch (error) {
      logger.error('Error fetching periodic report from finance service:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get expense trends data
   */
  static async getTrends(req) {
    try {
      // Forward query parameters
      const queryString = new URLSearchParams(req.query).toString();
      const url = `${FINANCE_SERVICE_URL}/reports/trends${queryString ? `?${queryString}` : ''}`;
      
      const response = await axios.get(url, createConfigWithAuth(req));
      return response.data;
    } catch (error) {
      logger.error('Error fetching trends from finance service:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get category distribution data
   */
  static async getCategoryDistribution(req) {
    try {
      // Forward query parameters
      const queryString = new URLSearchParams(req.query).toString();
      const url = `${FINANCE_SERVICE_URL}/reports/category-distribution${queryString ? `?${queryString}` : ''}`;
      
      const response = await axios.get(url, createConfigWithAuth(req));
      return response.data;
    } catch (error) {
      logger.error('Error fetching category distribution from finance service:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Export data in various formats
   */
  static async exportData(req, res) {
    try {
      // Forward query parameters
      const queryString = new URLSearchParams(req.query).toString();
      const url = `${FINANCE_SERVICE_URL}/reports/export${queryString ? `?${queryString}` : ''}`;
      
      // Make request to finance service
      const response = await axios.get(url, {
        ...createConfigWithAuth(req),
        responseType: req.query.format?.toLowerCase() === 'csv' ? 'stream' : 'json'
      });
      
      // If CSV, pipe the response directly
      if (req.query.format?.toLowerCase() === 'csv') {
        // Get filename from content-disposition or generate one
        const contentDisposition = response.headers['content-disposition'];
        const filename = contentDisposition ? 
          contentDisposition.split('filename=')[1] : 
          `transactions_${new Date().toISOString().split('T')[0]}.csv`;
          
        // Set headers for download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        // Stream the response
        response.data.pipe(res);
        return null; // Don't return anything, response is handled by stream
      }
      
      // For JSON, return the data
      return response.data;
    } catch (error) {
      logger.error('Error exporting data from finance service:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = ReportService;
