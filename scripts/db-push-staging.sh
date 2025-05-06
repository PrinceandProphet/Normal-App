#!/bin/bash
# Script to push database migrations for staging environment
NODE_ENV=staging npx tsx scripts/db-migrate.ts