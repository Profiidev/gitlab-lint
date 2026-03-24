FROM node:24-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src ./src

RUN npm run build

FROM node:24-alpine

WORKDIR /app

# Git is required for git operations
RUN apk add --no-cache git

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./

# Default command
CMD ["node", "dist/index.mjs"]
