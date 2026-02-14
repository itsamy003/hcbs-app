# HCBS Platform

A production-ready Home and Community Based Services (HCBS) platform built with modern technologies.

## Tech Stack

- **Frontend**: React (Vite), TypeScript, TailwindCSS, Zustand, React Query.
- **Backend**: Node.js, Express, TypeScript, Zod.
- **Workflow Engine**: Restate (Durable Execution).
- **Data Layer**: Aidbox (FHIR R4 Server) + PostgreSQL.

## Prerequisites
- Docker & Docker Compose
- Node.js (v18+)

## Quick Start

### 1. Start Infrastructure
Start Aidbox and Restate containers:
```bash
cd hcbs-platform
docker-compose up -d
```
*Note: Ensure you have a valid Aidbox License key in your environment or update `docker-compose.yml`.*

### 2. Setup Backend
```bash
cd backend
npm install
npm run dev
```
The backend runs on `http://localhost:3000`.

### 3. Setup Restate Service
This service handles workflows like Patient Onboarding and Appointment Booking.
```bash
cd restate
npm install
npm run dev
```
The service runs on port `9081`.

**Register the service with Restate:**
(Run this after starting the restate service)
```bash
restate deployments register http://localhost:9081
```

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend runs on `http://localhost:5173`.

## Usage

### 1. Authentication
- Access `http://localhost:5173`.
- **Sign Up** is supported via API `./backend/src/controllers/authController.ts` but Frontend currently only has Login.
- To create users, you can use Postman to call `POST http://localhost:3000/auth/signup`.
  - **Practitioner**: `{ "type": "practitioner", "email": "dr@hcbs.com", "password": "pass", "firstName": "John", "lastName": "Doe" }`
  - **Patient**: `{ "type": "patient", "email": "pat@hcbs.com", "password": "pass", "firstName": "Jane", "lastName": "Smith", "dob": "1990-01-01" }`
  - **Guardian**: `{ "type": "guardian", "email": "guard@hcbs.com", "password": "pass", "firstName": "Gary", "lastName": "Smith" }`

### 2. Workflows
- **Guardian Dashboard**: Add a dependent patient. Triggers Restate workflow to creating Patient, RelatedPerson, and CareTeam.
- **Practitioner Dashboard**: Post availability.
- **Appointments**: Guardian/Patient can book appointments. Triggers Restate workflow to lock slots and book.

## Architecture

- **Monorepo Structure**:
  - `backend/`: REST API acting as Gateway. Auth & Validation.
  - `frontend/`: Single Page Application (SPA).
  - `restate/`: Workflow microservices.
  - `docker-compose.yml`: Infrastructure.
