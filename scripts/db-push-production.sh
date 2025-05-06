#!/bin/bash
# Script to push database migrations for production environment
NODE_ENV=production npx tsx scripts/db-migrate.ts