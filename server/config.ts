import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Loads environment variables from the appropriate .env file based on NODE_ENV
 */
export function loadEnvironment() {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  console.log(`Loading environment for: ${NODE_ENV}`);
  
  let envPath: string;
  
  switch (NODE_ENV) {
    case 'production':
      envPath = path.resolve(rootDir, '.env.production');
      break;
    case 'staging':
      envPath = path.resolve(rootDir, '.env.staging');
      break;
    default:
      // Default to development
      envPath = path.resolve(rootDir, '.env');
      break;
  }
  
  try {
    if (fs.existsSync(envPath)) {
      console.log(`Loading environment from: ${envPath}`);
      const envConfig = fs.readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .reduce((acc: Record<string, string>, line) => {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          if (key && value) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        }, {});
      
      // Set environment variables if not already set
      Object.entries(envConfig).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
      
      return true;
    } else {
      console.warn(`Environment file not found: ${envPath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error loading environment from ${envPath}:`, error);
    return false;
  }
}

/**
 * Gets the database URL based on the environment
 */
export function getDatabaseUrl(): string {
  // Ensure environment is loaded
  loadEnvironment();
  
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database or set up the environment correctly?",
    );
  }
  
  return process.env.DATABASE_URL;
}

/**
 * Gets the current environment (development, staging, production)
 */
export function getEnvironment(): string {
  return process.env.NODE_ENV || 'development';
}

/**
 * Checks if the current environment is production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Checks if the current environment is staging
 */
export function isStaging(): boolean {
  return getEnvironment() === 'staging';
}

/**
 * Checks if the current environment is development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}