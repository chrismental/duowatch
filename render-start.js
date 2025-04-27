// render-start.js - Custom startup script for Render
import { execSync } from 'child_process';
import { createRequire } from 'module';

// Create a require function
const require = createRequire(import.meta.url);

// Set production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Starting application on Render...');

// Make sure the database schema is updated
console.log('🔄 Ensuring database schema is up to date...');
try {
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
} catch (error) {
  console.error('Warning: Failed to update database schema:', error.message);
}

// Start the application
console.log('🌐 Starting server...');
import('./dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
