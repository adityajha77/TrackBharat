# ADR-0008: Promises are recorded only with a source, and the database enforces it

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
A promise tracker makes claims about real, named politicians. An unsourced or invented claim is misinformation,
damages trust in the whole site, and can be defamatory. The project also needs sample data to develop and demonstrate
the tracker before real promises are curated.

## Decision
1. **No source, no claim, enforced at three layers:**
   - the shared Zod schema requires an `https://` source on every write (`CreatePromiseInput`, status updates, evidence);
   - `promises.source_id`, `promise_status_history.source_id` and `evidence.source_id` are `NOT NULL` in Postgres;
   - a CHECK constraint requires every promise to have a maker (a representative's term or a party).
2. **Status history is append-only.** A status change inserts a `promise_status_history` row (with its own source);
   `promises.status` is a convenience copy of the latest row. Nothing is overwritten, so the full timeline is auditable.
3. **Parties are never created from free text** on write paths; an unknown party name is a 404, not a new row.
4. **Demo data is fictional and labelled.** The seed creates "Demo Nagar" (fictional state, person and party), all
   flagged `is_demo` and shown with a "Demo data" banner. **Invented promises are never attached to real people, even locally.**
5. **Admin writes use a temporary bearer token** (`ADMIN_API_TOKEN`; unset = disabled), compared in constant time.
   Phase 2 replaces it with accounts, roles (citizen / verifier / moderator / admin) and an audit log.

## Consequences
- ✅ The trust rules can't be bypassed by a buggy client or a forgotten check: the database refuses.
- ✅ Real constituencies honestly show "No promises tracked yet" until curated, sourced data exists.
- ⚠️ Curating real promises is slow, careful work. Phase 2's verifier role and a review queue are designed for it.
