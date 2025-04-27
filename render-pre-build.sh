#!/bin/bash

# This script explicitly installs packages needed during build time
# This is important for Render.com deployments

echo "🔍 Installing critical build dependencies..."
npm install --no-save vite @vitejs/plugin-react esbuild

echo "✅ Pre-build dependencies installed successfully"
