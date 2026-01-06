#!/bin/bash

# ============================================
# Script de Despliegue desde Cero - Nomina
# ============================================

set -e

echo "🚀 Iniciando despliegue desde cero..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Función para mostrar mensajes
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Función wrapper para docker compose
dc() {
  if command -v docker-compose &> /dev/null; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

# ============================================
# 1. Detener y limpiar contenedores existentes
# ============================================
info "Deteniendo contenedores existentes..."
dc -f docker-compose.dev.yml down --volumes --remove-orphans 2>/dev/null || true

# Limpiar volúmenes específicos
info "Limpiando volúmenes..."
docker volume rm nomina_postgres_data_dev 2>/dev/null || true
docker volume rm nomina_redis_data_dev 2>/dev/null || true

# ============================================
# 2. Reconstruir imágenes
# ============================================
info "Reconstruyendo imágenes..."
dc -f docker-compose.dev.yml build --no-cache backend frontend

# ============================================
# 3. Iniciar servicios de base de datos
# ============================================
info "Iniciando servicios de base de datos (PostgreSQL y Redis)..."
dc -f docker-compose.dev.yml up -d db redis

# Esperar a que PostgreSQL esté listo
info "Esperando a que PostgreSQL esté listo..."
sleep 5
until dc -f docker-compose.dev.yml exec -T db pg_isready -U nomina -d nomina_db; do
  warn "PostgreSQL no está listo aún, esperando..."
  sleep 2
done

info "PostgreSQL está listo!"

# ============================================
# 4. Ejecutar migraciones
# ============================================
info "Ejecutando migraciones de Prisma..."
dc -f docker-compose.dev.yml run --rm backend npx prisma migrate deploy

# ============================================
# 5. Generar cliente Prisma
# ============================================
info "Generando cliente Prisma..."
dc -f docker-compose.dev.yml run --rm backend npx prisma generate

# ============================================
# 6. Ejecutar seed
# ============================================
info "Ejecutando seed de datos iniciales..."
dc -f docker-compose.dev.yml run --rm backend npx prisma db seed

# ============================================
# 7. Iniciar todos los servicios
# ============================================
info "Iniciando todos los servicios..."
dc -f docker-compose.dev.yml up -d

# ============================================
# 8. Mostrar estado
# ============================================
sleep 5
info "Estado de los servicios:"
dc -f docker-compose.dev.yml ps

echo ""
info "✅ Despliegue completado!"
echo ""
echo "📍 URLs de acceso:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3000"
echo "   Adminer:   http://localhost:9090"
echo ""
echo "👤 Credenciales de Super Admin:"
echo "   Email:    admin@sistema.com"
echo "   Password: admin123"
echo ""
echo "👤 Credenciales de RH (Empresa BFS):"
echo "   Email:    rh@bfs.com.mx"
echo "   Password: admin123"
echo ""
echo "📝 Comandos útiles:"
echo "   Ver logs:     docker compose -f docker-compose.dev.yml logs -f"
echo "   Detener:      docker compose -f docker-compose.dev.yml down"
echo "   Reiniciar:    docker compose -f docker-compose.dev.yml restart"
echo ""
