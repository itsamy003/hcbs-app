#!/bin/bash

BASE_URL="http://localhost:8080"
AUTH="root:secret"
CONTENT_TYPE="Content-Type: application/json"

enable_resource() {
  RESOURCE=$1
  echo "Enabling $RESOURCE..."
  curl -X PUT -u $AUTH "$BASE_URL/Entity/$RESOURCE" \
    -H "$CONTENT_TYPE" \
    -d "{ \"resourceType\": \"Entity\", \"id\": \"$RESOURCE\", \"type\": \"resource\", \"isOpen\": true }"
  echo ""
}

# Core Resources
enable_resource "Practitioner"
enable_resource "Patient"
enable_resource "RelatedPerson"
enable_resource "CareTeam"
enable_resource "Organization"
enable_resource "Appointment"
enable_resource "Slot"
enable_resource "Schedule"
enable_resource "HealthcareService"
enable_resource "Consent"

# Custom/System Resources
# User and Person might already exist, but ensuring they are open
enable_resource "User"
enable_resource "Person"
