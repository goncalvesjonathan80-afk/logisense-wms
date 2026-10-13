#!/bin/sh
set -e

echo "======================================================================"
echo "🚀 LOGISENSE WMS — Inicializando Serviço Web em Produção (Railway)"
echo "======================================================================"

# Garantir que o diretório de montagem do volume exista
mkdir -p "${RAILWAY_VOLUME_MOUNT_PATH:-/data}"

# Inicialização segura do banco SQLite no volume persistente montado em runtime
echo "📦 Verificando integridade e persistência do banco SQLite..."
node /app/backend/scripts/db-init.js

# Iniciar servidor Express (servindo API REST e Frontend SPA)
echo "🌐 Iniciando servidor web Express..."
exec node /app/backend/dist/server.js
