// Simple health check controller

const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Resource server is up and running',
    timestamp: new Date(),
    uptime: process.uptime()
  });
};

module.exports = {
  healthCheck
};
