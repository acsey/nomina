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
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Función para mostrar mensajes
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

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
header "1. Limpiando entorno existente"
info "Deteniendo contenedores existentes..."
dc -f docker-compose.dev.yml down --volumes --remove-orphans 2>/dev/null || true

# Limpiar volúmenes específicos
info "Limpiando volúmenes..."
docker volume rm nomina_postgres_data_dev 2>/dev/null || true
docker volume rm nomina_redis_data_dev 2>/dev/null || true

# ============================================
# 2. Reconstruir imágenes
# ============================================
header "2. Reconstruyendo imágenes"
info "Construyendo backend y frontend..."
dc -f docker-compose.dev.yml build --no-cache backend frontend

# ============================================
# 3. Iniciar servicios de base de datos
# ============================================
header "3. Iniciando base de datos"
info "Iniciando PostgreSQL y Redis..."
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
header "4. Ejecutando migraciones"
info "Aplicando migraciones de Prisma..."
dc -f docker-compose.dev.yml run --rm backend npx prisma migrate deploy

# ============================================
# 5. Generar cliente Prisma
# ============================================
header "5. Generando cliente Prisma"
dc -f docker-compose.dev.yml run --rm backend npx prisma generate

# ============================================
# 6. Ejecutar seed
# ============================================
header "6. Ejecutando seed de datos"
info "Creando datos iniciales (empresas, empleados, usuarios, asistencia, etc.)..."
dc -f docker-compose.dev.yml run --rm backend npx prisma db seed

# ============================================
# 7. Iniciar todos los servicios (incluyendo n8n)
# ============================================
header "7. Iniciando servicios"
info "Levantando todos los contenedores (incluyendo n8n)..."
dc -f docker-compose.dev.yml up -d

# Esperar a que n8n esté listo
info "Esperando a que n8n esté listo..."
sleep 10
until dc -f docker-compose.dev.yml exec -T n8n wget --spider -q http://localhost:5678/healthz 2>/dev/null; do
  warn "n8n no está listo aún, esperando..."
  sleep 3
done
info "n8n está listo!"

# ============================================
# 8. Mostrar información del sistema
# ============================================
sleep 5
header "8. Estado del sistema"
info "Estado de los servicios:"
dc -f docker-compose.dev.yml ps

# ============================================
# 9. Mostrar usuarios y roles desde la BD
# ============================================
header "9. Usuarios del sistema"

echo -e "\n${CYAN}Consultando usuarios en la base de datos...${NC}\n"

# Query para obtener usuarios con roles y empresas
dc -f docker-compose.dev.yml exec -T db psql -U nomina -d nomina_db -c "
SELECT
    u.email as \"Email\",
    u.first_name || ' ' || u.last_name as \"Nombre\",
    r.name as \"Rol\",
    COALESCE(c.name, 'SUPER ADMIN') as \"Empresa\"
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY
    CASE WHEN c.name IS NULL THEN 0 ELSE 1 END,
    c.name,
    CASE r.name
        WHEN 'admin' THEN 1
        WHEN 'company_admin' THEN 2
        WHEN 'rh' THEN 3
        WHEN 'manager' THEN 4
        WHEN 'employee' THEN 5
    END;
"

# ============================================
# 10. Mostrar resumen de empleados y asistencia
# ============================================
header "10. Resumen de datos"

dc -f docker-compose.dev.yml exec -T db psql -U nomina -d nomina_db -c "
SELECT
    c.name as \"Empresa\",
    COUNT(DISTINCT e.id) as \"Empleados\",
    COUNT(DISTINCT ar.id) as \"Registros Asistencia\",
    COUNT(DISTINCT CASE WHEN ar.date = CURRENT_DATE THEN ar.id END) as \"Check-ins Hoy\"
FROM companies c
LEFT JOIN employees e ON c.id = e.company_id AND e.is_active = true
LEFT JOIN attendance_records ar ON e.id = ar.employee_id
GROUP BY c.name
ORDER BY c.name;
"

# ============================================
# 11. Información final
# ============================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}     ✅ DESPLIEGUE COMPLETADO${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}📍 URLs de acceso:${NC}"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3000"
echo "   n8n:       http://localhost:5678 (admin/admin123)"
echo "   Adminer:   http://localhost:9090"
echo ""
echo -e "${CYAN}🔑 CREDENCIALES DE ACCESO:${NC}"
echo ""
echo -e "${YELLOW}👑 SUPER ADMINISTRADOR (acceso global):${NC}"
echo "   Email:    admin@sistema.com"
echo "   Password: admin123"
echo ""
echo -e "${YELLOW}🏢 BFS INGENIERÍA (Aguascalientes):${NC}"
echo "   Admin:    admin@bfs.com.mx / admin123"
echo "   RH:       rh@bfs.com.mx / admin123"
echo "   Gerente:  gerente@bfs.com.mx / admin123"
echo ""
echo -e "${YELLOW}🏢 TECH SOLUTIONS (CDMX):${NC}"
echo "   Admin:    admin@techsolutions.mx / admin123"
echo "   RH:       rh@techsolutions.mx / admin123"
echo "   Gerente:  gerente@techsolutions.mx / admin123"
echo ""
echo -e "${YELLOW}🏢 COMERCIALIZADORA DEL NORTE (Monterrey):${NC}"
echo "   Admin:    admin@comnorte.mx / admin123"
echo "   RH:       rh@comnorte.mx / admin123"
echo ""
echo -e "${YELLOW}🏛️ INSABI - GOBIERNO (CDMX, ISSSTE):${NC}"
echo "   Admin:    admin@insabi.gob.mx / admin123"
echo "   RH:       rh@insabi.gob.mx / admin123"
echo "   Director: director@insabi.gob.mx / admin123"
echo ""
echo -e "${CYAN}📝 Comandos útiles:${NC}"
echo "   Ver logs:          docker compose -f docker-compose.dev.yml logs -f"
echo "   Logs backend:      docker compose -f docker-compose.dev.yml logs -f backend"
echo "   Logs n8n:          docker compose -f docker-compose.dev.yml logs -f n8n"
echo "   Detener:           docker compose -f docker-compose.dev.yml down"
echo "   Reiniciar:         docker compose -f docker-compose.dev.yml restart"
echo "   Acceder a DB:      docker compose -f docker-compose.dev.yml exec db psql -U nomina -d nomina_db"
echo "   Re-seed:           docker compose -f docker-compose.dev.yml exec backend npx prisma db seed"
echo ""
echo -e "${CYAN}📱 WhatsApp + n8n:${NC}"
echo "   n8n Dashboard:     http://localhost:5678"
echo "   Webhook Test:      curl -X POST http://localhost:3000/webhooks/whatsapp/test"
echo "   Ver workflows:     n8n-workflows/"
echo ""
echo -e "${GREEN}🎉 ¡Sistema listo para usar!${NC}"
echo ""
