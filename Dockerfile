FROM node:24-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src ./src

RUN npm run build

FROM debian:bookworm-slim

WORKDIR /app

# Git is required for git operations
RUN apt-get update && apt-get install -y git ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash && \
    export NVM_DIR="$HOME/.nvm" && \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    nvm install 24 && \
    nvm use 24

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./

# Use Bash as the default shell
ENTRYPOINT ["/bin/bash", "-c"]
