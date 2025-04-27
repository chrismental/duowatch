// render-prod-build.js - Special build script for Render deployment
const { execSync } = require('child_process');

// Set production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Starting Render production build...');

// Install all dependencies including dev dependencies
console.log('📦 Installing dependencies...');
execSync('npm ci --include=dev', { stdio: 'inherit' });

// Ensure Vite and its plugins are explicitly installed
console.log('🔍 Installing Vite and required plugins...');
execSync('npm install --no-save vite @vitejs/plugin-react', { stdio: 'inherit' });

// Build frontend
console.log('🏗️ Building frontend...');
execSync('npx vite build', { stdio: 'inherit' });

// Build backend
console.log('🏗️ Building backend...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

// Push database schema
console.log('🔄 Pushing database schema...');
try {
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
} catch (error) {
  console.error('Warning: Unable to push database schema. This will be done at runtime.');
}

console.log('✅ Build completed successfully!');