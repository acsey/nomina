#!/bin/bash

# ============================================
# Script de Despliegue - Staging
# ============================================
# Uso:
#   ./deploy-staging.sh                    # Solo deploy
#   ./deploy-staging.sh --ssl dominio.com  # Deploy + SSL
#   ./deploy-staging.sh --ssl-self         # Deploy + SSL auto-firmado
#   ./deploy-staging.sh --fresh            # Deploy desde cero (borra datos)
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuración
ENV_FILE=".env.staging"
COMPOSE_FILE="docker-compose.staging.yml"
SSL_DIR="nginx/ssl"
NGINX_CONF="nginx/staging.conf"

# Funciones de utilidad
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
header() { echo -e "\n${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════════${NC}"; }

# Función wrapper para docker compose
dc() {
  if command -v docker-compose &> /dev/null; then
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  fi
}

# Mostrar ayuda
show_help() {
  echo "Uso: $0 [opciones]"
  echo ""
  echo "Opciones:"
  echo "  --ssl <dominio>    Generar certificado SSL con Let's Encrypt"
  echo "  --ssl-self         Generar certificado SSL auto-firmado"
  echo "  --fresh            Despliegue desde cero (borra datos existentes)"
  echo "  --migrate-only     Solo ejecutar migraciones"
  echo "  --help             Mostrar esta ayuda"
  echo ""
  echo "Ejemplos:"
  echo "  $0                              # Deploy normal"
  echo "  $0 --ssl staging.midominio.com  # Deploy con Let's Encrypt"
  echo "  $0 --ssl-self                   # Deploy con SSL auto-firmado"
  echo "  $0 --fresh                      # Borrar y recrear todo"
}

# Generar certificado auto-firmado
generate_self_signed_ssl() {
  local domain="${1:-localhost}"
  header "Generando certificado SSL auto-firmado"

  mkdir -p "$SSL_DIR"

  info "Generando certificado para: $domain"

  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/C=MX/ST=Estado/L=Ciudad/O=Empresa/CN=$domain" \
    -addext "subjectAltName=DNS:$domain,DNS:localhost,IP:127.0.0.1" \
    2>/dev/null

  info "Certificado generado en $SSL_DIR/"
}

