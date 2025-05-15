import * as Sentry from '@sentry/node';
import { getEnvironment, isProduction, isStaging } from './config';

/**
 * Initializes Sentry for error tracking
 * Only fully initializes in production and staging environments
 */
export function initSentry() {
  const environment = getEnvironment();
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    if (isProduction() || isStaging()) {
      console.warn('⚠️ SENTRY_DSN is not set in the environment variables. Error tracking will be disabled.');
    } else {
      console.log('ℹ️ Sentry disabled in development mode (no SENTRY_DSN needed)');
    }
    return;
  }
  
  Sentry.init({
    dsn,
    environment,
    enabled: isProduction() || isStaging(),
    tracesSampleRate: 1.0,
    maxBreadcrumbs: 50,
    debug: !isProduction(),
  });
  
  console.log(`🛡️ Sentry initialized in ${environment} environment`);
}

/**
 * Capture an exception with Sentry
 * @param error The error to capture
 * @param context Additional context data
 */
export function captureException(error: Error | any, context?: Record<string, any>) {
  if (isProduction() || isStaging()) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    // In development, just log to console
    console.error('❌ Error captured (would send to Sentry in production):', error);
    if (context) {
      console.error('Context:', context);
    }
  }
}

/**
 * Capture a message with Sentry
 * @param message The message to capture
 * @param level The severity level
 * @param context Additional context data
 */
export function captureMessage(
  message: string, 
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  if (isProduction() || isStaging()) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    // In development, just log to console
    console.log(`📝 Message captured (would send to Sentry in production) [${level}]:`, message);
    if (context) {
      console.log('Context:', context);
    }
  }
}

/**
 * Set user context for Sentry
 * @param user User information
 */
export function setUser(user: { id: string | number; email?: string; username?: string }) {
  if (isProduction() || isStaging()) {
    Sentry.setUser(user);
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (isProduction() || isStaging()) {
    Sentry.setUser(null);
  }
}

/**
 * Configure Sentry for Express
 * Call this after creating your Express app
 * @param app Express application
 */
export function configureSentryForExpress(app: any) {
  // In older versions of Sentry Node SDK, these were available
  // For newer versions, we'll just skip this step
  if (isProduction() || isStaging()) {
    try {
      // @ts-ignore - may not exist in all versions
      if (Sentry.Handlers && typeof Sentry.Handlers.requestHandler === 'function') {
        app.use(Sentry.Handlers.requestHandler());
      }
      
      // @ts-ignore - may not exist in all versions
      if (Sentry.Handlers && typeof Sentry.Handlers.tracingHandler === 'function') {
        app.use(Sentry.Handlers.tracingHandler());
      }
    } catch (e) {
      console.warn('Could not set up Sentry Express integration:', e);
    }
  }
}

/**
 * Add Sentry error handler to Express
 * Call this after your routes but before any other error middleware
 * @param app Express application
 */
export function addSentryErrorHandler(app: any) {
  if (isProduction() || isStaging()) {
    try {
      // @ts-ignore - may not exist in all versions
      if (Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function') {
        app.use(Sentry.Handlers.errorHandler());
      }
    } catch (e) {
      console.warn('Could not set up Sentry error handler:', e);
    }
  }
}