#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint Script - Production Ready
# Validates environment and runs migrations before starting the application
# =============================================================================

echo "========================================"
echo "  Sistema de Nomina - Iniciando..."
echo "========================================"
echo ""

# ======================
# Helper Functions
# ======================

log_info() {
  echo "[INFO] $1"
}

log_warn() {
  echo "[WARN] $1"
}

log_error() {
  echo "[ERROR] $1"
}

check_var_exists() {
  eval "value=\$$1"
  if [ -z "$value" ]; then
    return 1
  fi
  return 0
}

# ======================
# Environment Validation
# ======================

log_info "Validando variables de entorno..."

# Core required variables (always needed)
REQUIRED_VARS="DATABASE_URL JWT_SECRET ENCRYPTION_KEY"
MISSING_VARS=""

for var in $REQUIRED_VARS; do
  if ! check_var_exists "$var"; then
    MISSING_VARS="$MISSING_VARS $var"
  fi
done

if [ -n "$MISSING_VARS" ]; then
  log_error "Variables de entorno requeridas no configuradas:"
  echo "  $MISSING_VARS"
  echo ""
  echo "Por favor configure las siguientes variables:"
  echo "  DATABASE_URL    - URL de conexion a PostgreSQL"
  echo "  JWT_SECRET      - Secreto para tokens JWT (min 32 caracteres)"
  echo "  ENCRYPTION_KEY  - Clave de cifrado (min 32 caracteres)"
  echo ""
  exit 1
fi

# Validate minimum length for secrets (warn only, don't block)
JWT_LEN=$(echo -n "$JWT_SECRET" | wc -c)
ENC_LEN=$(echo -n "$ENCRYPTION_KEY" | wc -c)

if [ "$JWT_LEN" -lt 32 ]; then
  log_warn "JWT_SECRET debe tener al menos 32 caracteres (actual: $JWT_LEN)"
fi

if [ "$ENC_LEN" -lt 32 ]; then
  log_warn "ENCRYPTION_KEY debe tener al menos 32 caracteres (actual: $ENC_LEN)"
fi

# ======================
# Queue/Redis Validation
# ======================

CFDI_STAMP_MODE="${CFDI_STAMP_MODE:-sync}"
QUEUE_MODE="${QUEUE_MODE:-both}"
NODE_ENV="${NODE_ENV:-development}"

log_info "Modo de operacion: NODE_ENV=$NODE_ENV, QUEUE_MODE=$QUEUE_MODE, CFDI_STAMP_MODE=$CFDI_STAMP_MODE"

# Validate Redis vars when using async/queue modes
if [ "$CFDI_STAMP_MODE" = "async" ] || [ "$QUEUE_MODE" = "worker" ] || [ "$QUEUE_MODE" = "api" ]; then
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"

  if [ -z "$REDIS_HOST" ]; then
    log_error "REDIS_HOST es requerido cuando CFDI_STAMP_MODE=async o QUEUE_MODE=api/worker"
    exit 1
  fi

  # Validate QUEUE_MODE consistency for staging/production
  if [ "$NODE_ENV" = "staging" ] || [ "$NODE_ENV" = "production" ]; then
    if [ "$CFDI_STAMP_MODE" = "async" ]; then
      # Check if this is backend (should be api) or worker
      if [ "$1" = "node" ] && [ "$2" = "dist/main.js" ]; then
        if [ "$QUEUE_MODE" != "api" ]; then
          log_warn "En staging/prod con CFDI_STAMP_MODE=async, backend deberia usar QUEUE_MODE=api (actual: $QUEUE_MODE)"
        fi
      elif [ "$1" = "node" ] && [ "$2" = "dist/worker.js" ]; then
        if [ "$QUEUE_MODE" != "worker" ]; then
          log_warn "En staging/prod, worker deberia usar QUEUE_MODE=worker (actual: $QUEUE_MODE)"
        fi
      fi
    fi
  fi

  log_info "Verificando conexion a Redis ($REDIS_HOST:$REDIS_PORT)..."

  # Wait for Redis (max 30 seconds)
  REDIS_WAIT=0
  REDIS_MAX_WAIT=30

  while [ $REDIS_WAIT -lt $REDIS_MAX_WAIT ]; do
    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
      log_info "Redis disponible."
      break
    fi
    echo "  Esperando Redis... ($REDIS_WAIT/$REDIS_MAX_WAIT)"
    sleep 1
    REDIS_WAIT=$((REDIS_WAIT + 1))
  done

  if [ $REDIS_WAIT -ge $REDIS_MAX_WAIT ]; then
    if [ "$QUEUE_MODE" = "worker" ]; then
      log_error "Worker requiere Redis. No disponible despues de $REDIS_MAX_WAIT segundos."
      exit 1
    else
      log_warn "Redis no disponible despues de $REDIS_MAX_WAIT segundos. Continuando..."
    fi
  fi
