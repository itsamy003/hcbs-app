#!/bin/bash

# Configuration
BASE_URL="http://127.0.0.1:8080/fhir"
AUTH="root:6xJ9RhtVB2"
CLIENT_ID="root"
CLIENT_SECRET="6xJ9RhtVB2"

echo "1. Creating Test User..."
# Create a user directly in Aidbox to ensure we know the password
# Note: When creating User directly, Aidbox might hash the password if we use the right endpoint or format.
# But for 'password' grant to work, does Aidbox expect the 'password' field in User resource? Yes, usually.
# Let's create a User with a known password.
curl -X PUT -u $AUTH "$BASE_URL/User/test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "User",
    "id": "test-user",
    "email": "test@hcbs.com",
    "password": "test-password",
    "data": { "role": "practitioner" }
  }'
echo ""
echo ""

echo "2. Testing Password Grant with Correct Credentials..."
curl -X POST "http://127.0.0.1:8080/auth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"$CLIENT_ID\",
    \"client_secret\": \"$CLIENT_SECRET\",
    \"username\": \"test@hcbs.com\",
    \"password\": \"test-password\"
  }"
echo ""
echo ""

echo "3. Testing Password Grant with WRONG Credentials..."
curl -X POST "http://127.0.0.1:8080/auth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"password\",
    \"client_id\": \"$CLIENT_ID\",
    \"client_secret\": \"$CLIENT_SECRET\",
    \"username\": \"test@hcbs.com\",
    \"password\": \"WRONG\"
  }"
echo ""
