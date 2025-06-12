import api from './api';

/**
 * Service for fetching reports and statistics
 */
class ReportService {
  /**
   * Get periodic report data (day, week, month, year)
   * @param {string} period - The period type (day, week, month, year)
   * @param {string} startDate - Optional start date
   * @param {string} endDate - Optional end date
   * @returns {Promise<Object>} Report data
   */
  static async getPeriodicReport(period = 'month', startDate = null, endDate = null) {
    try {
      const params = { period };
      
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/reports/periodic', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching periodic report:', error);
      throw error;
    }
  }
  /**
   * Get expense trends over time
   * @param {number} months - Number of months to include
   * @returns {Promise<Object>} Trends data
   */
  static async getTrends(months = 12) {
    try {
      const response = await api.get('/reports/trends', { params: { months } });
      return response.data;
    } catch (error) {
      console.error('Error fetching expense trends:', error);
      throw error;
    }
  }
  /**
   * Get category distribution for visualization
   * @param {string} type - Transaction type (income or expense)
   * @param {string} startDate - Optional start date
   * @param {string} endDate - Optional end date
   * @returns {Promise<Object>} Category distribution data
   */
  static async getCategoryDistribution(type = 'expense', startDate = null, endDate = null) {
    try {
      const params = { type };
      
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/reports/category-distribution', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching category distribution:', error);
      throw error;
    }
  }
  /**
   * Get monthly report data
   * @param {number} year - Year for the report
   * @param {number} month - Month for the report
   * @returns {Promise<Object>} Monthly report data
   */
  static async getMonthlyReport(year, month) {
    try {
      const response = await api.get('/reports/monthly', { params: { year, month } });
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      throw error;
    }
  }
  /**
   * Get category summary report
   * @param {string} startDate - Start date for the report
   * @param {string} endDate - End date for the report
   * @param {string} type - Optional transaction type filter
   * @returns {Promise<Object>} Category summary data
   */
  static async getCategorySummary(startDate, endDate, type = null) {
    try {
      const params = { startDate, endDate };
      if (type) params.type = type;
      
      const response = await api.get('/reports/category-summary', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching category summary:', error);
      throw error;
    }
  }
  /**
   * Export transactions data in various formats
   * @param {string} format - Export format (csv or json)
   * @param {string} type - Optional transaction type filter
   * @param {string} startDate - Optional start date
   * @param {string} endDate - Optional end date
   */
  static async exportData(format = 'csv', type = null, startDate = null, endDate = null) {
    try {
      const params = { format };
      
      if (type) params.type = type;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      if (format.toLowerCase() === 'csv') {
        // For CSV, trigger a file download
        const response = await api.get('/reports/export', { 
          params, 
          responseType: 'blob'
        });
        
        // Create file download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
      } else {
        // For JSON, return the data
        const response = await api.get('/reports/export', { params });
        return response.data;
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}

export default ReportService;
