FROM node:24-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src ./src

RUN npm run build

FROM debian:trixie-slim

WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y git ca-certificates curl gnupg libicu-dev build-essential && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN npm install -g prettier oxlint

RUN curl -L --fail https://github.com/WGUNDERWOOD/tex-fmt/releases/latest/download/tex-fmt-x86_64-linux.tar.gz -o tex-fmt.tar.gz && tar -xzf tex-fmt.tar.gz -C /usr/local/bin/ && rm tex-fmt.tar.gz

ENV PATH="/root/.cargo/bin:${PATH}"

RUN curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --version latest
ENV PATH="/root/.dotnet:${PATH}"
# Used to hide informations shown on first run of dotnet format
RUN dotnet format --version

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./
