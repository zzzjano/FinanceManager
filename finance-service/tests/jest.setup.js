// Set up any global test environment configuration
process.env.NODE_ENV = 'test';

// Mock environment variables for tests
process.env.JWKS_URI = 'http://localhost:8080/realms/finance-manager/protocol/openid-connect/certs';
process.env.KEYCLOAK_AUTH_SERVER_URL = 'http://localhost:8080';
process.env.KEYCLOAK_REALM = 'finance-manager';

// Silence console logs during tests
console.log = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
