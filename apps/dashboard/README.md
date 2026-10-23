# ForgeOps Dashboard

The dashboard uses the Cloud API for normal sign-in and resource requests. Its
optional interactive preview contains synthetic records for every Prisma model
and never sends those records to the Cloud API or stores them persistently.

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

From the sign-in screen, select **Explore interactive preview** to enter a
separate in-memory sample workspace. Preview records cover all 21 dashboard
resources, including successful and failed states, pending approvals, retries,
and trace spans. You can explore and edit these records, try deterministic
sample chat replies, and simulate tool approvals; no external actions are
executed. The preview is visibly labeled and resets when you leave it or reload
the page. It does not use the live API, local storage, real credentials,
passwords, or usable secret material. Fields that represent hashes or encrypted
values contain inert placeholders, and vector embeddings are not fabricated.

No API key belongs in browser code. The dashboard sends the signed-in
session's bearer token. For production, prefer an HttpOnly server-managed
session over browser storage and enforce all tenant access in the Cloud API.

## Validation

```sh
npm run lint
npm run build
```
