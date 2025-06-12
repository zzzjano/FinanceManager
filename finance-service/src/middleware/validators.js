const { body, param, query, validationResult } = require('express-validator');

// Pomocnicza funkcja do sprawdzania wyników walidacji
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      message: 'Błędy walidacji',
      errors: errors.array()
    });
  }
  next();
};

// Walidatory dla transakcji
const transactionValidators = {
  create: [
    body('accountId')
      .notEmpty().withMessage('Konto jest wymagane')
      .isMongoId().withMessage('Nieprawidłowy format ID konta'),
    body('amount')
      .notEmpty().withMessage('Kwota jest wymagana')
      .isFloat({ gt: 0 }).withMessage('Kwota musi być liczbą większą od 0'),
    body('type')
      .notEmpty().withMessage('Typ transakcji jest wymagany')
      .isIn(['income', 'expense', 'transfer']).withMessage('Nieprawidłowy typ transakcji'),
    body('categoryId')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    body('date')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty'),
    body('tags')
      .optional()
      .isArray().withMessage('Etykiety muszą być tablicą'),
    body('isRecurring')
      .optional()
      .isBoolean().withMessage('Wartość cykliczności musi być typu boolean'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID transakcji'),
    body('accountId')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID konta'),
    body('amount')
      .optional()
      .isFloat({ gt: 0 }).withMessage('Kwota musi być liczbą większą od 0'),
    body('type')
      .optional()
      .isIn(['income', 'expense', 'transfer']).withMessage('Nieprawidłowy typ transakcji'),
    body('categoryId')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    body('date')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty'),
    validate
  ],
  getById: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID transakcji'),
    validate
  ],
  getAll: [
    query('startDate')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty początkowej'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty końcowej'),
    query('minAmount')
      .optional()
      .isFloat().withMessage('Minimalna kwota musi być liczbą'),
    query('maxAmount')
      .optional()
      .isFloat().withMessage('Maksymalna kwota musi być liczbą'),
    query('type')
      .optional()
      .isIn(['income', 'expense', 'transfer']).withMessage('Nieprawidłowy typ transakcji'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Strona musi być liczbą większą od 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit musi być liczbą od 1 do 100'),
    validate
  ],
  delete: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID transakcji'),
    validate
  ]
};

// Walidatory dla cyklicznych transakcji
const scheduledTransactionValidators = {
  create: [
    body('accountId')
      .notEmpty().withMessage('Konto jest wymagane')
      .isMongoId().withMessage('Nieprawidłowy format ID konta'),
    body('amount')
      .notEmpty().withMessage('Kwota jest wymagana')
      .isFloat({ gt: 0 }).withMessage('Kwota musi być liczbą większą od 0'),
    body('type')
      .notEmpty().withMessage('Typ transakcji jest wymagany')
      .isIn(['income', 'expense', 'transfer']).withMessage('Nieprawidłowy typ transakcji'),
    body('frequency')
      .notEmpty().withMessage('Częstotliwość jest wymagana')
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Niepoprawna częstotliwość'),
    body('startDate')
      .notEmpty().withMessage('Data rozpoczęcia jest wymagana')
      .isISO8601().withMessage('Nieprawidłowy format daty rozpoczęcia'),
    body('endDate')
      .optional({ nullable: true })
      .isISO8601().withMessage('Nieprawidłowy format daty zakończenia'),
    body('dayOfMonth')
      .optional()
      .isInt({ min: 1, max: 31 }).withMessage('Dzień miesiąca musi być liczbą od 1 do 31')
      .custom((value, { req }) => {
        if (req.body.frequency === 'monthly' && !value) {
          throw new Error('Dzień miesiąca jest wymagany dla płatności miesięcznych');
        }
        return true;
      }),
    body('dayOfWeek')
      .optional()
      .isInt({ min: 0, max: 6 }).withMessage('Dzień tygodnia musi być liczbą od 0 do 6')
      .custom((value, { req }) => {
        if (req.body.frequency === 'weekly' && value === undefined) {
          throw new Error('Dzień tygodnia jest wymagany dla płatności tygodniowych');
        }
        return true;
      }),
    body('autoExecute')
      .optional()
      .isBoolean().withMessage('Auto-wykonywanie musi być wartością logiczną'),
    body('categoryId')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID płatności cyklicznej'),
    body('accountId')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID konta'),
    body('amount')
      .optional()
      .isFloat({ gt: 0 }).withMessage('Kwota musi być liczbą większą od 0'),
    body('type')
      .optional()
      .isIn(['income', 'expense', 'transfer']).withMessage('Nieprawidłowy typ transakcji'),
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Niepoprawna częstotliwość'),
    body('startDate')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty rozpoczęcia'),
    body('endDate')
      .optional({ nullable: true })
      .isISO8601().withMessage('Nieprawidłowy format daty zakończenia'),
    body('status')
      .optional()
      .isIn(['active', 'paused', 'completed', 'cancelled']).withMessage('Nieprawidłowy status'),
    validate
  ],
  getById: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID płatności cyklicznej'),
    validate
  ],
  getAll: [
    query('status')
      .optional()
      .isIn(['active', 'paused', 'completed', 'cancelled']).withMessage('Nieprawidłowy status'),
    query('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Niepoprawna częstotliwość'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Strona musi być liczbą większą od 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit musi być liczbą od 1 do 100'),
    validate
  ],
  delete: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID płatności cyklicznej'),
    validate
  ]
};

