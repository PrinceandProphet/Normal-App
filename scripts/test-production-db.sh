#!/bin/bash

# Script to test the production database connection
echo "Running server with NODE_ENV=production to test database connection..."
NODE_ENV=production npx tsx server/index.ts