#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint Script
# Validates environment and runs migrations before starting the application
# =============================================================================

echo "========================================"
echo "  Sistema de Nomina - Iniciando..."
echo "========================================"
echo ""

# ======================
# Environment Validation
# ======================

REQUIRED_VARS="DATABASE_URL JWT_SECRET ENCRYPTION_KEY"
MISSING_VARS=""

for var in $REQUIRED_VARS; do
  eval "value=\$$var"
  if [ -z "$value" ]; then
    MISSING_VARS="$MISSING_VARS $var"
  fi
done

if [ -n "$MISSING_VARS" ]; then
  echo "ERROR: Variables de entorno requeridas no configuradas:"
  echo "  $MISSING_VARS"
  echo ""
  echo "Por favor configure las siguientes variables:"
  echo "  DATABASE_URL    - URL de conexion a PostgreSQL"
  echo "  JWT_SECRET      - Secreto para tokens JWT (min 32 caracteres)"
  echo "  ENCRYPTION_KEY  - Clave de cifrado (min 32 caracteres)"
  echo ""
  exit 1
fi

# Validate minimum length for secrets
JWT_LEN=$(echo -n "$JWT_SECRET" | wc -c)
ENC_LEN=$(echo -n "$ENCRYPTION_KEY" | wc -c)

if [ "$JWT_LEN" -lt 32 ]; then
  echo "WARNING: JWT_SECRET debe tener al menos 32 caracteres (actual: $JWT_LEN)"
fi

if [ "$ENC_LEN" -lt 32 ]; then
  echo "WARNING: ENCRYPTION_KEY debe tener al menos 32 caracteres (actual: $ENC_LEN)"
fi

# ======================
# Redis Validation (if async mode)
# ======================

CFDI_STAMP_MODE="${CFDI_STAMP_MODE:-sync}"
QUEUE_MODE="${QUEUE_MODE:-both}"

if [ "$CFDI_STAMP_MODE" = "async" ] || [ "$QUEUE_MODE" = "worker" ] || [ "$QUEUE_MODE" = "api" ]; then
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"

  echo "Modo de cola: $QUEUE_MODE (CFDI_STAMP_MODE: $CFDI_STAMP_MODE)"
  echo "Verificando conexion a Redis ($REDIS_HOST:$REDIS_PORT)..."

  # Wait for Redis (max 30 seconds)
  REDIS_WAIT=0
  REDIS_MAX_WAIT=30

  while [ $REDIS_WAIT -lt $REDIS_MAX_WAIT ]; do
    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
      echo "Redis disponible."
      break
    fi
    echo "Esperando Redis... ($REDIS_WAIT/$REDIS_MAX_WAIT)"
    sleep 1
    REDIS_WAIT=$((REDIS_WAIT + 1))
  done

  if [ $REDIS_WAIT -ge $REDIS_MAX_WAIT ]; then
    echo "WARNING: Redis no disponible despues de $REDIS_MAX_WAIT segundos"
    if [ "$QUEUE_MODE" = "worker" ]; then
      echo "ERROR: Worker requiere Redis. Abortando."
      exit 1
    fi
  fi
fi

# ======================
# Database Connection Test
# ======================

echo ""
echo "Verificando conexion a la base de datos..."

# Extract host from DATABASE_URL for connection test
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_PORT="${DB_PORT:-5432}"

# Wait for database (max 60 seconds)
DB_WAIT=0
DB_MAX_WAIT=60

while [ $DB_WAIT -lt $DB_MAX_WAIT ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "Base de datos disponible ($DB_HOST:$DB_PORT)"
    break
  fi
  echo "Esperando base de datos... ($DB_WAIT/$DB_MAX_WAIT)"
  sleep 1
  DB_WAIT=$((DB_WAIT + 1))
done

if [ $DB_WAIT -ge $DB_MAX_WAIT ]; then
  echo "ERROR: Base de datos no disponible despues de $DB_MAX_WAIT segundos"
  exit 1
fi

# ======================
# Run Migrations
# ======================

echo ""
echo "Ejecutando migraciones de base de datos..."

# Only run migrations for backend (not worker)
if [ "$1" = "node" ] && [ "$2" = "dist/main.js" ]; then
  npx prisma migrate deploy || {
    echo "ERROR: Fallo al ejecutar migraciones"
    echo "Verifique el estado de la base de datos con: npx prisma migrate status"
    exit 1
  }
  echo "Migraciones completadas exitosamente."
else
  echo "Modo worker - omitiendo migraciones (ejecutadas por backend)"
fi

# ======================
# Display Configuration
# ======================

echo ""
echo "========================================"
echo "  Configuracion:"
echo "========================================"
echo "  NODE_ENV:        ${NODE_ENV:-development}"
echo "  QUEUE_MODE:      $QUEUE_MODE"
echo "  CFDI_STAMP_MODE: $CFDI_STAMP_MODE"
echo "  PAC_MODE:        ${PAC_MODE:-sandbox}"
echo "========================================"
echo ""

# ======================
# Start Application
# ======================

echo "Iniciando aplicacion..."
exec "$@"
