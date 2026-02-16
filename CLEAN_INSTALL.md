# HCBS Platform — Clean Install & Troubleshooting Guide

## Quick Clean Start

```bash
# 1. Kill any processes holding onto platform ports
sudo fuser -k 4317/tcp 4318/tcp 8080/tcp 9070/tcp 9080/tcp 9090/tcp 9081/tcp 16686/tcp

# 2. Tear down all containers and networks
docker compose down

# 3. Bring everything up fresh
docker compose up -d

# 4. Wait ~20s for Aidbox to initialize, then verify
docker compose ps -a
docker compose logs aidbox --tail 5
# You should see: "Aidbox instance is up and running on: http://localhost:8080"

# 5. Seed data (creates OAuth client + test users)
bash seed_data.sh

# 6. Start local services (in separate terminals)
cd backend  && npm run dev   # Backend API
cd restate  && npm run dev   # Restate SDK handlers (port 9081)
```

## Port Reference

| Port  | Service                        | Type            |
|-------|--------------------------------|-----------------|
| 8080  | Aidbox FHIR server             | Docker          |
| 5432  | PostgreSQL (internal only)     | Docker          |
| 9090  | Restate Server (gRPC)          | Docker          |
| 9080  | Restate Server (Ingress)       | Docker          |
| 9070  | Restate Server (Admin API)     | Docker          |
| 9081  | Restate SDK handlers           | Local (npm dev) |
| 4317  | Jaeger (OTLP gRPC)            | Docker          |
| 4318  | Jaeger (OTLP HTTP)            | Docker          |
| 16686 | Jaeger UI                      | Docker          |

## Common Issues

### "address already in use" on `docker compose up`
A leftover process is holding a port. Kill it:
```bash
sudo fuser -k <port>/tcp
```
Or kill all platform ports at once (see step 1 above).

### Aidbox shows "retry-connection The connection attempt failed"
Aidbox can't reach PostgreSQL. This usually means the Docker network wasn't recreated properly. Fix:
```bash
docker compose down   # removes containers AND the network
docker compose up -d  # recreates everything fresh
```
> **Key insight:** `docker compose up -d` alone reuses existing containers. You need `down` first to force a full recreate with correct networking.

### Restate SDK (npm) crashes with EADDRINUSE on 9081
A previous `npm run dev` instance is still running. Kill it:
```bash
sudo fuser -k 9081/tcp
npm run dev
```

### Login returns "Invalid credentials" after seeding users
The Aidbox OAuth `Client/hcbs-backend` is missing. The login flow uses Aidbox's password grant (`POST /auth/token`) which requires this client to exist. Fix:
```bash
curl -X PUT -u root:6xJ9RhtVB2 http://localhost:8080/Client/hcbs-backend \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Client",
    "id": "hcbs-backend",
    "secret": "hcbs-backend-secret",
    "grant_types": ["password"],
    "auth": { "password": { "secret_required": true, "access_token_expiration": 86400 } }
  }'
```
> **Note:** `seed_data.sh` now creates this client automatically (step 5 above). This issue only occurs if you skip seeding or do a fresh Aidbox reset without re-seeding.

### Nuclear Option — Full Reset (destroys data)
```bash
docker compose down -v   # -v also removes volumes (deletes Postgres data)
docker compose up -d
bash seed_data.sh         # re-seed OAuth client + users
```

## Architecture Note

There are **two Restate components** — they serve different roles:

- **Restate Server** (Docker container) — The runtime/orchestrator that manages state, retries, and workflow execution
- **Restate SDK Service** (local `npm run dev`) — Your application handler code that registers with the server

Both must be running for the system to work.
