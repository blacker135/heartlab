#!/bin/bash
set -e
echo "Starting Lunara dev server..."
cd "$(dirname "$0")/.."
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "Created .env.local from template — please fill in your keys."
fi
npx next dev