fi

# ======================
# PAC Validation (for production)
# ======================

PAC_MODE="${PAC_MODE:-sandbox}"

if [ "$PAC_MODE" = "production" ]; then
  log_info "Validando configuracion PAC para modo produccion..."

  PAC_MISSING=""
  if ! check_var_exists "PAC_PROVIDER"; then
    PAC_MISSING="$PAC_MISSING PAC_PROVIDER"
  fi
  if ! check_var_exists "PAC_USER"; then
    PAC_MISSING="$PAC_MISSING PAC_USER"
  fi
  if ! check_var_exists "PAC_PASSWORD"; then
    PAC_MISSING="$PAC_MISSING PAC_PASSWORD"
  fi

  if [ -n "$PAC_MISSING" ]; then
    log_error "PAC_MODE=production requiere:$PAC_MISSING"
    exit 1
  fi

  log_info "Configuracion PAC validada."
fi

# ======================
# Database Connection Test
# ======================

log_info "Verificando conexion a la base de datos..."

# Extract host from DATABASE_URL for connection test
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_PORT="${DB_PORT:-5432}"

if [ -z "$DB_HOST" ]; then
  log_error "No se pudo extraer DB_HOST de DATABASE_URL"
  exit 1
fi

# Wait for database (max 60 seconds)
DB_WAIT=0
DB_MAX_WAIT=60

while [ $DB_WAIT -lt $DB_MAX_WAIT ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    log_info "Base de datos disponible ($DB_HOST:$DB_PORT)"
    break
  fi
  echo "  Esperando base de datos... ($DB_WAIT/$DB_MAX_WAIT)"
  sleep 1
  DB_WAIT=$((DB_WAIT + 1))
done

if [ $DB_WAIT -ge $DB_MAX_WAIT ]; then
  log_error "Base de datos no disponible despues de $DB_MAX_WAIT segundos"
  exit 1
fi

# ======================
# Run Migrations (Backend API only)
# ======================

# Only run migrations for backend API (not worker)
if [ "$1" = "node" ] && [ "$2" = "dist/main.js" ]; then
  log_info "Ejecutando migraciones de base de datos..."

  npx prisma migrate deploy 2>&1 || {
    log_error "Fallo al ejecutar migraciones"
    log_info "Verifique el estado con: npx prisma migrate status"
    exit 1
  }

  log_info "Migraciones completadas exitosamente."
else
  log_info "Modo worker - omitiendo migraciones (ejecutadas por backend API)"
fi

# ======================
# Display Configuration (no secrets)
# ======================

echo ""
echo "========================================"
echo "  Configuracion:"
echo "========================================"
echo "  NODE_ENV:        $NODE_ENV"
echo "  QUEUE_MODE:      $QUEUE_MODE"
echo "  CFDI_STAMP_MODE: $CFDI_STAMP_MODE"
echo "  PAC_MODE:        $PAC_MODE"
echo "  DB_HOST:         $DB_HOST"
echo "  REDIS_HOST:      ${REDIS_HOST:-N/A}"
echo "========================================"
echo ""

# ======================
# Start Application
# ======================

log_info "Iniciando aplicacion: $@"
exec "$@"
