FROM node:24-alpine AS builder

WORKDIR /build

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN npm prune --production

FROM node:20-alpine

WORKDIR /app

# Git is required for git operations
RUN apk add --no-cache git

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./

# Default command
CMD ["node", "dist/index.js"]
