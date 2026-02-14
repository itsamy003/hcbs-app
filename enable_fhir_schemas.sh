#!/bin/bash

BASE_URL="http://127.0.0.1:8080/fhir"
AUTH="root:6xJ9RhtVB2"
CONTENT_TYPE="Content-Type: application/json"

enable_fhir_schema() {
  RESOURCE=$1
  echo "Enabling FHIRSchema for $RESOURCE..."
  # Minimal payload to enable standard FHIR attribute
  curl -X PUT -u $AUTH "$BASE_URL/FHIRSchema/$RESOURCE" \
    -H "$CONTENT_TYPE" \
    -d "{
      \"resourceType\": \"FHIRSchema\",
      \"id\": \"$RESOURCE\",
      \"url\": \"http://hl7.org/fhir/StructureDefinition/$RESOURCE\",
      \"name\": \"$RESOURCE\",
      \"type\": \"$RESOURCE\",
      \"derivation\": \"specialization\",
      \"kind\": \"resource\",
      \"status\": \"active\"
    }"
  echo ""
}

# Core Resources
enable_fhir_schema "Practitioner"
enable_fhir_schema "Patient"
enable_fhir_schema "RelatedPerson"
enable_fhir_schema "CareTeam"
enable_fhir_schema "Organization"
enable_fhir_schema "Appointment"
enable_fhir_schema "Slot"
enable_fhir_schema "Schedule"
enable_fhir_schema "HealthcareService"
enable_fhir_schema "Consent"
enable_fhir_schema "User"
enable_fhir_schema "Person"
enable_fhir_schema "Session"
enable_fhir_schema "Client"
enable_fhir_schema "AccessPolicy"
