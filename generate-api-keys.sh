#!/bin/bash

# Use chmod +x generateApiKeys.sh to make it executable

# Function to generate a secure API key
generate_key() {
    openssl rand -hex 16
}

# Path to your .env file
ENV_FILE=".env"

# Generate new API keys
NEW_KEYS=$(generate_key),$(generate_key),$(generate_key)

# Update the .env file
sed -i.bak '/^API_KEYS=/ {
    s/^API_KEYS=.*/API_KEYS='"$NEW_KEYS"'/
    t
    s/^API_KEYS=/&'"$NEW_KEYS"'/
}' "$ENV_FILE"

echo "API keys updated in $ENV_FILE"