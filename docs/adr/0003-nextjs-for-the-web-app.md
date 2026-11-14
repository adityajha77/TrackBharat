# ADR-0003: Next.js (App Router) for the web app

- **Status:** Accepted
- **Date:** 2026-11-15
- **Supersedes:** Vite + React Router SPA (v1, Lovable-generated)

## Context
TrackBharat's pages, such as "PIN 560034", "MP for Bangalore South" or "Promise: new metro line", should be
**findable on Google and shareable on WhatsApp with a proper preview**. A client-side SPA sends an empty HTML page
and fills it with JavaScript; crawlers and link previews see little. Many users are on low-end phones and slow networks.

## Decision
**Next.js 16 with the App Router and Cache Components**: React Server Components by default, client components only
for interactivity, `"use cache"` for cross-request caching, `<Suspense>` streaming for request-time data. Tailwind CSS v4
with our own design tokens and a handful of hand-written UI primitives.

## Alternatives considered
- **Keep Vite SPA.** Simple, but poor SEO/link previews and more JS shipped to phones.
- **Astro.** Excellent for content sites, but we'll need rich interactivity (issue reporting, dashboards) and React skills transfer to React Native.
- **Remix / React Router framework mode.** A solid option; Next.js has the larger ecosystem, Vercel's preview deploys, and more learning resources.

## Consequences
- ✅ Server-rendered HTML, per-page metadata, small JS bundles.
- ✅ Same React knowledge reused for the mobile app (React Native / Expo).
- ⚠️ Must learn the server/client component boundary and Cache Components rules (dynamic data inside `<Suspense>`).
- ⚠️ Streaming means a 404 found mid-stream is sent with HTTP 200 (noindex is still applied).
- 🧹 Removed all Lovable artifacts: `lovable-tagger`, ~50 unused shadcn components, Supabase client.
