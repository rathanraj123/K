#!/bin/bash
# setup_rds.sh - Connects to AWS RDS and enables pgvector

set -e

# Load environment variables
source ../.env.production

if [ -z "$POSTGRES_SERVER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo "Error: POSTGRES_SERVER or POSTGRES_PASSWORD not set in .env.production"
    exit 1
fi

echo "Connecting to AWS RDS at $POSTGRES_SERVER..."

# Set PGPASSWORD so psql doesn't prompt
export PGPASSWORD=$POSTGRES_PASSWORD

psql -h $POSTGRES_SERVER -U $POSTGRES_USER -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "pgvector extension created successfully on AWS RDS."
