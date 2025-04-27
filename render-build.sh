#!/bin/bash

# Run pre-build script to ensure critical dependencies are available
echo "🚀 Running pre-build script..."
./render-pre-build.sh

# Use our custom build script for Render
echo "🏗️ Starting main build process..."
node render-prod-build.js