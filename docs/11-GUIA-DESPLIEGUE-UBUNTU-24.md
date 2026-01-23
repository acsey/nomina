# Guía de Despliegue en Ubuntu 24.04 LTS

Guía completa paso a paso para desplegar el Sistema de Nómina en un servidor Ubuntu 24.04 LTS (Máquina Virtual o servidor físico).

## Tabla de Contenidos

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Preparación del Servidor](#2-preparación-del-servidor)
3. [Instalación de Docker](#3-instalación-de-docker)
4. [Configuración del Proyecto](#4-configuración-del-proyecto)
5. [Despliegue con Script Automatizado](#5-despliegue-con-script-automatizado)
6. [Despliegue Manual](#6-despliegue-manual)
7. [Configuración SSL](#7-configuración-ssl)
8. [Verificación del Despliegue](#8-verificación-del-despliegue)
9. [Problemas Comunes y Soluciones](#9-problemas-comunes-y-soluciones)
10. [Mantenimiento](#10-mantenimiento)
11. [Comandos Útiles](#11-comandos-útiles)

---

## 1. Requisitos del Sistema

### 1.1 Hardware Mínimo

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disco | 40 GB SSD | 100+ GB SSD |
| Red | 100 Mbps | 1 Gbps |

### 1.2 Software

| Requisito | Versión |
|-----------|---------|
| Ubuntu | 24.04 LTS |
| Docker | 24.x+ |
| Docker Compose | 2.x+ |
| Git | 2.x+ |

### 1.3 Puertos Requeridos

| Puerto | Servicio | Requerido |
|--------|----------|-----------|
| 22 | SSH | Si |
| 80 | HTTP | Si |
| 443 | HTTPS | Si |

> **Nota**: Los puertos internos (3000, 5432, 6379) NO deben exponerse externamente.

---

## 2. Preparación del Servidor

### 2.1 Actualizar el Sistema

```bash
# Actualizar lista de paquetes
sudo apt update

# Actualizar paquetes instalados
sudo apt upgrade -y

# Instalar paquetes esenciales
sudo apt install -y \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    openssl \
    net-tools \
    htop \
    unzip
```

### 2.2 Configurar Firewall (UFW)

```bash
# Habilitar UFW si no está activo
sudo ufw enable

# Permitir SSH (importante hacerlo primero)
sudo ufw allow ssh

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar reglas
sudo ufw status verbose
```

### 2.3 Configurar Zona Horaria

```bash
# Configurar zona horaria de México
sudo timedatectl set-timezone America/Mexico_City

# Verificar
timedatectl
```

### 2.4 Crear Usuario para la Aplicación (Opcional pero Recomendado)

```bash
# Crear usuario
sudo adduser nomina

# Agregar al grupo sudo
sudo usermod -aG sudo nomina

# Cambiar a ese usuario
su - nomina
```

---

## 3. Instalación de Docker

### 3.1 Remover Versiones Anteriores

```bash
# Remover paquetes conflictivos
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    sudo apt-get remove -y $pkg 2>/dev/null || true
done
```

### 3.2 Instalar Docker Engine

```bash
# Agregar clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Agregar repositorio
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Actualizar e instalar
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 3.3 Configurar Docker para Usuario No-Root

```bash
# Agregar usuario actual al grupo docker
sudo usermod -aG docker $USER

# Aplicar cambios de grupo (o cerrar sesión y volver a entrar)
newgrp docker
```

### 3.4 Verificar Instalación

```bash
# Verificar versión de Docker
docker --version
# Esperado: Docker version 24.x.x o superior

# Verificar versión de Docker Compose
docker compose version
# Esperado: Docker Compose version v2.x.x o superior

# Probar que funciona sin sudo
docker run hello-world
```

### 3.5 Configurar Docker para Iniciar con el Sistema

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Configuración del Proyecto

### 4.1 Clonar el Repositorio

```bash
# Crear directorio para proyectos
mkdir -p ~/proyectos
cd ~/proyectos

# Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# Verificar rama
git branch
git checkout desarrollo  # o la rama que necesites
```

### 4.2 Crear Archivo de Variables de Entorno

```bash
# Copiar plantilla para staging
cp .env.staging.example .env.staging

# Editar archivo
nano .env.staging
```

### 4.3 Configurar Variables de Entorno

Edita el archivo `.env.staging` con los siguientes valores:

```env
# =============================================================================
# CONFIGURACIÓN STAGING - Ubuntu 24.04
# =============================================================================

# -----------------------------------------------------------------------------
# BASE DE DATOS (REQUERIDO)
# -----------------------------------------------------------------------------
DB_USER=nomina_staging
DB_PASSWORD=CAMBIAR_POR_PASSWORD_SEGURO
DB_NAME=nomina_staging_db

# -----------------------------------------------------------------------------
# SEGURIDAD (REQUERIDO - Generar con: openssl rand -base64 48)
# -----------------------------------------------------------------------------
JWT_SECRET=GENERAR_CLAVE_SEGURA_MINIMO_48_CARACTERES
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=GENERAR_OTRA_CLAVE_SEGURA_MINIMO_48_CARACTERES

# -----------------------------------------------------------------------------
# REDIS (REQUERIDO)
# -----------------------------------------------------------------------------
REDIS_PASSWORD=CAMBIAR_POR_PASSWORD_SEGURO
REDIS_DB=0

# -----------------------------------------------------------------------------
# APLICACIÓN
# -----------------------------------------------------------------------------
FRONTEND_URL=https://staging.tu-dominio.com
VITE_API_URL=/api

# Puertos Nginx (no cambiar a menos que sea necesario)
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# -----------------------------------------------------------------------------
# PAC - TIMBRADO CFDI
# -----------------------------------------------------------------------------
PAC_MODE=sandbox
PAC_PROVIDER=
PAC_USER=
PAC_PASSWORD=

# -----------------------------------------------------------------------------
# PROCESAMIENTO
# -----------------------------------------------------------------------------
CFDI_STAMP_MODE=async
WORKER_CONCURRENCY=3
```

### 4.4 Generar Claves Seguras

```bash
# Generar JWT_SECRET
echo "JWT_SECRET: $(openssl rand -base64 48)"

# Generar ENCRYPTION_KEY
echo "ENCRYPTION_KEY: $(openssl rand -base64 48)"

# Generar REDIS_PASSWORD
echo "REDIS_PASSWORD: $(openssl rand -base64 32)"

# Generar DB_PASSWORD
echo "DB_PASSWORD: $(openssl rand -base64 24)"
```

Copia estos valores y pégalos en el archivo `.env.staging`.

### 4.5 Crear Directorio de Storage

```bash
# Crear directorios necesarios
mkdir -p storage/fiscal
mkdir -p nginx/ssl

# Establecer permisos
chmod -R 755 storage
chmod -R 755 nginx
```

### 4.6 Crear Configuración Nginx para Staging

```bash
# Crear archivo de configuración
nano nginx/staging.conf
```

Contenido para `nginx/staging.conf`:

```nginx
# =============================================================================
# Nginx Configuration - Staging Environment
# =============================================================================

upstream backend {
    server backend:3000;
    keepalive 32;
}

upstream frontend {
    server frontend:80;
}

# HTTP Server (redirect to HTTPS or serve directly)
server {
    listen 80;
    server_name _;

    # Health check endpoint (siempre disponible)
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

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

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
}
```

---

## 5. Despliegue con Script Automatizado

### 5.1 Dar Permisos de Ejecución

```bash
chmod +x deploy-staging.sh
chmod +x scripts/verify-staging.sh
```

### 5.2 Ejecutar Despliegue

```bash
# Despliegue normal (sin SSL)
./deploy-staging.sh

# Despliegue con SSL auto-firmado (para pruebas)
./deploy-staging.sh --ssl-self

# Despliegue con Let's Encrypt (requiere dominio público)
./deploy-staging.sh --ssl tu-dominio.com

# Despliegue desde cero (borra datos existentes)
./deploy-staging.sh --fresh
```

### 5.3 Ver Logs del Script

El script mostrará el progreso. Si hay errores, revisa la sección de [Problemas Comunes](#9-problemas-comunes-y-soluciones).

---

## 6. Despliegue Manual

Si el script automatizado falla, sigue estos pasos manuales:

### 6.1 Construir Imágenes

```bash
cd ~/proyectos/nomina

# Construir todas las imágenes
docker compose -f docker-compose.staging.yml --env-file .env.staging build

# Si hay errores de memoria, construir una por una
docker compose -f docker-compose.staging.yml --env-file .env.staging build db
docker compose -f docker-compose.staging.yml --env-file .env.staging build redis
docker compose -f docker-compose.staging.yml --env-file .env.staging build backend
docker compose -f docker-compose.staging.yml --env-file .env.staging build worker
docker compose -f docker-compose.staging.yml --env-file .env.staging build frontend
docker compose -f docker-compose.staging.yml --env-file .env.staging build nginx
```

### 6.2 Iniciar Base de Datos y Redis

```bash
# Iniciar servicios de infraestructura primero
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d db redis

# Esperar a que estén listos (30 segundos aprox)
sleep 30

# Verificar que están corriendo
docker compose -f docker-compose.staging.yml --env-file .env.staging ps
```

### 6.3 Verificar que PostgreSQL está Listo

```bash
# Verificar conexión
docker compose -f docker-compose.staging.yml --env-file .env.staging exec db pg_isready -U nomina_staging -d nomina_staging_db

# Debería mostrar: "accepting connections"
```

### 6.4 Ejecutar Migraciones

```bash
# Iniciar backend temporalmente para migraciones
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d backend

# Esperar a que inicie
sleep 20

# Ejecutar migraciones
docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma migrate deploy

# Si es la primera vez, ejecutar seed
docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma db seed
```

### 6.5 Iniciar Todos los Servicios

```bash
# Iniciar todo
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d

# Ver estado
docker compose -f docker-compose.staging.yml --env-file .env.staging ps
```

---

## 7. Configuración SSL

### 7.1 SSL Auto-firmado (Para Pruebas)

```bash
# Crear directorio
mkdir -p nginx/ssl

# Generar certificado auto-firmado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -subj "/C=MX/ST=Estado/L=Ciudad/O=Empresa/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Verificar
ls -la nginx/ssl/
```

### 7.2 Let's Encrypt (Producción)

```bash
# Instalar certbot
sudo apt install -y certbot

# Detener nginx temporalmente
docker compose -f docker-compose.staging.yml --env-file .env.staging stop nginx

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com --non-interactive --agree-tos --email tu-email@dominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*.pem

# Reiniciar nginx
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d nginx
```

### 7.3 Actualizar Configuración Nginx para HTTPS

Crea un nuevo archivo `nginx/staging-ssl.conf`:

```nginx
# =============================================================================
# Nginx Configuration - Staging with SSL
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
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_intercept_errors on;
        error_page 404 = @spa_fallback;
    }

    location @spa_fallback {
        proxy_pass http://frontend/index.html;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
}
```

---

## 8. Verificación del Despliegue

### 8.1 Verificar Servicios

```bash
# Ver estado de todos los contenedores
docker compose -f docker-compose.staging.yml --env-file .env.staging ps

# Todos deben mostrar "Up" y "healthy"
```

Resultado esperado:
```
NAME                       STATUS          PORTS
nomina-staging-db          Up (healthy)    5432/tcp
nomina-staging-redis       Up (healthy)    6379/tcp
nomina-staging-backend     Up (healthy)    3000/tcp
nomina-staging-worker      Up (healthy)
nomina-staging-frontend    Up (healthy)    80/tcp
nomina-staging-nginx       Up (healthy)    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 8.2 Verificar Health Endpoints

```bash
# Health check general
curl -s http://localhost/health
# Esperado: OK

# Health check API
curl -s http://localhost/api/health | jq
# Esperado: { "status": "ok", "timestamp": "...", "version": "..." }
```

### 8.3 Probar Login

```bash
# Login de prueba
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"admin123"}' | jq

# Debe retornar un token
```

### 8.4 Verificar Base de Datos

```bash
# Conectar a PostgreSQL
docker compose -f docker-compose.staging.yml --env-file .env.staging exec db psql -U nomina_staging -d nomina_staging_db

# Listar tablas
\dt

# Salir
\q
```

### 8.5 Verificar Redis

```bash
# Ping a Redis
docker compose -f docker-compose.staging.yml --env-file .env.staging exec redis redis-cli -a $REDIS_PASSWORD ping
# Esperado: PONG
```

---

## 9. Problemas Comunes y Soluciones

### 9.1 Error: "Cannot connect to the Docker daemon"

**Causa**: Docker no está corriendo o el usuario no tiene permisos.

**Solución**:
```bash
# Verificar que Docker está corriendo
sudo systemctl status docker

# Si no está corriendo
sudo systemctl start docker

# Si es problema de permisos
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar
exit
# Volver a conectar por SSH
```

### 9.2 Error: "permission denied while trying to connect to Docker"

**Causa**: Usuario no está en el grupo docker.

**Solución**:
```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Aplicar cambios inmediatamente
newgrp docker

# O cerrar sesión y volver a entrar
```

### 9.3 Error: "port is already allocated"

**Causa**: Otro servicio está usando el puerto 80 o 443.

**Solución**:
```bash
# Ver qué está usando el puerto
sudo lsof -i :80
sudo lsof -i :443

# Si es apache2
sudo systemctl stop apache2
sudo systemctl disable apache2

# Si es nginx instalado en el sistema
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 9.4 Error: "no space left on device"

**Causa**: Disco lleno.

**Solución**:
```bash
# Ver espacio en disco
df -h

# Limpiar Docker
docker system prune -a --volumes

# Limpiar logs antiguos
sudo journalctl --vacuum-size=500M
```

### 9.5 Error: Build falla por memoria insuficiente

**Causa**: El servidor no tiene suficiente RAM para el build.

**Solución**:
```bash
# Crear swap si no existe
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacer swap permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Construir con menos concurrencia
DOCKER_BUILDKIT=0 docker compose -f docker-compose.staging.yml --env-file .env.staging build
```

### 9.6 Error: "FATAL: password authentication failed"

**Causa**: Contraseña de PostgreSQL incorrecta o inconsistente.

**Solución**:
```bash
# Detener todo
docker compose -f docker-compose.staging.yml --env-file .env.staging down -v

# Verificar que el password en .env.staging es correcto
cat .env.staging | grep DB_PASSWORD

# Volver a levantar
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

### 9.7 Error: Migraciones fallan con "relation does not exist"

**Causa**: Migraciones no aplicadas o inconsistentes.

**Solución**:
```bash
# Ver estado de migraciones
docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma migrate status

# Resetear migraciones (CUIDADO: borra datos)
docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma migrate reset --force

# O aplicar forzadamente
docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma db push
```

### 9.8 Error: Frontend muestra página en blanco

**Causa**: Error de JavaScript, API no disponible, o CORS.

**Solución**:
```bash
# Ver logs del frontend
docker compose -f docker-compose.staging.yml --env-file .env.staging logs frontend

# Ver logs del backend
docker compose -f docker-compose.staging.yml --env-file .env.staging logs backend

# Verificar que FRONTEND_URL en .env.staging es correcto
# Debe coincidir con la URL desde donde se accede
```

### 9.9 Error: "ECONNREFUSED" al conectar a Redis

**Causa**: Redis no está listo o password incorrecto.

**Solución**:
```bash
# Verificar que Redis está corriendo
docker compose -f docker-compose.staging.yml --env-file .env.staging ps redis

# Probar conexión
docker compose -f docker-compose.staging.yml --env-file .env.staging exec redis redis-cli ping

# Si requiere password
docker compose -f docker-compose.staging.yml --env-file .env.staging exec redis redis-cli -a TU_REDIS_PASSWORD ping
```

### 9.10 Contenedor en "Restarting" constante

**Causa**: Error de inicio, falta de dependencias, o configuración incorrecta.

**Solución**:
```bash
# Ver logs del contenedor problemático
docker compose -f docker-compose.staging.yml --env-file .env.staging logs backend

# Ejecutar en modo interactivo para debug
docker compose -f docker-compose.staging.yml --env-file .env.staging run --rm backend sh
```

---

## 10. Mantenimiento

### 10.1 Backup de Base de Datos

```bash
# Crear backup
docker compose -f docker-compose.staging.yml --env-file .env.staging exec db \
    pg_dump -U nomina_staging nomina_staging_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Comprimir
gzip backup_*.sql
```

### 10.2 Restaurar Backup

```bash
# Descomprimir si es necesario
gunzip backup_20250123_120000.sql.gz

# Restaurar
docker compose -f docker-compose.staging.yml --env-file .env.staging exec -T db \
    psql -U nomina_staging nomina_staging_db < backup_20250123_120000.sql
```

### 10.3 Actualizar Aplicación

```bash
# Obtener últimos cambios
git pull origin desarrollo

# Reconstruir y reiniciar
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# Ejecutar migraciones si hay nuevas
docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma migrate deploy
```

### 10.4 Ver Logs

```bash
# Todos los logs
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f

# Solo backend
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f backend

# Solo errores
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f backend 2>&1 | grep -i error
```

### 10.5 Reiniciar Servicios

```bash
# Reiniciar todo
docker compose -f docker-compose.staging.yml --env-file .env.staging restart

# Reiniciar solo backend
docker compose -f docker-compose.staging.yml --env-file .env.staging restart backend
```

### 10.6 Detener Servicios

```bash
# Detener (mantiene datos)
docker compose -f docker-compose.staging.yml --env-file .env.staging down

# Detener y eliminar volúmenes (BORRA DATOS)
docker compose -f docker-compose.staging.yml --env-file .env.staging down -v
```

---

## 11. Comandos Útiles

### Referencia Rápida

```bash
# Alias útil (agregar a ~/.bashrc)
alias dc='docker compose -f docker-compose.staging.yml --env-file .env.staging'

# Con el alias:
dc up -d          # Iniciar
dc down           # Detener
dc ps             # Estado
dc logs -f        # Logs
dc restart        # Reiniciar
dc exec backend sh  # Shell en backend
```

### Comandos Frecuentes

| Acción | Comando |
|--------|---------|
| Iniciar todo | `docker compose -f docker-compose.staging.yml --env-file .env.staging up -d` |
| Detener todo | `docker compose -f docker-compose.staging.yml --env-file .env.staging down` |
| Ver estado | `docker compose -f docker-compose.staging.yml --env-file .env.staging ps` |
| Ver logs | `docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f` |
| Reconstruir | `docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build` |
| Shell backend | `docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend sh` |
| Shell DB | `docker compose -f docker-compose.staging.yml --env-file .env.staging exec db psql -U nomina_staging -d nomina_staging_db` |
| Migraciones | `docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma migrate deploy` |
| Seed | `docker compose -f docker-compose.staging.yml --env-file .env.staging exec backend npx prisma db seed` |
| Limpiar Docker | `docker system prune -a --volumes` |

---

## Checklist de Despliegue

### Pre-despliegue
- [ ] Ubuntu 24.04 instalado y actualizado
- [ ] Docker y Docker Compose instalados
- [ ] Usuario agregado al grupo docker
- [ ] Firewall configurado (puertos 80, 443, 22)
- [ ] Repositorio clonado
- [ ] Archivo .env.staging configurado con claves seguras
- [ ] Directorio storage/fiscal creado
- [ ] Configuración nginx/staging.conf creada

### Despliegue
- [ ] Imágenes construidas exitosamente
- [ ] Base de datos iniciada y healthy
- [ ] Redis iniciado y healthy
- [ ] Migraciones ejecutadas
- [ ] Seed ejecutado (si es primera vez)
- [ ] Todos los servicios corriendo

### Post-despliegue
- [ ] Health check responde OK
- [ ] Login funciona
- [ ] Frontend carga correctamente
- [ ] SSL configurado (si aplica)
- [ ] Backup programado

---

*Documento creado: Enero 2025*
*Sistema: Ubuntu 24.04 LTS*
*Versión: 1.0*
