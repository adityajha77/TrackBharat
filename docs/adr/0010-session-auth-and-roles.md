# ADR-0010: Session-token authentication with roles, owned by the API

- **Status:** Accepted
- **Date:** 2026-11-15
- **Supersedes:** the temporary `ADMIN_API_TOKEN` from ADR-0008

## Context
Phase 2 lets citizens report issues and vote, and lets staff moderate and verify. We need accounts that work for the
web app now and the mobile app later, can be **revoked instantly** (logout, blocking an abuser), and give staff roles.

## Decision
- **Passwords:** Argon2id (`@node-rs/argon2`, OWASP minimum parameters). Minimum length 10, no complexity theatre.
- **Sessions:** on login the API creates 32 random bytes (base64url) and returns them **once**; the `sessions` table
  stores only `sha256(token)`. Requests send `Authorization: Bearer <token>`. 30-day sliding expiry, extended at most
  once a day.
- **Web app:** keeps the token in an **httpOnly, SameSite=Lax, Secure (prod)** cookie set by a Server Action, and
  forwards it to the API from server code. The browser never talks to the API directly.
- **Roles:** `CITIZEN` (default), `VERIFIER` (promises, review queue), `MODERATOR` (issues), `ADMIN` (all). Enforced
  by Fastify `preHandler` guards: 401 = not logged in, 403 = wrong role. Roles are granted only from the CLI
  (`pnpm user:role`), never via an HTTP endpoint.
- **Anti-enumeration:** unknown email and wrong password return the same message and take the same time (we verify
  against a dummy hash). Strict rate limit (10/min/IP) on auth routes.

## Alternatives considered
- **JWTs.** Stateless and popular, but can't be revoked before expiry without adding a denylist (i.e. sessions again).
- **Auth-as-a-service (Supabase Auth, Clerk, Auth0).** Faster, but it's a core security concept worth understanding,
  and it adds a vendor for the most sensitive data we hold.
- **OAuth "Login with Google".** Good later as an *additional* option; many Indian users don't want to link accounts.

## Consequences
- ✅ Logout and blocking are instant (delete rows); a database leak exposes no usable tokens or passwords.
- ✅ The same tokens work for the future mobile app (stored in the OS secure keychain).
- ⚠️ No email verification or password reset yet. Both need an email provider (Phase 4).
