// Test environment: set before any module reads config/env.js.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789-abcdefghij';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789-abcdefghij';
process.env.DEMO_PASSWORD ??= 'demo-password-123';
process.env.INGEST_API_KEY ??= 'test-ingest-key';
process.env.SIMULATOR = 'off';
process.env.MODEL_URL = 'http://model.test';
process.env.MODEL_MIN_INTERVAL_MIN = '0';