# Generar certificado con Let's Encrypt
generate_letsencrypt_ssl() {
  local domain="$1"
  header "Generando certificado SSL con Let's Encrypt"

  if [ -z "$domain" ]; then
    error "Debe especificar un dominio para Let's Encrypt"
  fi

  # Verificar que certbot está instalado
  if ! command -v certbot &> /dev/null; then
    warn "Certbot no está instalado. Instalando..."
    if command -v apt-get &> /dev/null; then
      sudo apt-get update && sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
      sudo yum install -y certbot
    else
      error "No se pudo instalar certbot. Instálelo manualmente."
    fi
  fi

  mkdir -p "$SSL_DIR"

  info "Solicitando certificado para: $domain"
  info "Asegúrese de que el puerto 80 está accesible y el DNS apunta a este servidor"

  # Detener nginx si está corriendo
  dc stop nginx 2>/dev/null || true

  # Solicitar certificado
  sudo certbot certonly --standalone -d "$domain" --non-interactive --agree-tos \
    --email "admin@$domain" --cert-name "nomina-staging"

  # Copiar certificados
  sudo cp "/etc/letsencrypt/live/nomina-staging/fullchain.pem" "$SSL_DIR/"
  sudo cp "/etc/letsencrypt/live/nomina-staging/privkey.pem" "$SSL_DIR/"
  sudo chown "$USER:$USER" "$SSL_DIR"/*.pem

  info "Certificado generado y copiado a $SSL_DIR/"
}

# Habilitar SSL en nginx config
enable_ssl_in_nginx() {
  local domain="${1:-localhost}"
  header "Configurando Nginx para SSL"

  info "Habilitando HTTPS en $NGINX_CONF"

  # Crear configuración con SSL habilitado
  cat > "$NGINX_CONF" << 'NGINX_EOF'
# =============================================================================
# Nginx Configuration - Staging Environment (SSL Enabled)
# =============================================================================

upstream backend {
    server backend:3000;
    keepalive 32;
}

upstream frontend {
    server frontend:80;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name _;

    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name _;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # API Backend
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Frontend - React SPA
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_intercept_errors on;
        error_page 404 = @spa_fallback;
    }

    location @spa_fallback {
        proxy_pass http://frontend/index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
}
NGINX_EOF

  info "Nginx configurado para HTTPS"
}

# Verificar prerrequisitos
check_prerequisites() {
  header "Verificando prerrequisitos"

  # Verificar Docker
  if ! command -v docker &> /dev/null; then
    error "Docker no está instalado"
  fi
  info "Docker: $(docker --version)"

  # Verificar archivo de entorno
  if [ ! -f "$ENV_FILE" ]; then
    if [ -f ".env.staging.example" ]; then
      warn "Archivo $ENV_FILE no encontrado. Copiando desde .env.staging.example..."
      cp .env.staging.example "$ENV_FILE"
      warn "Por favor edite $ENV_FILE con sus valores antes de continuar"
      exit 1
    else
      error "Archivo $ENV_FILE no encontrado. Cree uno desde .env.staging.example"
    fi
  fi
  info "Archivo de entorno: $ENV_FILE"

  # Verificar variables críticas
  source "$ENV_FILE"
  [ -z "$DB_PASSWORD" ] && error "DB_PASSWORD no configurado en $ENV_FILE"
  [ -z "$JWT_SECRET" ] && error "JWT_SECRET no configurado en $ENV_FILE"
  [ -z "$ENCRYPTION_KEY" ] && error "ENCRYPTION_KEY no configurado en $ENV_FILE"

  info "Variables de entorno verificadas"
}

# Despliegue limpio (desde cero)
deploy_fresh() {
  header "Despliegue desde cero (--fresh)"

  warn "¡ATENCIÓN! Esto eliminará todos los datos de staging"
  read -p "¿Está seguro? (escriba 'si' para confirmar): " confirm
  if [ "$confirm" != "si" ]; then
    info "Operación cancelada"
    exit 0
  fi

  info "Deteniendo servicios..."
  dc down --volumes --remove-orphans 2>/dev/null || true

  # Limpiar volúmenes
  docker volume rm nomina_staging_postgres_data 2>/dev/null || true
  docker volume rm nomina_staging_redis_data 2>/dev/null || true
  docker volume rm nomina_staging_fiscal_storage 2>/dev/null || true
}

# Ejecutar migraciones
run_migrations() {
  header "Ejecutando migraciones"

  info "Esperando a que PostgreSQL esté listo..."
  sleep 5

  local max_attempts=30
  local attempt=1
  while ! dc exec -T db pg_isready -U "${DB_USER:-nomina_staging}" -d "${DB_NAME:-nomina_staging_db}" 2>/dev/null; do
    if [ $attempt -ge $max_attempts ]; then
      error "PostgreSQL no está disponible después de $max_attempts intentos"
    fi
    warn "Intento $attempt/$max_attempts - PostgreSQL no está listo, esperando..."
    sleep 2
    ((attempt++))
  done

  info "PostgreSQL está listo"

  info "Aplicando migraciones de Prisma..."
  dc exec -T backend npx prisma migrate deploy

  info "Migraciones completadas"
}

# Despliegue principal
deploy() {
  header "Iniciando despliegue de Staging"

  info "Construyendo imágenes..."
  dc build

  info "Iniciando servicios de infraestructura..."
  dc up -d db redis

  sleep 5

  info "Ejecutando migraciones..."
  run_migrations

  info "Iniciando todos los servicios..."
  dc up -d

  info "Esperando a que los servicios estén listos..."
  sleep 10
}

# Mostrar información final
show_final_info() {
  header "Despliegue completado"

  echo ""
  dc ps
  echo ""

  # Obtener URL del frontend
  source "$ENV_FILE"
  local frontend_url="${FRONTEND_URL:-http://localhost}"

  echo -e "${GREEN}════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅ STAGING DESPLEGADO EXITOSAMENTE${NC}"
  echo -e "${GREEN}════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${CYAN}📍 URLs de acceso:${NC}"
  echo "   Frontend:  $frontend_url"
  echo "   API:       $frontend_url/api"
  echo "   Health:    $frontend_url/api/health"
  echo ""
  echo -e "${CYAN}📝 Comandos útiles:${NC}"
  echo "   Ver logs:      ./deploy-staging.sh logs"
  echo "   Detener:       docker compose -f $COMPOSE_FILE down"
  echo "   Reiniciar:     docker compose -f $COMPOSE_FILE restart"
  echo "   Migraciones:   ./deploy-staging.sh --migrate-only"
  echo ""

  if [ -f "$SSL_DIR/fullchain.pem" ]; then
    echo -e "${GREEN}🔒 SSL habilitado${NC}"
  else
    echo -e "${YELLOW}⚠️  SSL no configurado - ejecute con --ssl o --ssl-self${NC}"
  fi
  echo ""
}

# Ver logs
show_logs() {
  dc logs -f "$@"
}

# ============================================
# MAIN
# ============================================

# Parsear argumentos
FRESH=false
SSL_MODE=""
SSL_DOMAIN=""
MIGRATE_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --ssl)
      SSL_MODE="letsencrypt"
      SSL_DOMAIN="$2"
      shift 2
      ;;
    --ssl-self)
      SSL_MODE="self"
      shift
      ;;
    --fresh)
      FRESH=true
      shift
      ;;
    --migrate-only)
      MIGRATE_ONLY=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    logs)
      shift
      show_logs "$@"
      exit 0
      ;;
    *)
      error "Opción desconocida: $1. Use --help para ver opciones."
      ;;
  esac
done

# Ejecutar
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║     🚀 DESPLIEGUE STAGING - Sistema de Nómina         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

check_prerequisites

# Generar SSL si se solicitó
if [ "$SSL_MODE" = "letsencrypt" ]; then
  generate_letsencrypt_ssl "$SSL_DOMAIN"
  enable_ssl_in_nginx "$SSL_DOMAIN"
elif [ "$SSL_MODE" = "self" ]; then
  generate_self_signed_ssl "localhost"
  enable_ssl_in_nginx "localhost"
fi

if [ "$MIGRATE_ONLY" = true ]; then
  dc up -d db
  sleep 5
  run_migrations
  exit 0
fi

if [ "$FRESH" = true ]; then
  deploy_fresh
fi

deploy
show_final_info
