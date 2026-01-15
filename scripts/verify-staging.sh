#!/bin/bash
# =============================================================================
# verify-staging.sh - Verification script for staging deployment
# =============================================================================
#
# Usage:
#   ./scripts/verify-staging.sh [--env-file .env.staging]
#
# Prerequisites:
#   - Docker and docker compose installed
#   - .env.staging file configured (or use --env-file)
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env.staging"
COMPOSE_FILE="docker-compose.staging.yml"
MAX_WAIT=120

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--env-file FILE] [--compose-file FILE]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Sistema de Nomina - Staging Verification${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# ======================
# 1. Environment Check
# ======================
echo -e "${YELLOW}[1/6] Verificando archivo de entorno...${NC}"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}  ❌ No se encontró $ENV_FILE${NC}"
  echo "  Copie .env.staging.example a $ENV_FILE y configure las variables."
  exit 1
fi

echo -e "${GREEN}  ✓ $ENV_FILE encontrado${NC}"

# Source env file for checks
set -a
source "$ENV_FILE"
set +a

# Check critical variables
CRITICAL_VARS=(
  "DB_USER"
  "DB_PASSWORD"
  "DB_NAME"
  "JWT_SECRET"
  "ENCRYPTION_KEY"
  "REDIS_PASSWORD"
)

MISSING_VARS=()
for var in "${CRITICAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${RED}  ❌ Variables críticas faltantes:${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo -e "${RED}     - $var${NC}"
  done
  exit 1
fi

echo -e "${GREEN}  ✓ Variables críticas configuradas${NC}"

# Validate secret lengths
JWT_LEN=${#JWT_SECRET}
ENC_LEN=${#ENCRYPTION_KEY}

if [ $JWT_LEN -lt 32 ]; then
  echo -e "${YELLOW}  ⚠ JWT_SECRET tiene $JWT_LEN caracteres (mínimo recomendado: 32)${NC}"
fi

if [ $ENC_LEN -lt 32 ]; then
  echo -e "${YELLOW}  ⚠ ENCRYPTION_KEY tiene $ENC_LEN caracteres (mínimo recomendado: 32)${NC}"
fi

# ======================
# 2. Docker Check
# ======================
echo ""
echo -e "${YELLOW}[2/6] Verificando Docker...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}  ❌ Docker no instalado${NC}"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo -e "${RED}  ❌ Docker daemon no está corriendo${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ Docker disponible${NC}"

if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo -e "${RED}  ❌ docker compose no disponible${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ docker compose disponible${NC}"

# ======================
# 3. Compose File Check
# ======================
echo ""
echo -e "${YELLOW}[3/6] Verificando archivo compose...${NC}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}  ❌ No se encontró $COMPOSE_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ $COMPOSE_FILE encontrado${NC}"

# Validate compose file
if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config --quiet 2>/dev/null; then
  echo -e "${RED}  ❌ Error en configuración de compose${NC}"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config 2>&1 | head -20
  exit 1
fi

echo -e "${GREEN}  ✓ Configuración de compose válida${NC}"

# ======================
# 4. Build Images
# ======================
echo ""
echo -e "${YELLOW}[4/6] Construyendo imágenes...${NC}"

if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build; then
  echo -e "${RED}  ❌ Error al construir imágenes${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ Imágenes construidas${NC}"

# ======================
# 5. Start Services
# ======================
echo ""
echo -e "${YELLOW}[5/6] Iniciando servicios...${NC}"

# Stop any existing containers
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans 2>/dev/null || true

# Start services
if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d; then
  echo -e "${RED}  ❌ Error al iniciar servicios${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ Servicios iniciados${NC}"

# ======================
# 6. Health Checks
# ======================
echo ""
echo -e "${YELLOW}[6/6] Verificando salud de servicios...${NC}"

# Wait for services to be healthy
SERVICES=("db" "redis" "backend" "worker")
ALL_HEALTHY=false
WAIT_TIME=0

while [ $WAIT_TIME -lt $MAX_WAIT ] && [ "$ALL_HEALTHY" = false ]; do
  ALL_HEALTHY=true

  for service in "${SERVICES[@]}"; do
    STATUS=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null | \
      grep -o "\"$service\"[^}]*" | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

    if [ "$STATUS" != "healthy" ]; then
      ALL_HEALTHY=false
    fi
  done

  if [ "$ALL_HEALTHY" = false ]; then
    echo -ne "  Esperando servicios... ($WAIT_TIME/$MAX_WAIT)\r"
    sleep 5
    WAIT_TIME=$((WAIT_TIME + 5))
  fi
done

echo ""

# Check each service
for service in "${SERVICES[@]}"; do
  CONTAINER=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$service" 2>/dev/null)

  if [ -z "$CONTAINER" ]; then
    echo -e "${RED}  ❌ $service: No iniciado${NC}"
    continue
  fi

  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "no-healthcheck")

  if [ "$STATUS" = "healthy" ]; then
    echo -e "${GREEN}  ✓ $service: healthy${NC}"
  elif [ "$STATUS" = "no-healthcheck" ]; then
    RUNNING=$(docker inspect --format='{{.State.Running}}' "$CONTAINER" 2>/dev/null)
    if [ "$RUNNING" = "true" ]; then
      echo -e "${GREEN}  ✓ $service: running (no healthcheck)${NC}"
    else
      echo -e "${RED}  ❌ $service: not running${NC}"
    fi
  else
    echo -e "${YELLOW}  ⚠ $service: $STATUS${NC}"
  fi
done

# Test API health endpoint
echo ""
echo -e "${YELLOW}Verificando endpoint de salud...${NC}"

NGINX_PORT="${NGINX_HTTP_PORT:-80}"
HEALTH_URL="http://localhost:${NGINX_PORT}/api/health"

# Wait a bit for nginx to be ready
sleep 5

if command -v curl &> /dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
elif command -v wget &> /dev/null; then
  HTTP_CODE=$(wget -q -O /dev/null --server-response "$HEALTH_URL" 2>&1 | awk '/HTTP\/1.1/ {print $2}' | tail -1 || echo "000")
else
  echo -e "${YELLOW}  ⚠ curl/wget no disponible para verificar API${NC}"
  HTTP_CODE="skip"
fi

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}  ✓ API health endpoint: OK (HTTP 200)${NC}"
elif [ "$HTTP_CODE" = "skip" ]; then
  echo -e "${YELLOW}  ⚠ No se pudo verificar API health${NC}"
else
  echo -e "${YELLOW}  ⚠ API health: HTTP $HTTP_CODE (puede necesitar más tiempo)${NC}"
fi

# ======================
# Summary
# ======================
echo ""
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Verificación completada${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo "Comandos útiles:"
echo "  Ver logs:        docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
echo "  Ver backend:     docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f backend"
echo "  Ver worker:      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f worker"
echo "  Detener:         docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down"
echo "  Estado:          docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps"
echo ""

# Check if any service is not healthy
if [ "$ALL_HEALTHY" = false ]; then
  echo -e "${YELLOW}⚠ Algunos servicios no están completamente saludables.${NC}"
  echo -e "${YELLOW}  Revise los logs para más detalles.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Todos los servicios están funcionando correctamente.${NC}"
