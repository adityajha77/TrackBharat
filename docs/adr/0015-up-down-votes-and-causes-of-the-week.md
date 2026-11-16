# ADR-0015: Up/down votes and India's Causes of the Week

- **Status:** Accepted
- **Date:** 2026-11-16

## Context
An upvote alone can't tell "many people face this" from "a few people are loud". Neighbours should be able to *dispute*
a report, and the home page needs a simple national question to vote on every week.

## Decision
- **Votes are +1 / −1.** `issue_votes.value` (CHECK −1 or 1). Still one vote per person, per issue, per week (composite
  primary key), so voting again is an UPSERT that switches direction; voting the same way again takes the vote back.
  Labels: issues "Faced this too / Not accurate"; causes "Affects me / Not my issue".
- **Rankings use net votes** (ups − downs), and an issue with net ≤ 0 is never "top of the week".
- **Causes of the Week:** every Monday 00:05 IST the worker (`jobs/pick-causes.ts`) picks the 5 categories with the most new
  reports + net votes in the week before (widening to 4 weeks if fewer than 3 had activity), across real (non-demo,
  non-hidden) issues. The evidence (report count, states, 3 example issues) is frozen with the pick. Moderators may reword or
  pin a cause (audited); re-running the job keeps their edits.
- **Anti-brigading:** only votes from **email-verified** accounts count. The vote row stores `counted` at vote time, and
  verifying the email flips the account's earlier votes to counted. Votes are rate-limited per account and per IP.
- **Sharing** uses plain intent links (X, WhatsApp, Facebook, Telegram) and the Web Share API. We never post on anyone's
  behalf and never ask for their social accounts.

## Alternatives considered
- **Weighted or Reddit-style "hot" ranking.** Harder to explain; net votes inside a fixed week are simple and fair.
- **Phone/OTP verification.** Stronger, but costs money per SMS and collects phone numbers (data minimisation). Email first.

## Consequences
- ✅ Disputed reports sink; widely felt problems rise; every number is explainable.
- ⚠️ A determined group with many verified emails can still push a cause; moderators can see vote patterns in the DB.
