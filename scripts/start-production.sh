#!/bin/bash

# Script to start the application in production mode
echo "Starting application in production mode..."
NODE_ENV=production npx tsx server/index.ts