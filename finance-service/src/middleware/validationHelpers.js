const { validationResult } = require('express-validator');

const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'fail',
      message: 'Błędy walidacji',
      errors: errors.array()
    });
    return false;
  }
  return true;
};

module.exports = { validateRequest };
