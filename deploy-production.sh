#!/bin/bash

# ============================================
# Script de Despliegue - Producción
# ============================================
# Uso:
#   ./deploy-production.sh --ssl nomina.empresa.com    # Deploy con Let's Encrypt
#   ./deploy-production.sh --ssl-self                  # Deploy con SSL auto-firmado (no recomendado)
#   ./deploy-production.sh --update                    # Actualizar sin recrear todo
#   ./deploy-production.sh --backup                    # Hacer backup antes de deploy
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
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.production.yml"
SSL_DIR="nginx/ssl"
NGINX_CONF="nginx/production.conf"
BACKUP_DIR="backups"

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
  echo "  --ssl <dominio>    Generar/renovar certificado SSL con Let's Encrypt (REQUERIDO)"
  echo "  --ssl-self         Usar certificado auto-firmado (solo para pruebas)"
  echo "  --update           Solo actualizar código sin recrear contenedores"
  echo "  --backup           Hacer backup de BD antes del deploy"
  echo "  --restore <file>   Restaurar backup antes del deploy"
  echo "  --migrate-only     Solo ejecutar migraciones"
  echo "  --scale-workers N  Escalar workers a N instancias"
  echo "  --help             Mostrar esta ayuda"
  echo ""
  echo "Ejemplos:"
  echo "  $0 --ssl nomina.empresa.com           # Deploy completo con SSL"
  echo "  $0 --ssl nomina.empresa.com --backup  # Deploy con backup previo"
  echo "  $0 --update                           # Solo actualizar código"
  echo "  $0 --scale-workers 3                  # Escalar a 3 workers"
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

  # Detener nginx si está corriendo
  dc stop nginx 2>/dev/null || true

  # Solicitar/renovar certificado
  if [ -d "/etc/letsencrypt/live/nomina-prod" ]; then
    info "Renovando certificado existente..."
    sudo certbot renew --cert-name nomina-prod
  else
    info "Solicitando nuevo certificado..."
    sudo certbot certonly --standalone -d "$domain" --non-interactive --agree-tos \
      --email "admin@$domain" --cert-name "nomina-prod"
  fi

  # Copiar certificados
  sudo cp "/etc/letsencrypt/live/nomina-prod/fullchain.pem" "$SSL_DIR/"
  sudo cp "/etc/letsencrypt/live/nomina-prod/privkey.pem" "$SSL_DIR/"
  sudo chown "$USER:$USER" "$SSL_DIR"/*.pem

  info "Certificado instalado en $SSL_DIR/"
}

# Generar certificado auto-firmado (no recomendado para producción)
generate_self_signed_ssl() {
  local domain="${1:-localhost}"
  header "Generando certificado SSL auto-firmado"

  warn "⚠️  Los certificados auto-firmados NO son recomendados para producción"
  warn "   Los navegadores mostrarán advertencias de seguridad"

  mkdir -p "$SSL_DIR"

  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/C=MX/ST=Estado/L=Ciudad/O=Empresa/CN=$domain" \
    -addext "subjectAltName=DNS:$domain,DNS:localhost" \
    2>/dev/null

  info "Certificado generado en $SSL_DIR/"
}

# Crear configuración nginx para producción
create_nginx_config() {
  local domain="${1:-localhost}"
  header "Configurando Nginx para Producción"

  cat > "$NGINX_CONF" << 'NGINX_EOF'
# =============================================================================
# Nginx Configuration - Production Environment
# =============================================================================

upstream backend {
    server backend:3000;
    keepalive 32;
}

upstream frontend {
    server frontend:80;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name _;

    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
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
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # API Backend with rate limiting
    location /api/auth/login {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        limit_req zone=api_limit burst=20 nodelay;
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

    # Static assets - aggressive caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logging
    access_log /var/log/nginx/access.log combined buffer=16k flush=5s;
    error_log /var/log/nginx/error.log warn;

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}
NGINX_EOF

  info "Nginx configurado para producción con SSL y rate limiting"
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
    if [ -f ".env.production.example" ]; then
      warn "Archivo $ENV_FILE no encontrado. Copiando desde .env.production.example..."
      cp .env.production.example "$ENV_FILE"
      error "Configure $ENV_FILE antes de continuar"
    else
      error "Archivo $ENV_FILE no encontrado."
    fi
  fi

  # Verificar variables críticas
  source "$ENV_FILE"
  [ -z "$DB_PASSWORD" ] && error "DB_PASSWORD no configurado"
  [ -z "$JWT_SECRET" ] && error "JWT_SECRET no configurado"
  [ -z "$ENCRYPTION_KEY" ] && error "ENCRYPTION_KEY no configurado"
  [ -z "$REDIS_PASSWORD" ] && error "REDIS_PASSWORD no configurado"

  # Verificar longitud de secretos
  [ ${#JWT_SECRET} -lt 32 ] && error "JWT_SECRET debe tener al menos 32 caracteres"
  [ ${#ENCRYPTION_KEY} -lt 32 ] && error "ENCRYPTION_KEY debe tener al menos 32 caracteres"

  # Verificar que no se usen valores por defecto
  if [[ "$JWT_SECRET" == *"change"* ]] || [[ "$JWT_SECRET" == *"secret"* ]]; then
    error "JWT_SECRET parece ser un valor por defecto. Genere uno seguro con: openssl rand -base64 48"
  fi

  info "Variables de entorno verificadas"
}

# Hacer backup de la base de datos
backup_database() {
  header "Creando backup de la base de datos"

  mkdir -p "$BACKUP_DIR"
  source "$ENV_FILE"

  local backup_file="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

  info "Creando backup en: $backup_file"

  dc exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file"

  # Comprimir backup
  gzip "$backup_file"
  info "Backup creado: ${backup_file}.gz"

  # Mantener solo los últimos 7 backups
  ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm

  echo "${backup_file}.gz"
}

# Restaurar backup
restore_backup() {
  local backup_file="$1"
  header "Restaurando backup"

  if [ ! -f "$backup_file" ]; then
    error "Archivo de backup no encontrado: $backup_file"
  fi

  source "$ENV_FILE"

  info "Restaurando desde: $backup_file"

  if [[ "$backup_file" == *.gz ]]; then
    gunzip -c "$backup_file" | dc exec -T db psql -U "$DB_USER" "$DB_NAME"
  else
    dc exec -T db psql -U "$DB_USER" "$DB_NAME" < "$backup_file"
  fi

  info "Backup restaurado"
}

# Ejecutar migraciones
run_migrations() {
  header "Ejecutando migraciones"

  info "Esperando a que PostgreSQL esté listo..."

  local max_attempts=30
  local attempt=1
  while ! dc exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" 2>/dev/null; do
    if [ $attempt -ge $max_attempts ]; then
      error "PostgreSQL no está disponible"
    fi
    warn "Intento $attempt/$max_attempts..."
    sleep 2
    ((attempt++))
  done

  info "Aplicando migraciones..."
  dc exec -T backend npx prisma migrate deploy

  info "Migraciones completadas"
}

# Despliegue completo
deploy_full() {
  header "Iniciando despliegue de Producción"

  info "Construyendo imágenes..."
  dc build --no-cache

  info "Iniciando servicios de infraestructura..."
  dc up -d db redis
  sleep 10

  run_migrations

  info "Iniciando todos los servicios..."
  dc up -d

  info "Esperando a que los servicios estén listos..."
  sleep 15
}

# Actualización rápida (solo código)
deploy_update() {
  header "Actualizando aplicación"

  info "Reconstruyendo imágenes..."
  dc build backend frontend

  info "Reiniciando servicios..."
  dc up -d --no-deps backend frontend worker

  info "Esperando a que los servicios estén listos..."
  sleep 10
}

# Escalar workers
scale_workers() {
  local count="$1"
  header "Escalando workers a $count instancias"

  dc up -d --scale worker="$count" --no-recreate
  info "Workers escalados a $count"
}

# Mostrar información final
show_final_info() {
  header "Despliegue completado"

  echo ""
  dc ps
  echo ""

  source "$ENV_FILE"
  local frontend_url="${FRONTEND_URL:-https://localhost}"

  echo -e "${GREEN}════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅ PRODUCCIÓN DESPLEGADA EXITOSAMENTE${NC}"
  echo -e "${GREEN}════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${CYAN}📍 URLs de acceso:${NC}"
  echo "   Frontend:  $frontend_url"
  echo "   API:       $frontend_url/api"
  echo "   Health:    $frontend_url/api/health"
  echo ""
  echo -e "${CYAN}📝 Comandos útiles:${NC}"
  echo "   Ver logs:        docker compose -f $COMPOSE_FILE logs -f"
  echo "   Backup:          ./deploy-production.sh --backup"
  echo "   Actualizar:      ./deploy-production.sh --update"
  echo "   Escalar workers: ./deploy-production.sh --scale-workers 3"
  echo ""
  echo -e "${GREEN}🔒 SSL habilitado${NC}"
  echo ""

  # Mostrar estado de certificados
  if [ -f "$SSL_DIR/fullchain.pem" ]; then
    local expiry=$(openssl x509 -enddate -noout -in "$SSL_DIR/fullchain.pem" | cut -d= -f2)
    echo -e "${CYAN}📅 Certificado SSL expira: $expiry${NC}"
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
SSL_MODE=""
SSL_DOMAIN=""
UPDATE_ONLY=false
DO_BACKUP=false
RESTORE_FILE=""
MIGRATE_ONLY=false
SCALE_WORKERS=""

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
    --update)
      UPDATE_ONLY=true
      shift
      ;;
    --backup)
      DO_BACKUP=true
      shift
      ;;
    --restore)
      RESTORE_FILE="$2"
      shift 2
      ;;
    --migrate-only)
      MIGRATE_ONLY=true
      shift
      ;;
    --scale-workers)
      SCALE_WORKERS="$2"
      shift 2
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
echo -e "${RED}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  🚀 DESPLIEGUE PRODUCCIÓN - Sistema de Nómina         ║"
echo "║  ⚠️  ENTORNO DE PRODUCCIÓN - PROCEDA CON CUIDADO      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

check_prerequisites

# SSL es obligatorio en producción
if [ -z "$SSL_MODE" ] && [ ! -f "$SSL_DIR/fullchain.pem" ]; then
  error "SSL es obligatorio en producción. Use --ssl <dominio> o --ssl-self"
fi

# Generar SSL si se solicitó
if [ "$SSL_MODE" = "letsencrypt" ]; then
  generate_letsencrypt_ssl "$SSL_DOMAIN"
  create_nginx_config "$SSL_DOMAIN"
elif [ "$SSL_MODE" = "self" ]; then
  generate_self_signed_ssl
  create_nginx_config
fi

# Escalar workers
if [ -n "$SCALE_WORKERS" ]; then
  scale_workers "$SCALE_WORKERS"
  exit 0
fi

# Solo migraciones
if [ "$MIGRATE_ONLY" = true ]; then
  dc up -d db
  sleep 5
  run_migrations
  exit 0
fi

# Restaurar backup si se especificó
if [ -n "$RESTORE_FILE" ]; then
  dc up -d db
  sleep 5
  restore_backup "$RESTORE_FILE"
fi

# Hacer backup si se solicitó
if [ "$DO_BACKUP" = true ]; then
  dc up -d db 2>/dev/null || true
  sleep 5
  backup_database
fi

# Deploy
if [ "$UPDATE_ONLY" = true ]; then
  deploy_update
else
  deploy_full
fi

show_final_info
