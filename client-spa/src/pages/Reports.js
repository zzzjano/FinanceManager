import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  TimeScale
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import ReportService from '../services/reportService';
import Loading from '../components/Loading';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Generate random colors for chart categories
const generateChartColors = (count) => {
  const colors = [];
  const hueStep = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = i * hueStep;
    colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
  }
  
  return colors;
};

const Reports = () => {
  // State for period selection
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for data loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for report data
  const [periodicData, setPeriodicData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [categoryDistribution, setCategoryDistribution] = useState(null);
  
  // State for filters
  const [months, setMonths] = useState(6);
  const [transactionType, setTransactionType] = useState('expense');
  
  // Load initial data when component mounts
  useEffect(() => {
    loadPeriodicReport();
    loadTrendsData();
    loadCategoryDistribution();
  }, []);
  
  // Handle period filter change
  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
    setStartDate('');
    setEndDate('');
  };
  
  // Load periodic report data
  const loadPeriodicReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ReportService.getPeriodicReport(period, startDate, endDate);
      setPeriodicData(response.data);
      
      setLoading(false);
    } catch (err) {
      setError('Error loading periodic report data. Please try again.');
      setLoading(false);
      console.error('Error loading periodic report:', err);
    }
  };
  
  // Load trends data
  const loadTrendsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ReportService.getTrends(months);
      setTrendsData(response.data);
      
      setLoading(false);
    } catch (err) {
      setError('Error loading trends data. Please try again.');
      setLoading(false);
      console.error('Error loading trends:', err);
    }
  };
  
  // Load category distribution data
  const loadCategoryDistribution = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ReportService.getCategoryDistribution(transactionType, startDate, endDate);
      setCategoryDistribution(response.data);
      
      setLoading(false);
    } catch (err) {
      setError('Error loading category distribution data. Please try again.');
      setLoading(false);
      console.error('Error loading category distribution:', err);
    }
  };
  
  // Handle export data
  const handleExport = async (format) => {
    try {
      setLoading(true);
      
      await ReportService.exportData(format, null, startDate || null, endDate || null);
      
      setLoading(false);
    } catch (err) {
      setError(`Error exporting data as ${format.toUpperCase()}. Please try again.`);
      setLoading(false);
      console.error('Error exporting data:', err);
    }
  };
  
  // Filter reports by date range
  const handleFilterByDate = () => {
    loadPeriodicReport();
    loadCategoryDistribution();
  };
  
  // Prepare data for periodic chart
  const preparePeriodicChartData = () => {
    if (!periodicData || !periodicData.report || periodicData.report.length === 0) {
      return null;
    }
    
    return {
      labels: periodicData.report.map(item => item.dateFormatted),
      datasets: [
        {
          label: 'Income',
          data: periodicData.report.map(item => item.income.total),
          fill: false,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1
        },
        {
          label: 'Expense',
          data: periodicData.report.map(item => item.expense.total),
          fill: false,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          tension: 0.1
        },
        {
          label: 'Balance',
          data: periodicData.report.map(item => item.balance),
          fill: false,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          tension: 0.1
        }
      ]
    };
  };
  
  // Prepare data for trends chart
  const prepareTrendsChartData = () => {
    if (!trendsData || !trendsData.trends || trendsData.trends.length === 0) {
      return null;
    }
    
    return {
      labels: trendsData.trends.map(item => item.period),
      datasets: [
        {
          label: 'Income',
          data: trendsData.trends.map(item => {
            const incomeData = item.data.find(d => d.type === 'income');
            return incomeData ? incomeData.total : 0;
          }),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
        {
          label: 'Expense',
          data: trendsData.trends.map(item => {
            const expenseData = item.data.find(d => d.type === 'expense');
            return expenseData ? expenseData.total : 0;
          }),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
      ]
    };
  };
  
  // Prepare data for category distribution chart
  const prepareCategoryChartData = () => {
    if (!categoryDistribution || !categoryDistribution.distribution) {
      return null;
    }
    
    const labels = categoryDistribution.distribution.map(item => item.name);
    const data = categoryDistribution.distribution.map(item => item.total);
    const backgroundColor = generateChartColors(labels.length);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          hoverOffset: 4
        }
      ]
    };
  };
  
  return (
    <Container className="mt-4 mb-5">
      <h1 className="mb-4">Financial Reports</h1>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {/* Export buttons */}
      <Card className="mb-4">
        <Card.Header>
          <h5>Export Data</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Date Range (Optional)</Form.Label>
                <Row>
                  <Col>
                    <Form.Control 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      placeholder="Start Date" 
                    />
                  </Col>
                  <Col>
                    <Form.Control 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      placeholder="End Date" 
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex align-items-end">
              <Button 
                variant="primary" 
                className="me-2" 
                onClick={() => handleExport('csv')}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Export as CSV'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => handleExport('json')}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Export as JSON'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      <Tabs 
        defaultActiveKey="periodic" 
        id="reports-tabs"
        className="mb-4"
      >
        {/* Periodic Report Tab */}
        <Tab eventKey="periodic" title="Periodic Report">
          <Card>
            <Card.Header>
              <h5>Periodic Financial Report</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Select Period</Form.Label>
                    <Form.Select 
                      value={period} 
                      onChange={handlePeriodChange}
                    >
                      <option value="day">Daily</option>
                      <option value="week">Weekly</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Custom Date Range (Optional)</Form.Label>
                    <Row>
                      <Col>
                        <Form.Control 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)} 
                          placeholder="Start Date" 
                        />
                      </Col>
                      <Col>
                        <Form.Control 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)} 
                          placeholder="End Date" 
                        />
                      </Col>
                    </Row>
                  </Form.Group>
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button 
                    variant="primary" 
                    onClick={handleFilterByDate}
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Apply'}
                  </Button>
                </Col>
              </Row>
              
              {loading && <Loading />}
              
              {!loading && periodicData && (
                <div className="chart-container" style={{ height: '400px' }}>
                  <Line 
                    data={preparePeriodicChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        title: {
                          display: true,
                          text: `Financial Overview (${period.charAt(0).toUpperCase() + period.slice(1)}ly)`
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Period'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Amount'
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
              
              {!loading && !periodicData && (
                <Alert variant="info">
                  No data available for the selected period. Try adjusting your filters.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        {/* Trends Tab */}
        <Tab eventKey="trends" title="Expense Trends">
          <Card>
            <Card.Header>
              <h5>Expense Trends Over Time</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-4">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Number of Months</Form.Label>
                    <Form.Select 
                      value={months} 
                      onChange={(e) => setMonths(e.target.value)}
                    >
                      <option value="3">Last 3 months</option>
                      <option value="6">Last 6 months</option>
                      <option value="12">Last 12 months</option>
                      <option value="24">Last 24 months</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-end">
                  <Button 
                    variant="primary" 
                    onClick={loadTrendsData}
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Update'}
                  </Button>
                </Col>
              </Row>
              
              {loading && <Loading />}
              
              {!loading && trendsData && (
                <div className="chart-container" style={{ height: '400px' }}>
                  <Bar 
                    data={prepareTrendsChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        title: {
                          display: true,
                          text: 'Income vs. Expenses Trend'
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Month'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Amount'
                          },
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              )}
              
              {!loading && !trendsData && (
                <Alert variant="info">
                  No trend data available. Try adjusting the number of months.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        {/* Category Distribution Tab */}
        <Tab eventKey="categories" title="Category Breakdown">
          <Card>
            <Card.Header>
              <h5>Expenses by Category</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Transaction Type</Form.Label>
                    <Form.Select 
                      value={transactionType} 
                      onChange={(e) => setTransactionType(e.target.value)}
                    >
                      <option value="expense">Expenses</option>
                      <option value="income">Income</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Date Range (Optional)</Form.Label>
                    <Row>
                      <Col>
                        <Form.Control 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)} 
                          placeholder="Start Date" 
                        />
                      </Col>
                      <Col>
                        <Form.Control 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)} 
                          placeholder="End Date" 
                        />
                      </Col>
                    </Row>
                  </Form.Group>
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button 
                    variant="primary" 
                    onClick={loadCategoryDistribution}
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Apply'}
                  </Button>
                </Col>
              </Row>
              
              {loading && <Loading />}
              
              {!loading && categoryDistribution && categoryDistribution.distribution && categoryDistribution.distribution.length > 0 && (
                <Row>
                  <Col md={8}>
                    <div className="chart-container" style={{ height: '400px' }}>
                      <Doughnut 
                        data={prepareCategoryChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            title: {
                              display: true,
                              text: `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} by Category`
                            },
                            legend: {
                              position: 'right',
                            }
                          }
                        }}
                      />
                    </div>
                  </Col>
                  <Col md={4}>
                    <h5 className="mt-3">Distribution Details</h5>
                    <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryDistribution.distribution.map((category) => (
                            <tr key={category.categoryId}>
                              <td>{category.name}</td>
                              <td>${category.total.toFixed(2)}</td>
                              <td>{category.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Col>
                </Row>
              )}
              
              {!loading && (!categoryDistribution || !categoryDistribution.distribution || categoryDistribution.distribution.length === 0) && (
                <Alert variant="info">
                  No category data available. Try adjusting your filters.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Reports;
