module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Setup file that runs before each test suite
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Verbose output
  verbose: true
};
