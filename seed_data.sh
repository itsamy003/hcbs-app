#!/bin/bash

API_URL="http://localhost:3000/auth"
AIDBOX_URL="http://localhost:8080"
AIDBOX_AUTH="root:6xJ9RhtVB2"

# 0. Create OAuth Client (required for login to work)
echo "Creating Aidbox OAuth Client (hcbs-backend)..."
curl -s -X PUT -u "$AIDBOX_AUTH" "$AIDBOX_URL/Client/hcbs-backend" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Client",
    "id": "hcbs-backend",
    "secret": "hcbs-backend-secret",
    "grant_types": ["password"],
    "auth": {
      "password": {
        "secret_required": true,
        "access_token_expiration": 86400
      }
    }
  }'
echo -e "\n"


create_user() {
  echo "Creating $1 ($2)..."
  curl -X POST "$API_URL/signup" \
    -H "Content-Type: application/json" \
    -d "$3"
  echo -e "\n"
}

# 1. Practitioner
create_user "Practitioner" "dr@hcbs.com" '{
  "type": "practitioner",
  "email": "dr@hcbs.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "specialty": "General Practitioner"
}'

# 2. Patient
create_user "Patient" "pat@hcbs.com" '{
  "type": "patient",
  "email": "pat@hcbs.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "dob": "1990-01-01"
}'

# 3. Guardian
create_user "Guardian" "guard@hcbs.com" '{
  "type": "guardian",
  "email": "guard@hcbs.com",
  "password": "password123",
  "firstName": "Gary",
  "lastName": "Smith"
}'
