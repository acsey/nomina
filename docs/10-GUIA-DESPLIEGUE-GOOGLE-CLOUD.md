# Guía Completa de Despliegue en Google Cloud Platform

## Índice

1. [Visión General](#1-visión-general)
2. [Requisitos Previos](#2-requisitos-previos)
3. [Crear y Configurar la VM en GCP](#3-crear-y-configurar-la-vm-en-gcp)
4. [Adquisición y Configuración de Dominio](#4-adquisición-y-configuración-de-dominio)
5. [Configuración de DNS](#5-configuración-de-dns)
6. [Instalación de Software en la VM](#6-instalación-de-software-en-la-vm)
7. [Despliegue de la Aplicación](#7-despliegue-de-la-aplicación)
8. [Configuración de SSL con Let's Encrypt](#8-configuración-de-ssl-con-lets-encrypt)
9. [Configuración de Nginx como Proxy Reverso](#9-configuración-de-nginx-como-proxy-reverso)
10. [Automatización y Mantenimiento](#10-automatización-y-mantenimiento)
11. [Monitoreo y Troubleshooting](#11-monitoreo-y-troubleshooting)
12. [Costos Estimados](#12-costos-estimados)

---

## 1. Visión General

Esta guía cubre el despliegue completo del Sistema de Nómina en Google Cloud Platform, incluyendo:

- Creación de VM (Compute Engine)
- Configuración de IP estática
- Registro y configuración de dominio
- Configuración de DNS con subdominios
- Instalación de certificados SSL con Let's Encrypt
- Configuración de Nginx como proxy reverso
- Automatización de renovación de certificados

### Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
│                                                                              │
│                    https://nomina.tuempresa.com                              │
│                    https://api.nomina.tuempresa.com                          │
│                    https://n8n.nomina.tuempresa.com                          │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE CLOUD PLATFORM                                │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Compute Engine VM                                  │  │
│  │                     IP Estática: 35.xxx.xxx.xxx                        │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                         NGINX                                    │  │  │
│  │  │              (SSL Termination + Reverse Proxy)                   │  │  │
│  │  │                      Puerto 80, 443                              │  │  │
│  │  │                                                                  │  │  │
│  │  │    nomina.tuempresa.com → frontend:80                            │  │  │
│  │  │    api.nomina.tuempresa.com → backend:3000                       │  │  │
│  │  │    n8n.nomina.tuempresa.com → n8n:5678                           │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                              │                                         │  │
│  │              ┌───────────────┼───────────────┐                         │  │
│  │              ▼               ▼               ▼                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │   Frontend   │  │   Backend    │  │     n8n      │                  │  │
│  │  │   (React)    │  │   (NestJS)   │  │ (Workflows)  │                  │  │
│  │  │   :80        │  │   :3000      │  │   :5678      │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  │              │               │               │                         │  │
│  │              └───────────────┼───────────────┘                         │  │
│  │                              ▼                                         │  │
│  │              ┌───────────────────────────────┐                         │  │
│  │              │      Docker Network           │                         │  │
│  │              │                               │                         │  │
│  │              │  PostgreSQL:5432  Redis:6379  │                         │  │
│  │              └───────────────────────────────┘                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Requisitos Previos

### 2.1 Cuenta de Google Cloud

1. Crear cuenta en [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto o usar uno existente
3. Habilitar facturación (necesario para usar Compute Engine)
4. Habilitar las siguientes APIs:
   - Compute Engine API
   - Cloud DNS API (si usas Cloud DNS)

### 2.2 Herramientas Locales

```bash
# Instalar Google Cloud SDK
# En macOS
brew install google-cloud-sdk

# En Ubuntu/Debian
sudo apt-get install apt-transport-https ca-certificates gnupg curl
echo "deb [signed-by=/usr/share/keyrings/cloud.google.asc] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.asc add -
sudo apt-get update && sudo apt-get install google-cloud-cli

# Inicializar gcloud
gcloud init

# Autenticarse
gcloud auth login

# Configurar proyecto por defecto
gcloud config set project TU_PROJECT_ID
```

### 2.3 Dominio

Necesitarás un dominio registrado. Opciones:

- **Google Cloud Domains** - Integración directa con GCP
- **Namecheap, GoDaddy, Cloudflare** - Registradores externos

---

## 3. Crear y Configurar la VM en GCP

### 3.1 Crear la VM via Consola Web

1. Ir a **Compute Engine > VM instances**
2. Click **Create Instance**
3. Configurar:

| Campo | Valor Recomendado |
|-------|-------------------|
| Name | nomina-production |
| Region | us-central1 (o región más cercana) |
| Zone | us-central1-a |
| Machine type | e2-medium (2 vCPU, 4 GB RAM) para inicio |
| Boot disk | Ubuntu 22.04 LTS, 50 GB SSD |
| Firewall | ✅ Allow HTTP, ✅ Allow HTTPS |

### 3.2 Crear la VM via gcloud CLI

```bash
# Crear la VM
gcloud compute instances create nomina-production \
    --project=TU_PROJECT_ID \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --network-interface=network-tier=PREMIUM,subnet=default \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --tags=http-server,https-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=nomina-production,image=projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20240126,mode=rw,size=50,type=projects/TU_PROJECT_ID/zones/us-central1-a/diskTypes/pd-balanced \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=env=production,app=nomina \
    --reservation-affinity=any

echo "✅ VM creada exitosamente"
```

### 3.3 Reservar IP Estática

```bash
# Reservar una IP estática
gcloud compute addresses create nomina-ip \
    --project=TU_PROJECT_ID \
    --region=us-central1

# Ver la IP asignada
gcloud compute addresses describe nomina-ip \
    --project=TU_PROJECT_ID \
    --region=us-central1 \
    --format="get(address)"

# Guardar la IP en una variable (para uso posterior)
STATIC_IP=$(gcloud compute addresses describe nomina-ip \
    --project=TU_PROJECT_ID \
    --region=us-central1 \
    --format="get(address)")
echo "IP Estática: $STATIC_IP"
```

### 3.4 Asignar IP Estática a la VM

```bash
# Primero, eliminar la IP externa efímera actual
gcloud compute instances delete-access-config nomina-production \
    --project=TU_PROJECT_ID \
    --zone=us-central1-a \
    --access-config-name="external-nat"

# Asignar la IP estática
gcloud compute instances add-access-config nomina-production \
    --project=TU_PROJECT_ID \
    --zone=us-central1-a \
    --access-config-name="external-nat" \
    --address=$STATIC_IP

echo "✅ IP estática $STATIC_IP asignada a la VM"
```

### 3.5 Configurar Reglas de Firewall

```bash
# Permitir HTTP (puerto 80)
gcloud compute firewall-rules create allow-http \
    --project=TU_PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server

# Permitir HTTPS (puerto 443)
gcloud compute firewall-rules create allow-https \
    --project=TU_PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=https-server

# (Opcional) Permitir SSH desde tu IP específica
gcloud compute firewall-rules create allow-ssh-from-my-ip \
    --project=TU_PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:22 \
    --source-ranges=TU_IP_PUBLICA/32

echo "✅ Reglas de firewall configuradas"
```

---

## 4. Adquisición y Configuración de Dominio

### 4.1 Opción A: Google Cloud Domains

```bash
# Buscar disponibilidad de dominio
gcloud domains registrations search-domains tuempresa.com

# Registrar dominio (interactivo)
gcloud domains registrations register tuempresa.com \
    --contact-data-from-file=contact.yaml \
    --contact-privacy=private-contact-data \
    --yearly-price="12.00 USD" \
    --cloud-dns-zone=nomina-zone
```

**Archivo contact.yaml:**
```yaml
allContacts:
  email: admin@tuempresa.com
  phoneNumber: "+52.5551234567"
  postalAddress:
    regionCode: MX
    postalCode: "06600"
    administrativeArea: CDMX
    locality: Ciudad de México
    addressLines:
      - "Calle Ejemplo 123"
    recipients:
      - "Tu Empresa S.A. de C.V."
```

### 4.2 Opción B: Registrador Externo (Namecheap, GoDaddy, etc.)

1. Ir al sitio del registrador
2. Buscar y registrar el dominio deseado
3. Completar el proceso de pago
4. Obtener acceso al panel de DNS

### 4.3 Estructura de Subdominios Recomendada

| Subdominio | Propósito | Destino |
|------------|-----------|---------|
| `nomina.tuempresa.com` | Frontend (App principal) | IP de la VM |
| `api.nomina.tuempresa.com` | API Backend | IP de la VM |
| `n8n.nomina.tuempresa.com` | Automatización n8n | IP de la VM |

---

## 5. Configuración de DNS

### 5.1 Usando Google Cloud DNS

```bash
# Crear zona DNS
gcloud dns managed-zones create nomina-zone \
    --project=TU_PROJECT_ID \
    --dns-name="tuempresa.com." \
    --description="DNS zone for nomina system" \
    --dnssec-state=on

# Ver los nameservers asignados (necesarios para configurar en el registrador)
gcloud dns managed-zones describe nomina-zone \
    --project=TU_PROJECT_ID \
    --format="get(nameServers)"

# Crear registro A para el dominio principal
gcloud dns record-sets create nomina.tuempresa.com. \
    --project=TU_PROJECT_ID \
    --zone=nomina-zone \
    --type=A \
    --ttl=300 \
    --rrdatas=$STATIC_IP

# Crear registro A para API
gcloud dns record-sets create api.nomina.tuempresa.com. \
    --project=TU_PROJECT_ID \
    --zone=nomina-zone \
    --type=A \
    --ttl=300 \
    --rrdatas=$STATIC_IP

# Crear registro A para n8n
gcloud dns record-sets create n8n.nomina.tuempresa.com. \
    --project=TU_PROJECT_ID \
    --zone=nomina-zone \
    --type=A \
    --ttl=300 \
    --rrdatas=$STATIC_IP

# Verificar registros creados
gcloud dns record-sets list \
    --project=TU_PROJECT_ID \
    --zone=nomina-zone

echo "✅ Registros DNS creados"
```

### 5.2 Usando Panel de DNS Externo

Si usas un registrador externo, configura los registros manualmente:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN DE REGISTROS DNS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tipo    Nombre                      Valor               TTL                 │
│  ────    ──────                      ─────               ───                 │
│  A       nomina.tuempresa.com        35.xxx.xxx.xxx      300                 │
│  A       api.nomina.tuempresa.com    35.xxx.xxx.xxx      300                 │
│  A       n8n.nomina.tuempresa.com    35.xxx.xxx.xxx      300                 │
│                                                                              │
│  (Opcional - www)                                                            │
│  CNAME   www.nomina.tuempresa.com    nomina.tuempresa.com   300              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Verificar Propagación DNS

```bash
# Esperar propagación (puede tomar 5 min a 48 horas)

# Verificar con dig
dig nomina.tuempresa.com +short
dig api.nomina.tuempresa.com +short
dig n8n.nomina.tuempresa.com +short

# Verificar con nslookup
nslookup nomina.tuempresa.com

# Verificar propagación global
# Usar: https://www.whatsmydns.net/
```

---

## 6. Instalación de Software en la VM

### 6.1 Conectar a la VM

```bash
# Via gcloud
gcloud compute ssh nomina-production --zone=us-central1-a

# O via SSH directo (si configuraste tu clave SSH)
ssh -i ~/.ssh/gcp_key usuario@$STATIC_IP
```

### 6.2 Actualizar Sistema

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar herramientas esenciales
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop \
    unzip
```

### 6.3 Instalar Docker

```bash
# Agregar clave GPG de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Agregar repositorio
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Agregar usuario actual al grupo docker
sudo usermod -aG docker $USER

# Aplicar cambios de grupo (o cerrar sesión y volver a entrar)
newgrp docker

# Verificar instalación
docker --version
docker compose version

echo "✅ Docker instalado correctamente"
```

### 6.4 Instalar Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Verificar instalación
nginx -v

# Iniciar y habilitar
sudo systemctl start nginx
sudo systemctl enable nginx

echo "✅ Nginx instalado correctamente"
```

### 6.5 Instalar Certbot (Let's Encrypt)

```bash
# Instalar snapd (si no está instalado)
sudo apt install -y snapd

# Instalar certbot via snap
sudo snap install --classic certbot

# Crear symlink
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Verificar instalación
certbot --version

echo "✅ Certbot instalado correctamente"
```

### 6.6 Configurar Firewall

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH
sudo ufw allow ssh

# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# Habilitar firewall
sudo ufw enable

# Ver estado
sudo ufw status verbose

echo "✅ Firewall configurado"
```

---

## 7. Despliegue de la Aplicación

### 7.1 Clonar Repositorio

```bash
# Crear directorio de aplicaciones
sudo mkdir -p /opt/apps
sudo chown $USER:$USER /opt/apps
cd /opt/apps

# Clonar repositorio
git clone https://github.com/tuusuario/nomina.git
cd nomina
```

### 7.2 Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.production.example .env

# Generar claves seguras
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "DB_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"

# Editar .env con las claves generadas
nano .env
```

**Valores importantes a configurar en .env:**

```bash
# Base de datos
DB_PASSWORD=<password_generado>
DATABASE_URL=postgresql://nomina:<password_generado>@db:5432/nomina_db?schema=public

# Seguridad
JWT_SECRET=<jwt_generado>
ENCRYPTION_KEY=<encryption_generado>

# Redis
REDIS_PASSWORD=<redis_password_generado>

# URLs (IMPORTANTE: cambiar por tus dominios)
FRONTEND_URL=https://nomina.tuempresa.com
VITE_API_URL=https://api.nomina.tuempresa.com

# Producción
NODE_ENV=production
ENABLE_SWAGGER=false
PAC_MODE=production

# Queue
QUEUE_MODE=api

# AI (al menos uno)
ANTHROPIC_API_KEY=sk-ant-xxx
# o
OPENAI_API_KEY=sk-xxx
# o
GOOGLE_AI_API_KEY=AIzaxxx
```

### 7.3 Crear Directorios de Storage

```bash
# Crear directorio de almacenamiento fiscal
sudo mkdir -p /opt/apps/nomina/storage/fiscal
sudo chown -R 1000:1000 /opt/apps/nomina/storage

# Crear directorio de certificados
mkdir -p /opt/apps/nomina/backend/certs
```

### 7.4 Desplegar con Docker Compose

```bash
cd /opt/apps/nomina

# Construir e iniciar servicios
docker compose -f docker-compose.production.yml up -d --build

# Verificar que los contenedores estén corriendo
docker compose ps

# Ver logs
docker compose logs -f

# Ejecutar migraciones
docker compose exec backend npx prisma migrate deploy

# Ejecutar seeds (primera vez)
docker compose exec backend npx prisma db seed

echo "✅ Aplicación desplegada"
```

---

## 8. Configuración de SSL con Let's Encrypt

### 8.1 Verificar que DNS Apunta Correctamente

```bash
# Antes de obtener certificados, verificar DNS
dig nomina.tuempresa.com +short
dig api.nomina.tuempresa.com +short
dig n8n.nomina.tuempresa.com +short

# Todos deben mostrar la IP de tu VM
```

### 8.2 Configurar Nginx Temporal (Sin SSL)

Crear configuración temporal para validación de Certbot:

```bash
sudo nano /etc/nginx/sites-available/nomina
```

```nginx
# Configuración temporal para obtener certificados
server {
    listen 80;
    server_name nomina.tuempresa.com api.nomina.tuempresa.com n8n.nomina.tuempresa.com;

    # Para validación de Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirección temporal
    location / {
        return 200 'Configurando SSL...';
        add_header Content-Type text/plain;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/nomina /etc/nginx/sites-enabled/

# Eliminar configuración default
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### 8.3 Obtener Certificados SSL

```bash
# Obtener certificados para todos los subdominios
sudo certbot certonly --nginx \
    -d nomina.tuempresa.com \
    -d api.nomina.tuempresa.com \
    -d n8n.nomina.tuempresa.com \
    --email admin@tuempresa.com \
    --agree-tos \
    --no-eff-email

# Verificar certificados obtenidos
sudo certbot certificates
```

**Salida esperada:**
```
Certificate Name: nomina.tuempresa.com
    Domains: nomina.tuempresa.com api.nomina.tuempresa.com n8n.nomina.tuempresa.com
    Expiry Date: 2024-04-15 (VALID: 89 days)
    Certificate Path: /etc/letsencrypt/live/nomina.tuempresa.com/fullchain.pem
    Private Key Path: /etc/letsencrypt/live/nomina.tuempresa.com/privkey.pem
```

### 8.4 Verificar Certificados

```bash
# Ver información del certificado
sudo openssl x509 -in /etc/letsencrypt/live/nomina.tuempresa.com/fullchain.pem -text -noout | head -20

# Verificar fecha de expiración
echo | openssl s_client -servername nomina.tuempresa.com -connect nomina.tuempresa.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 9. Configuración de Nginx como Proxy Reverso

### 9.1 Configuración Completa de Nginx

```bash
sudo nano /etc/nginx/sites-available/nomina
```

```nginx
# ============================================================================
# CONFIGURACIÓN NGINX - SISTEMA DE NÓMINA
# ============================================================================
# Dominios:
#   - nomina.tuempresa.com     -> Frontend (React)
#   - api.nomina.tuempresa.com -> Backend (NestJS)
#   - n8n.nomina.tuempresa.com -> n8n (Automatización)
# ============================================================================

# Upstream definitions
upstream frontend {
    server 127.0.0.1:5173;
    keepalive 32;
}

upstream backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream n8n {
    server 127.0.0.1:5678;
    keepalive 32;
}

# ============================================================================
# REDIRECCIÓN HTTP -> HTTPS
# ============================================================================
server {
    listen 80;
    listen [::]:80;
    server_name nomina.tuempresa.com api.nomina.tuempresa.com n8n.nomina.tuempresa.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirigir todo lo demás a HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# ============================================================================
# FRONTEND - nomina.tuempresa.com
# ============================================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name nomina.tuempresa.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/nomina.tuempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nomina.tuempresa.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/nomina.tuempresa.com/chain.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Logs
    access_log /var/log/nginx/nomina-frontend-access.log;
    error_log /var/log/nginx/nomina-frontend-error.log;

    # Frontend proxy
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# ============================================================================
# BACKEND API - api.nomina.tuempresa.com
# ============================================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.nomina.tuempresa.com;

    # SSL Configuration (mismos certificados)
    ssl_certificate /etc/letsencrypt/live/nomina.tuempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nomina.tuempresa.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/nomina.tuempresa.com/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/nomina-api-access.log;
    error_log /var/log/nginx/nomina-api-error.log;

    # Increase max body size for file uploads
    client_max_body_size 50M;

    # API Proxy
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

# ============================================================================
# N8N - n8n.nomina.tuempresa.com
# ============================================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name n8n.nomina.tuempresa.com;

    # SSL Configuration (mismos certificados)
    ssl_certificate /etc/letsencrypt/live/nomina.tuempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nomina.tuempresa.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/nomina.tuempresa.com/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/nomina-n8n-access.log;
    error_log /var/log/nginx/nomina-n8n-error.log;

    # n8n Proxy
    location / {
        proxy_pass http://n8n;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # Webhooks (n8n)
    location /webhook/ {
        proxy_pass http://n8n;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
```

### 9.2 Aplicar Configuración

```bash
# Verificar sintaxis
sudo nginx -t

# Si hay errores, corregirlos antes de continuar

# Recargar Nginx
sudo systemctl reload nginx

# Verificar estado
sudo systemctl status nginx

echo "✅ Nginx configurado con SSL"
```

### 9.3 Verificar SSL

```bash
# Probar conexión HTTPS
curl -I https://nomina.tuempresa.com
curl -I https://api.nomina.tuempresa.com
curl -I https://n8n.nomina.tuempresa.com

# Verificar certificado
echo | openssl s_client -servername nomina.tuempresa.com -connect nomina.tuempresa.com:443 2>/dev/null | openssl x509 -noout -issuer -subject -dates

# Test SSL con SSL Labs (online)
# Visitar: https://www.ssllabs.com/ssltest/analyze.html?d=nomina.tuempresa.com
```

---

## 10. Automatización y Mantenimiento

### 10.1 Renovación Automática de Certificados

```bash
# Verificar que el timer de certbot esté activo
sudo systemctl list-timers | grep certbot

# Si no está activo, habilitarlo
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Probar renovación (dry-run)
sudo certbot renew --dry-run
```

### 10.2 Crear Script de Renovación con Reload de Nginx

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
#!/bin/bash
# Script de post-renovación de certificados
# Recarga Nginx después de renovar certificados

LOG_FILE="/var/log/letsencrypt/renewal.log"

echo "$(date): Certificados renovados, recargando Nginx..." >> $LOG_FILE

# Verificar configuración de Nginx
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "$(date): Nginx recargado exitosamente" >> $LOG_FILE
else
    echo "$(date): ERROR - Configuración de Nginx inválida" >> $LOG_FILE
    exit 1
fi
```

```bash
# Hacer ejecutable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

### 10.3 Script de Monitoreo de SSL

```bash
sudo nano /usr/local/bin/check-ssl-expiry.sh
```

```bash
#!/bin/bash
# Script de monitoreo de certificados SSL
# Ejecutar con cron para alertas de expiración

DOMAINS=("nomina.tuempresa.com" "api.nomina.tuempresa.com" "n8n.nomina.tuempresa.com")
DAYS_WARNING=14
EMAIL="admin@tuempresa.com"

for DOMAIN in "${DOMAINS[@]}"; do
    EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

    if [ $DAYS_LEFT -lt $DAYS_WARNING ]; then
        echo "⚠️ ALERTA: El certificado de $DOMAIN expira en $DAYS_LEFT días"
        # Descomentar para enviar email
        # echo "El certificado de $DOMAIN expira en $DAYS_LEFT días" | mail -s "SSL Expiry Warning" $EMAIL
    else
        echo "✅ $DOMAIN: Certificado válido por $DAYS_LEFT días"
    fi
done
```

```bash
sudo chmod +x /usr/local/bin/check-ssl-expiry.sh

# Agregar a cron (ejecutar diariamente)
echo "0 9 * * * /usr/local/bin/check-ssl-expiry.sh >> /var/log/ssl-check.log 2>&1" | sudo crontab -
```

### 10.4 Script de Backup Automático

```bash
sudo nano /usr/local/bin/backup-nomina.sh
```

```bash
#!/bin/bash
# Script de backup automático del Sistema de Nómina

BACKUP_DIR="/var/backups/nomina"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Crear directorio de backups
mkdir -p $BACKUP_DIR

# Backup de base de datos
echo "$(date): Iniciando backup de base de datos..."
cd /opt/apps/nomina
docker compose exec -T db pg_dump -U nomina nomina_db --format=custom --compress=9 > "$BACKUP_DIR/db_$DATE.dump"

# Backup de storage fiscal
echo "$(date): Iniciando backup de storage fiscal..."
tar -czf "$BACKUP_DIR/fiscal_$DATE.tar.gz" -C /opt/apps/nomina storage/fiscal/

# Backup de configuración
echo "$(date): Backup de configuración..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" -C /opt/apps/nomina .env

# Eliminar backups antiguos
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "$(date): Backup completado"
echo "  - Base de datos: db_$DATE.dump"
echo "  - Storage fiscal: fiscal_$DATE.tar.gz"
echo "  - Configuración: config_$DATE.tar.gz"

# Listar backups
echo ""
echo "Backups disponibles:"
ls -lh $BACKUP_DIR/
```

```bash
sudo chmod +x /usr/local/bin/backup-nomina.sh

# Agregar a cron (ejecutar semanalmente)
echo "0 2 * * 0 /usr/local/bin/backup-nomina.sh >> /var/log/nomina-backup.log 2>&1" | sudo crontab -
```

---

## 11. Monitoreo y Troubleshooting

### 11.1 Comandos Útiles de Monitoreo

```bash
# Estado de contenedores
cd /opt/apps/nomina
docker compose ps

# Logs de la aplicación
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f worker

# Estado de Nginx
sudo systemctl status nginx
sudo nginx -t

# Logs de Nginx
sudo tail -f /var/log/nginx/nomina-api-error.log
sudo tail -f /var/log/nginx/nomina-frontend-error.log

# Estado de certificados
sudo certbot certificates

# Uso de recursos
htop
docker stats

# Espacio en disco
df -h
du -sh /opt/apps/nomina/storage/
```

### 11.2 Troubleshooting Común

#### Error: "502 Bad Gateway"

```bash
# Verificar que los contenedores estén corriendo
docker compose ps

# Si están caídos, ver logs
docker compose logs backend

# Reiniciar servicios
docker compose restart backend
```

#### Error: "SSL Certificate Error"

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente si es necesario
sudo certbot renew

# Verificar configuración Nginx
sudo nginx -t
```

#### Error: "Connection Refused"

```bash
# Verificar firewall
sudo ufw status

# Verificar que los puertos estén abiertos
sudo netstat -tlnp | grep -E '80|443|3000|5173'

# Verificar DNS
dig nomina.tuempresa.com
```

---

## 12. Costos Estimados

### 12.1 Google Cloud Platform

| Recurso | Especificación | Costo Mensual (USD) |
|---------|---------------|---------------------|
| Compute Engine (e2-medium) | 2 vCPU, 4 GB RAM | ~$25-35 |
| Disco SSD (50 GB) | pd-balanced | ~$5 |
| IP Estática | Regional | ~$3-7 |
| Egress (tráfico saliente) | ~50 GB/mes | ~$5-10 |
| **Total Aproximado** | | **~$40-60/mes** |

### 12.2 Dominio

| Registrador | TLD | Costo Anual (USD) |
|-------------|-----|-------------------|
| Google Domains | .com | ~$12 |
| Namecheap | .com | ~$10-15 |
| Cloudflare | .com | ~$9 |

### 12.3 SSL

- **Let's Encrypt**: Gratuito ✅

### 12.4 Total Estimado

| Concepto | Costo |
|----------|-------|
| GCP (mensual) | ~$50 USD |
| Dominio (anual) | ~$12 USD |
| SSL | Gratuito |
| **Total Primer Año** | **~$612 USD** |
| **Total Mensual Promedio** | **~$51 USD** |

---

## Checklist Final de Despliegue

```
PREPARACIÓN
□ Cuenta de GCP configurada
□ gcloud CLI instalado
□ Dominio registrado

INFRAESTRUCTURA
□ VM creada
□ IP estática reservada
□ IP asignada a la VM
□ Firewall configurado (80, 443)
□ DNS configurado (A records)
□ DNS propagado (verificar con dig)

SOFTWARE
□ Docker instalado
□ Docker Compose instalado
□ Nginx instalado
□ Certbot instalado
□ UFW configurado

APLICACIÓN
□ Repositorio clonado
□ Variables de entorno configuradas
□ Storage directories creados
□ Docker Compose levantado
□ Migraciones ejecutadas
□ Seeds ejecutados (primera vez)

SSL
□ Certificados obtenidos
□ Nginx configurado con SSL
□ Redirección HTTP -> HTTPS
□ Renovación automática verificada

VERIFICACIÓN FINAL
□ https://nomina.tuempresa.com funciona
□ https://api.nomina.tuempresa.com/health responde
□ https://n8n.nomina.tuempresa.com accesible
□ Login funciona
□ Backup configurado
□ Monitoreo configurado
```

---

*Guía de Despliegue en Google Cloud Platform*
*Versión: 1.0*
*Última actualización: Enero 2024*