// Walidatory dla budżetu
const budgetValidators = {
  create: [
    body('name')
      .notEmpty().withMessage('Nazwa budżetu jest wymagana')
      .isLength({ min: 2, max: 100 }).withMessage('Nazwa budżetu powinna mieć od 2 do 100 znaków'),
    body('type')
      .notEmpty().withMessage('Typ budżetu jest wymagany')
      .isIn(['weekly', 'monthly', 'custom']).withMessage('Nieprawidłowy typ budżetu'),
    body('startDate')
      .notEmpty().withMessage('Data początkowa jest wymagana')
      .isISO8601().withMessage('Nieprawidłowy format daty początkowej'),
    body('endDate')
      .notEmpty().withMessage('Data końcowa jest wymagana')
      .isISO8601().withMessage('Nieprawidłowy format daty końcowej')
      .custom((value, { req }) => {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('Data końcowa musi być późniejsza niż data początkowa');
        }
        return true;
      }),
    body('categories')
      .optional()
      .isArray().withMessage('Kategorie muszą być tablicą'),
    body('categories.*.categoryId')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    body('categories.*.limit')
      .optional()
      .isFloat({ gt: 0 }).withMessage('Limit kategorii musi być liczbą większą od 0'),
    body('totalLimit')
      .optional()
      .isFloat({ min: 0 }).withMessage('Całkowity limit musi być liczbą większą lub równą 0'),
    body('notificationThreshold')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Próg powiadomień musi być liczbą od 1 do 100'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID budżetu'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 }).withMessage('Nazwa budżetu powinna mieć od 2 do 100 znaków'),
    body('type')
      .optional()
      .isIn(['weekly', 'monthly', 'custom']).withMessage('Nieprawidłowy typ budżetu'),
    body('startDate')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty początkowej'),
    body('endDate')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty końcowej')
      .custom((value, { req }) => {
        if (req.body.startDate) {
          const startDate = new Date(req.body.startDate);
          const endDate = new Date(value);
          if (endDate <= startDate) {
            throw new Error('Data końcowa musi być późniejsza niż data początkowa');
          }
        }
        return true;
      }),
    body('categories')
      .optional()
      .isArray().withMessage('Kategorie muszą być tablicą'),
    body('categories.*.categoryId')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    body('categories.*.limit')
      .optional()
      .isFloat({ gt: 0 }).withMessage('Limit kategorii musi być liczbą większą od 0'),
    body('totalLimit')
      .optional()
      .isFloat({ min: 0 }).withMessage('Całkowity limit musi być liczbą większą lub równą 0'),
    body('isActive')
      .optional()
      .isBoolean().withMessage('Status aktywności musi być wartością logiczną'),
    body('notificationThreshold')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Próg powiadomień musi być liczbą od 1 do 100'),
    validate
  ],
  getById: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID budżetu'),
    validate
  ],
  getAll: [
    query('isActive')
      .optional()
      .isBoolean().withMessage('Status aktywności musi być wartością logiczną'),
    query('type')
      .optional()
      .isIn(['weekly', 'monthly', 'custom']).withMessage('Nieprawidłowy typ budżetu'),
    query('date')
      .optional()
      .isISO8601().withMessage('Nieprawidłowy format daty'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Strona musi być liczbą większą od 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit musi być liczbą od 1 do 100'),
    validate
  ],
  delete: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID budżetu'),
    validate
  ],
  getBudgetProgress: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID budżetu'),
    validate
  ]
};

