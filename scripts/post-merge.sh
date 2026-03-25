#!/bin/bash
set -e
npm install
npm run db:migrate 2>/dev/null || true
yes | CI=true npx drizzle-kit push --force
