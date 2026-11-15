# ADR-0011: Citizen issues, weekly votes, community moderation and an audit log

- **Status:** Accepted
- **Date:** 2026-11-15

## Context
The project's original idea: *"people can tell their problems, and on a weekly basis the problems will be highlighted"*.
Open user content invites spam, brigading, abuse and privacy leaks, so the design needs guard-rails from day one.

## Decision
**Issues**
- An issue belongs to the **Lok Sabha seat** of its PIN code (largest share of post offices), so issues roll up to an MP.
- Optional photo, **decoded and re-encoded** to WebP (max 1600 px) with sharp. This drops all EXIF metadata, including
  **GPS coordinates** phones embed, and neutralises non-image files. Random file names (UUID), immutable caching.
- Public display name is **first name + initial** ("Priya S.").
- Limit: 5 reports per user per day.

**Votes**
- One vote per user, per issue, **per week** (Monday–Sunday, India time), enforced by the composite primary key
  `(user_id, issue_id, week_start)`. You can't vote for your own report or for resolved issues.
- **Weekly highlights:** a separate **worker process** (croner, every Monday 00:05 IST) ranks each constituency's issues
  by that week's votes using `row_number() OVER (PARTITION BY …)` and stores the top 5 in `weekly_issue_rankings`.
  The job is idempotent and catches up if the worker was down.

**Moderation**
- Any user can report a post (one report per user). **3 independent reports auto-hide** it until a moderator acts.
- Moderators: hide, restore, acknowledge, resolve, dismiss reports, each with a mandatory note.
- **Promise submissions:** citizens submit promises with a source; verifiers approve (creating the promise through the
  same rules as direct entry) or reject with a note the submitter sees.
- **Audit log:** every staff action and every automatic action is appended to `audit_log` in the **same transaction**
  as the change it records.

## Alternatives considered
- **Votes without weeks:** old issues would dominate forever; weekly windows keep the list about *now*.
- **Rankings computed on every page view:** fine at small scale, but a frozen snapshot is what makes "last week's
  highlights" a stable, citable record.
- **Pre-moderation of every issue:** safest, but slow and unsustainable for volunteers. Post-moderation with
  community flags scales better.

## Consequences
- ✅ Double voting is impossible even under race conditions; anonymous visitors still see everything public.
- ✅ Every moderation decision is accountable.
- ⚠️ Determined brigading with many fake accounts is still possible; email/phone verification is planned for Phase 4.