// Walidatory dla kategorii
const categoryValidators = {
  create: [
    body('name')
      .notEmpty().withMessage('Nazwa kategorii jest wymagana')
      .isLength({ min: 2, max: 30 }).withMessage('Nazwa kategorii musi mieć od 2 do 30 znaków'),
    body('type')
      .notEmpty().withMessage('Typ kategorii jest wymagany')
      .isIn(['income', 'expense']).withMessage('Nieprawidłowy typ kategorii'),
    body('color')
      .optional()
      .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Nieprawidłowy format koloru (HEX)'),
    body('parent')
      .optional()
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii nadrzędnej'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 30 }).withMessage('Nazwa kategorii musi mieć od 2 do 30 znaków'),
    body('type')
      .optional()
      .isIn(['income', 'expense']).withMessage('Nieprawidłowy typ kategorii'),
    body('isActive')
      .optional()
      .isBoolean().withMessage('Status aktywności musi być wartością logiczną'),
    validate
  ],
  getAll: [
    query('type')
      .optional()
      .isIn(['income', 'expense']).withMessage('Nieprawidłowy typ kategorii'),
    validate
  ],
  getById: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    validate
  ],
  delete: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID kategorii'),
    validate
  ]
};

// Walidatory dla kont
const accountValidators = {
  create: [
    body('name')
      .notEmpty().withMessage('Nazwa konta jest wymagana')
      .isLength({ min: 2, max: 50 }).withMessage('Nazwa konta musi mieć od 2 do 50 znaków'),
    body('type')
      .notEmpty().withMessage('Typ konta jest wymagany')
      .isIn(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'CASH', 'OTHER'])
      .withMessage('Nieprawidłowy typ konta'),
    body('balance')
      .notEmpty().withMessage('Saldo początkowe jest wymagane')
      .isFloat().withMessage('Saldo musi być liczbą'),
    body('currency')
      .notEmpty().withMessage('Waluta jest wymagana')
      .isLength({ min: 3, max: 3 }).withMessage('Kod waluty musi mieć dokładnie 3 znaki'),
    validate
  ],
  update: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID konta'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage('Nazwa konta musi mieć od 2 do 50 znaków'),
    body('type')
      .optional()
      .isIn(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'CASH', 'OTHER'])
      .withMessage('Nieprawidłowy typ konta'),
    body('isActive')
      .optional()
      .isBoolean().withMessage('Status aktywności musi być wartością logiczną'),
    validate
  ],
  getById: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID konta'),
    validate
  ],
  delete: [
    param('id')
      .isMongoId().withMessage('Nieprawidłowy format ID konta'),
    validate
  ]
};

// Walidatory dla raportów
const reportValidators = {
  periodic: [
    query('groupBy')
      .optional()
      .isIn(['day', 'week', 'month']).withMessage('Nieprawidłowy format grupowania'),
    validate
  ],
  categoryDistribution: [
    query('type')
      .optional()
      .isIn(['income', 'expense']).withMessage('Nieprawidłowy typ transakcji'),
    validate
  ]
};

// Validators for notifications
const notificationValidators = {
  getAll: [
    query('isRead')
      .optional()
      .isBoolean().withMessage('isRead must be a boolean value'),
    query('type')
      .optional()
      .isString().withMessage('Type must be a string')
      .isIn(['budgetWarning', 'budgetExceeded', 'categoryWarning', 'categoryExceeded', 'system'])
      .withMessage('Invalid notification type'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    validate
  ],
  markAsRead: [
    param('id')
      .isMongoId().withMessage('Invalid notification ID format'),
    validate
  ],
  delete: [
    param('id')
      .isMongoId().withMessage('Invalid notification ID format'),
    validate
  ],
  deleteAll: [
    query('isRead')
      .optional()
      .isBoolean().withMessage('isRead must be a boolean value'),
    query('type')
      .optional()
      .isString().withMessage('Type must be a string')
      .isIn(['budgetWarning', 'budgetExceeded', 'categoryWarning', 'categoryExceeded', 'system'])
      .withMessage('Invalid notification type'),
    validate
  ],
};

module.exports = {
  transactionValidators,
  scheduledTransactionValidators,
  accountValidators,
  categoryValidators,
  reportValidators,
  budgetValidators,
  notificationValidators
};
