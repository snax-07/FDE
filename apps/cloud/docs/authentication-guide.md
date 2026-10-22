# Authentication in the cloud app

This guide walks through the authentication code in this project. The API uses
tenant-scoped email/password accounts and opaque bearer session tokens. It does
not use JWTs: the token is random, only its SHA-256 hash is stored in the
database, and every protected request checks that its database session is
active.

## What is implemented

- Register a new tenant and its first `OWNER` account.
- Sign in with a tenant slug, email, and password.
- Authenticate protected endpoints with `Authorization: Bearer <token>`.
- View the signed-in account, sign out, and change the password.
- Request a password reset and use a one-time, one-hour reset link.
- Revoke all sessions after a password change or reset.

## Files to read

1. `prisma/schema.prisma` defines `User`, `Session`, and
   `PasswordResetToken`. The reset token is stored as a hash, not as the
   emailed token.
2. `src/http/schemas/v1/auth.schema.ts` validates and normalizes input before
   it reaches business logic.
3. `src/modules/auth/auth.routes.ts` defines HTTP routes and response codes.
4. `src/modules/auth/auth.service.ts` contains registration, login, and
   password/session operations.
5. `src/http/middleware/authentication.ts` verifies bearer tokens and attaches
   the authenticated user and tenant to the request.
6. `src/modules/auth/password-reset-email.ts` sends reset links through Resend.
7. `src/bootstrap/register-routes.ts` mounts auth routes at
   `/api/v1/auth`; `src/app.ts` registers plugins and routes.

## Set up and run

The cloud app reads `apps/cloud/.env`. Keep that file private and do not commit
it. In addition to your existing `DATABASE_URL`, configure:

```dotenv
RESEND_API_KEY=re_your_resend_api_key
AUTH_EMAIL_FROM=Your App <no-reply@your-verified-domain.example>
AUTH_RESET_URL=https://your-frontend.example/reset-password
```

Verify the sender domain with Resend before expecting email delivery. The reset
URL is the frontend page that reads the `token` query parameter and submits it
to the API. The secret reset token is never returned by the API or written to
logs.

From `apps/cloud`, apply the schema change and generate the Prisma client:

```sh
npx prisma migrate dev --name add_password_reset_tokens
npx prisma generate
npm run dev
```

The migration is required before the password-reset routes can use the new
table. Do not use `migrate dev` as a production deployment command; deploy a
reviewed migration with your normal production migration process.

## Endpoints

All endpoints below are prefixed by `/api/v1/auth`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/register` | Create a tenant and its first owner |
| `POST` | `/login` | Create a seven-day bearer session |
| `POST` | `/password/forgot` | Send a reset link when the account exists |
| `POST` | `/password/reset` | Consume a valid reset token and set a new password |
| `POST` | `/password/change` | Change the signed-in user's password |
| `POST` | `/logout` | Revoke the current session |
| `GET` | `/me` | Return the signed-in user and tenant ID |

### Register

```json
{
  "tenantName": "Acme",
  "tenantSlug": "acme",
  "email": "owner@example.com",
  "password": "a-long-unique-password"
}
```

The tenant slug must be unique. The first user is assigned `OWNER`; never let a
public request choose its own role.

### Login

```json
{
  "tenantSlug": "acme",
  "email": "owner@example.com",
  "password": "a-long-unique-password"
}
```

The response contains `accessToken`, `tokenType`, and `expiresAt`. Send the
token to protected routes in this header:

```http
Authorization: Bearer <accessToken>
```

The token is a random opaque session credential, not a self-contained JWT.
The server hashes it and looks up its session on each request, which lets
logout and password changes revoke it immediately.

### Forgot and reset password

Request a reset link:

```json
{
  "tenantSlug": "acme",
  "email": "owner@example.com"
}
```

The endpoint returns the same `202` response whether or not the account
exists. When Resend is configured and the account is active, the email link
contains a random one-time token. The frontend should submit that token and the
new password:

```json
{
  "token": "<token-from-the-reset-link>",
  "password": "another-long-unique-password"
}
```

Reset tokens expire after one hour and can only be consumed once. A successful
reset revokes every session for that user, so they must sign in again.

## Follow the flow in the code

For a new endpoint, use this same sequence:

1. Add the request shape to `auth.schema.ts`; parse untrusted request data with
   Zod before using it.
2. Add a route in `auth.routes.ts`; keep HTTP concerns here (status codes,
   headers, and response shapes).
3. Put database and password/session rules in `auth.service.ts`, not in the
   route handler.
4. For protected routes, add `preHandler: authenticate` and use the attached
   `request.auth` values. Use `tenantId` from the authenticated session to
   scope database reads and writes; do not trust a tenant ID supplied by a
   client.
5. Keep response data explicit. Never return `passwordHash`, reset-token
   hashes, or raw reset tokens.

## Important production checks

- Enforce HTTPS. Rate-limit login, registration, and password-reset requests
  at the app or trusted edge; this example does not include a distributed
  rate limiter.
- Add email verification/invitations before allowing additional users to join
  an existing tenant. Registration here intentionally creates a new tenant
  rather than accepting an arbitrary tenant ID.
- For browser clients, prefer a `Secure`, `HttpOnly`, appropriately
  `SameSite` cookie and CSRF protection over exposing bearer tokens to
  JavaScript. The current API returns bearer tokens for clients that manage
  them securely.
- Add integration tests with a disposable PostgreSQL database for duplicate
  tenant slugs, invalid credentials, expired/reused reset tokens, logout, and
  cross-tenant access.
- Keep Resend credentials in a secret manager in production. Email delivery
  failures are logged without returning whether an account exists.
