# ==============================================================================
# LOGISENSE WMS — Dockerfile Multi-stage para Railway Single-Service
# ==============================================================================

# ------------------------------------------------------------------------------
# Estágio 1: Build do Frontend (React + Vite + TypeScript)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Estágio 2: Build do Backend (Node.js + Express + Prisma + TypeScript)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend

# Instalação de dependências nativas para compilação do Prisma com OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Estágio 3: Imagem Final de Execução (Runner)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_URL=file:/data/logisense.db
ENV RAILWAY_VOLUME_MOUNT_PATH=/data
ENV CLIENT_DIST_PATH=/app/frontend/dist

# Pacotes essenciais de runtime e init process
RUN apt-get update && apt-get install -y openssl ca-certificates dumb-init && rm -rf /var/lib/apt/lists/*

# Diretório base para montagem do Railway Volume persistente em runtime
RUN mkdir -p /data

# Copiar frontend estático compilado
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Configuração e dependências de produção do backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copiar Prisma schema, scripts de inicialização defensiva e backend compilado
COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/scripts ./scripts
COPY --from=backend-builder /app/backend/dist ./dist

# Script de entrada para execução com dumb-init
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

WORKDIR /app
EXPOSE 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/app/docker-entrypoint.sh"]
