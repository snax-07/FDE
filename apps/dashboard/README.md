# ForgeOps Dashboard

The dashboard uses the Cloud API and contains no seeded records, mock
credentials, or local CRUD fallback.

## Run locally

```sh
npm install
npm run dev
```

The Cloud API listens on `http://localhost:8000` by default. Override the
dashboard API base URL with `NEXT_PUBLIC_API_BASE_URL` if needed. Login and
registration use the Cloud auth routes and Prisma tenant/user schema.

## Data API

Dashboard resources are requested from authenticated `/api/v1` endpoints using
the current bearer session. Resource routes use plural kebab-case names, for
example `GET /api/v1/agent-runs?tenantId=...` and
`PATCH /api/v1/documents/:id`. List and mutation responses are expected as
`{ "success": true, "data": ... }`.

The Cloud server currently registers auth and health routes only. Until the
resource routes are implemented there, the dashboard shows the API errors
instead of substituting local sample data. Agent chat/configuration also remain
unavailable because the Cloud API and Prisma schema do not define those
endpoints/resources yet.

No API key belongs in browser code. The dashboard sends the signed-in
session's bearer token. For production, prefer an HttpOnly server-managed
session over browser storage and enforce all tenant access in the Cloud API.

## Validation

```sh
npm run lint
npm run build
```
