# syntax=docker/dockerfile:1.7
#
# ===============================
# Base
# ===============================
FROM node:22-bookworm-slim AS base
WORKDIR /app

# ===============================
# Development Dependencies
# ===============================
FROM base AS deps

ARG OCI_TITLE
ARG OCI_DESC
ARG OCI_VENDOR
ARG OCI_SOURCE
ARG OCI_URL
ARG OCI_DOCS
ARG OCI_LICENSE

LABEL \
    org.opencontainers.image.vendor="$OCI_VENDOR" \
    org.opencontainers.image.title="$OCI_TITLE" \
    org.opencontainers.image.description="$OCI_DESC" \
    org.opencontainers.image.source="$OCI_SOURCE" \
    org.opencontainers.image.url="$OCI_URL" \
    org.opencontainers.image.documentation="$OCI_DOCS" \
    org.opencontainers.image.licenses="$OCI_LICENSE"

COPY backends/nest/package.json \
     backends/nest/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ===============================
# Development
# ===============================
FROM deps AS development
ENV NODE_ENV=development
COPY backends/nest .
EXPOSE 8000
CMD ["npm", "run", "start:dev"]

# ===============================
# Testing
# ===============================
FROM deps AS test
ENV NODE_ENV=test
COPY backends/nest .
CMD ["npm", "test"]

# ===============================
# Builder
# ===============================
FROM deps AS builder
COPY backends/nest .
RUN npm run build

# ===============================
# Production Dependencies
# ===============================
FROM base AS prod-deps
COPY backends/nest/package.json \
     backends/nest/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ===============================
# Production
# ===============================
FROM node:22-bookworm-slim AS production

ARG OCI_VERSION
ARG OCI_REVISION
ARG OCI_CREATED
ARG OCI_TITLE
ARG OCI_DESC
ARG OCI_VENDOR
ARG OCI_SOURCE
ARG OCI_URL
ARG OCI_DOCS
ARG OCI_LICENSE

LABEL \
    org.opencontainers.image.vendor="$OCI_VENDOR" \
    org.opencontainers.image.title="$OCI_TITLE" \
    org.opencontainers.image.description="$OCI_DESC" \
    org.opencontainers.image.source="$OCI_SOURCE" \
    org.opencontainers.image.url="$OCI_URL" \
    org.opencontainers.image.documentation="$OCI_DOCS" \
    org.opencontainers.image.licenses="$OCI_LICENSE" \
    org.opencontainers.image.version="$OCI_VERSION" \
    org.opencontainers.image.revision="$OCI_REVISION" \
    org.opencontainers.image.created="$OCI_CREATED"

WORKDIR /app
ENV NODE_ENV=production

COPY \
    --from=prod-deps \
    --chown=node:node \
    /app/node_modules ./node_modules
COPY \
    --from=builder \
    --chown=node:node \
    /app/dist ./dist
COPY \
    --chown=node:node \
    backends/nest/package.json \
    backends/nest/package-lock.json ./

USER node
EXPOSE 8000
CMD ["node", "dist/main.js"]