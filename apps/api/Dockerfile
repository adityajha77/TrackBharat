# syntax=docker/dockerfile:1
# Multi-stage build: stage 1 has compilers and dev tools; the final image only
# has what's needed to RUN, so it's smaller (faster deploys) and safer (fewer packages to exploit).
# Build from the repo root:  docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# --- deps: install with only manifests copied, so Docker caches this layer
#     and skips reinstalling unless a package.json / lockfile changed.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @trackbharat/api...

# --- build: compile TypeScript into a single bundle with tsup
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @trackbharat/api build \
 && pnpm --filter @trackbharat/api deploy --prod --legacy /out

# --- runtime: production deps + compiled JS + SQL migrations, nothing else
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/drizzle ./drizzle
COPY --from=build /repo/apps/api/package.json ./
# Leader photos (free licences, credited on the site) ship with the image: the database only stores their keys.
COPY --from=build /repo/apps/api/leader-photos ./leader-photos
ENV LEADER_PHOTOS_DIR=/app/leader-photos UPLOADS_DIR=/data/uploads
# Never run as root inside the container
# Writable folder for uploaded photos (mounted as a volume in compose)
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/server.js"]
