# Environment Configuration

This document outlines the environment variables used by the application. Configuration varies based on the current environment (development, staging, production).

## Required Environment Variables

### Core Settings
- `NODE_ENV` - Set to 'development', 'staging', or 'production'
- `DATABASE_URL` - The PostgreSQL database connection string

### Email Service
- `BREVO_API_KEY` - API key for the Brevo email service (required for sending emails)
- `FROM_EMAIL` - Default sender email address (optional, defaults to noreply@normalrestored.com)
- `FROM_NAME` - Default sender name (optional, defaults to "Normal Restored")

### Development-only Settings
- `DEV_EMAIL` - Development test email address for email sender (optional)
- `DEV_NAME` - Development test name for email sender (optional)

### Production/Staging Settings
- `SENTRY_DSN` - Sentry Data Source Name for error tracking (recommended for production/staging)

## Environment-specific Behavior

### Development Environment
- Detailed logging of all operations
- Email errors logged to files in the 'logs' directory
- Test emails sent to 'dev-test@normalrestored.com' in development by default
- Operations continue even when errors occur (fail-open approach)
- Comprehensive troubleshooting information displayed in console

### Staging Environment
- Moderate logging (less verbose than development)
- Errors reported to Sentry if configured
- Critical errors fail appropriately but with some allowances for testing
- Warnings for missing configurations

### Production Environment
- Minimal logging to reduce storage and improve performance
- All errors reported to Sentry for monitoring
- Strict validation of required settings
- Operations fail appropriately on errors (fail-closed approach)
- Privacy-focused handling of sensitive data in logs

## Usage Examples

### Development (.env)
```
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/dbname
BREVO_API_KEY=your-brevo-api-key
DEV_EMAIL=dev@example.com
DEV_NAME=Development Tester
```

### Production (.env.production)
```
NODE_ENV=production
DATABASE_URL=postgres://user:password@production-db:5432/dbname
BREVO_API_KEY=your-production-brevo-api-key
FROM_EMAIL=notifications@yourcompany.com
FROM_NAME=Your Company Name
SENTRY_DSN=https://your-sentry-dsn
```