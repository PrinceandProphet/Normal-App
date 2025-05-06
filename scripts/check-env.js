/**
 * Script to check environment variables
 * Run with: NODE_ENV=production npx tsx scripts/check-env.js
 */

import { loadEnvironment } from '../server/config.js';

// Ensure environment variables are loaded
loadEnvironment();

console.log('==== ENVIRONMENT VARIABLES CHECK ====');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set'}`);
console.log(`PGDATABASE: ${process.env.PGDATABASE || 'Not set'}`);

// Extract database name from DATABASE_URL for verification
if (process.env.DATABASE_URL) {
  const urlParts = process.env.DATABASE_URL.split('/');
  if (urlParts.length > 3) {
    const dbName = urlParts[3].split('?')[0];
    console.log(`Database name in URL: ${dbName}`);
    
    // Check if DATABASE_URL and PGDATABASE match
    if (dbName !== process.env.PGDATABASE) {
      console.log('WARNING: DATABASE_URL and PGDATABASE do not reference the same database name');
    }
  }
}

console.log('==== END OF CHECK ====');