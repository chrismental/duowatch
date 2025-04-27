// render-setup.mjs
// This file uses ES modules syntax for Node.js projects with "type": "module"
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCommand(command) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.toString());
    return false;
  }
}

// Main function to build the application
async function buildApp() {
  console.log('🚀 Starting Render deployment build process...');
  
  // Install dependencies
  runCommand('npm ci --include=dev');
  
  // Install Vite and plugins explicitly to ensure they're available
  runCommand('npm install --no-save vite @vitejs/plugin-react @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal');
  
  // Build the frontend
  process.env.NODE_ENV = 'production';
  if (!runCommand('./node_modules/.bin/vite build')) {
    console.log('Trying alternative Vite build command...');
    if (!runCommand('npx vite build')) {
      throw new Error('Failed to build frontend');
    }
  }
  
  // Build the backend
  if (!runCommand('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist')) {
    throw new Error('Failed to build backend');
  }
  
  // Push database schema
  try {
    runCommand('npx drizzle-kit push');
  } catch (error) {
    console.warn('Warning: Database schema push failed, will try again at startup');
  }
  
  console.log('✅ Build completed successfully!');
}

// For running the application
async function startApp() {
  console.log('🚀 Starting application...');
  
  // Try to push schema again just to be sure
  try {
    runCommand('npx drizzle-kit push');
  } catch (error) {
    console.warn('Warning: Database schema push failed, continuing anyway');
  }
  
  // Start the application
  console.log('Starting server from dist/index.js');
  process.env.NODE_ENV = 'production';
  
  // Load the application (ESM import)
  try {
    const { default: app } = await import('./dist/index.js');
    console.log('Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Determine if we're building or starting
const command = process.argv[2] || 'build';
if (command === 'build') {
  buildApp().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
} else if (command === 'start') {
  startApp().catch(err => {
    console.error('Start failed:', err);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
