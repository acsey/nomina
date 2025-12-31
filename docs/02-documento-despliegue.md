# Documento de Despliegue - Sistema de Nómina

## 1. Requisitos del Sistema

### 1.1 Requisitos de Hardware (Producción)

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Almacenamiento | 40 GB SSD | 100+ GB SSD |
| Red | 100 Mbps | 1 Gbps |

### 1.2 Requisitos de Software

| Software | Versión Mínima |
|----------|----------------|
| Docker | 24.x |
| Docker Compose | 2.x |
| Node.js (sin Docker) | 20.x |
| PostgreSQL (sin Docker) | 15.x |
| Redis (sin Docker) | 7.x |

### 1.3 Puertos Requeridos

| Puerto | Servicio |
|--------|----------|
| 80 | HTTP (redirige a HTTPS) |
| 443 | HTTPS |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 3000 | Backend API |
| 5173 | Frontend (desarrollo) |

---

## 2. Despliegue con Docker (Recomendado)

### 2.1 Estructura de Archivos Docker

```
nomina/
├── docker-compose.yml          # Producción
├── docker-compose.dev.yml      # Desarrollo
├── .env.example                # Variables de entorno
├── storage/                    # Evidencias fiscales (volumen)
│   └── fiscal/
├── backend/
│   └── Dockerfile
└── frontend/
    └── Dockerfile
```

### 2.2 Despliegue en Desarrollo

#### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/nomina.git
cd nomina
```

#### Paso 2: Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con configuraciones de desarrollo
```

#### Paso 3: Crear directorio de storage
```bash
mkdir -p storage/fiscal
chmod 755 storage
```

#### Paso 4: Levantar servicios
```bash
docker compose -f docker-compose.dev.yml up --build
```

#### Paso 5: Ejecutar migraciones
```bash
docker exec nomina-backend-dev npx prisma migrate dev
```

#### Paso 6: Crear datos iniciales (seed)
```bash
docker exec nomina-backend-dev npx prisma db seed
```

### 2.3 Despliegue en Producción

#### Paso 1: Preparar variables de entorno
```bash
cp .env.example .env
# IMPORTANTE: Editar .env con valores seguros de producción
# Ver sección "Variables de Entorno de Producción"
```

#### Paso 2: Generar claves seguras
```bash
# Generar JWT_SECRET
openssl rand -base64 32

# Generar ENCRYPTION_KEY
openssl rand -base64 32

# Generar REDIS_PASSWORD
openssl rand -base64 24
```

#### Paso 3: Configurar storage de evidencias fiscales
```bash
# Crear directorio de storage
mkdir -p storage/fiscal

# Asegurar permisos (el contenedor corre como node user, UID 1000)
chown -R 1000:1000 storage
chmod -R 755 storage
```

#### Paso 4: Construir y levantar servicios
```bash
# Servicios básicos
docker compose up -d --build

# Con worker enterprise (alto volumen de timbrado)
docker compose --profile enterprise up -d --build
```

#### Paso 5: Ejecutar migraciones de producción
```bash
# IMPORTANTE: Usar 'migrate deploy' en producción, NO 'migrate dev'
docker exec nomina-backend npx prisma migrate deploy
```

#### Paso 6: Verificar despliegue
```bash
# Health check
curl http://localhost:3000/api/health

# Ver logs
docker compose logs -f backend
```

#### Comandos de Producción
```bash
# Construir y levantar
docker compose up -d --build

# Ver logs
docker compose logs -f

# Ejecutar migraciones
docker exec nomina-backend npx prisma migrate deploy

# Reiniciar servicios
docker compose restart

# Detener servicios
docker compose down

# Backup de volúmenes
docker run --rm -v nomina_fiscal_storage:/data -v $(pwd):/backup alpine tar czf /backup/fiscal-backup.tar.gz /data
```

---

## 3. Servicios y Componentes

### 3.1 PostgreSQL (Base de Datos)

Base de datos principal del sistema.

```yaml
# Verificar estado
docker exec nomina-db pg_isready -U nomina -d nomina_db

# Backup
docker exec nomina-db pg_dump -U nomina nomina_db > backup.sql

# Restore
cat backup.sql | docker exec -i nomina-db psql -U nomina -d nomina_db
```

### 3.2 Redis (Colas de Procesamiento)

Cola de procesamiento asíncrono para timbrado masivo y tareas en background.

```yaml
# Verificar estado
docker exec nomina-redis redis-cli ping

# Monitorear colas
docker exec nomina-redis redis-cli monitor
```

### 3.3 Backend API (NestJS)

API REST con endpoints para todas las operaciones del sistema.

```yaml
# Ver logs
docker logs -f nomina-backend

# Ejecutar comando dentro del contenedor
docker exec -it nomina-backend sh
```

### 3.4 Worker (Enterprise)

Procesador de colas para timbrado masivo y operaciones asíncronas.

#### Modos de Operación (QUEUE_MODE)

El sistema soporta 3 modos de operación para escalar horizontalmente:

| Modo | Descripción | Uso |
|------|-------------|-----|
| `api` | Solo API (enqueue jobs, no procesa) | Backend en producción |
| `worker` | Solo Worker (procesa jobs, no API) | Workers dedicados |
| `both` | API + Worker en mismo proceso | Desarrollo o instancias pequeñas |

**Arquitectura Recomendada para Producción:**

```
                    ┌─────────────┐
                    │   Nginx     │
                    │   (LB)      │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Backend    │ │  Backend    │ │  Backend    │
    │ QUEUE_MODE  │ │ QUEUE_MODE  │ │ QUEUE_MODE  │
    │   =api      │ │   =api      │ │   =api      │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │   (Colas)   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   Worker    │ │   Worker    │ │   Worker    │
    │  (node      │ │  (node      │ │  (node      │
    │ dist/worker)│ │ dist/worker)│ │ dist/worker)│
    └─────────────┘ └─────────────┘ └─────────────┘
```

#### Comandos de Despliegue

```bash
# Levantar solo API (sin procesadores)
docker compose up -d backend  # Ya usa QUEUE_MODE=api por defecto

# Levantar worker separado (perfil enterprise)
docker compose --profile enterprise up -d worker

# Ver logs del worker
docker logs -f nomina-worker

# Escalar workers
docker compose --profile enterprise up -d --scale worker=3
```

#### Configuración en docker-compose.yml

```yaml
# Backend API (solo enqueue)
backend:
  environment:
    QUEUE_MODE: api  # Solo registra colas, no procesa

# Worker (solo procesa)
worker:
  command: ["node", "dist/worker.js"]
  environment:
    WORKER_CONCURRENCY: 5  # Jobs concurrentes por worker
```

#### Scripts npm Disponibles

```bash
# Iniciar API en modo producción
npm run start:prod         # Usa QUEUE_MODE del entorno

# Iniciar API forzando modo api
npm run start:api          # QUEUE_MODE=api

# Iniciar worker standalone
npm run start:worker       # Ejecuta dist/worker.js
```

### 3.5 Storage de Evidencias Fiscales

Almacenamiento persistente para documentos fiscales (XML, PDF, acuses).

**Estructura de directorios:**
```
storage/fiscal/
├── {companyId}/
│   └── {year}/
│       └── {period}/
│           ├── {detailId}_xml_original_v1.xml
│           ├── {detailId}_xml_timbrado_v1.xml
│           └── {detailId}_pdf_recibo_v1.pdf
```

**Verificación de integridad:**
El sistema almacena hash SHA256 de cada documento para verificar integridad.

---

## 4. Variables de Entorno de Producción

### 4.1 Archivo .env Completo

```env
# Base de datos
DB_USER=nomina_prod
DB_PASSWORD=<password-seguro-generado>
DB_NAME=nomina_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<password-redis-generado>
REDIS_DB=0

# JWT - IMPORTANTE: Usar clave única generada
JWT_SECRET=<clave-jwt-generada-min-32-chars>
JWT_EXPIRES_IN=8h

# Cifrado - IMPORTANTE: Usar clave única generada
ENCRYPTION_KEY=<clave-cifrado-generada-min-32-chars>

# Storage fiscal
FISCAL_STORAGE_PATH=/app/storage/fiscal

# Frontend URL (CORS)
FRONTEND_URL=https://nomina.tu-empresa.com

# PAC (Proveedor de Timbrado)
PAC_URL=https://facturacion.finkok.com
PAC_USER=tu_usuario_pac_produccion
PAC_PASSWORD=<password-pac>

# Modo de procesamiento de colas
# api: Solo API (enqueue, no procesa) - usar con workers separados
# worker: Solo Worker (procesa, no API) - usado por el servicio worker
# both: API + Worker juntos - desarrollo o instancias pequeñas
QUEUE_MODE=api
WORKER_CONCURRENCY=5
```

### 4.2 Variables Críticas de Seguridad

| Variable | Descripción | Cómo Generar |
|----------|-------------|--------------|
| JWT_SECRET | Firma de tokens JWT | `openssl rand -base64 32` |
| ENCRYPTION_KEY | Cifrado de datos sensibles | `openssl rand -base64 32` |
| DB_PASSWORD | Password PostgreSQL | `openssl rand -base64 24` |
| REDIS_PASSWORD | Password Redis | `openssl rand -base64 24` |

---

## 5. Despliegue Manual (Sin Docker)

### 5.1 Preparación del Servidor

#### Ubuntu/Debian
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2
```

### 5.2 Configuración de PostgreSQL

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear usuario y base de datos
CREATE USER nomina_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE nomina OWNER nomina_user;
GRANT ALL PRIVILEGES ON DATABASE nomina TO nomina_user;
\q
```

### 5.3 Configuración de Redis

```bash
# Editar configuración
sudo nano /etc/redis/redis.conf

# Agregar password
requirepass tu_password_redis_seguro

# Reiniciar Redis
sudo systemctl restart redis-server
```

### 5.4 Crear Directorio de Storage

```bash
# Crear directorio para evidencias fiscales
sudo mkdir -p /var/www/nomina/storage/fiscal
sudo chown -R www-data:www-data /var/www/nomina/storage
sudo chmod -R 755 /var/www/nomina/storage
```

### 5.5 Despliegue del Backend

```bash
# Clonar y navegar
cd /var/www
git clone https://github.com/tu-usuario/nomina.git
cd nomina/backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con valores de producción

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones (IMPORTANTE: usar deploy, no dev)
npx prisma migrate deploy

# Compilar TypeScript
npm run build

# Iniciar con PM2
pm2 start dist/main.js --name nomina-backend
pm2 save
pm2 startup
```

### 5.6 Configuración de Nginx

```nginx
# /etc/nginx/sites-available/nomina
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    ssl_certificate /etc/ssl/certs/tu-certificado.crt;
    ssl_certificate_key /etc/ssl/private/tu-certificado.key;

    # Frontend
    location / {
        root /var/www/nomina/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/nomina /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. Configuración de SSL

### 6.1 Con Let's Encrypt (Recomendado)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (cron)
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 7. Backups

### 7.1 Backup de Base de Datos

#### Script de Backup
```bash
#!/bin/bash
# /opt/scripts/backup-db.sh

BACKUP_DIR="/var/backups/nomina"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="nomina"
DB_USER="nomina_user"

mkdir -p $BACKUP_DIR

# Backup base de datos
PGPASSWORD="tu_password" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/nomina_db_$DATE.sql.gz

# Eliminar backups mayores a 30 días
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete

echo "Backup DB completado: nomina_db_$DATE.sql.gz"
```

### 7.2 Backup de Evidencias Fiscales

```bash
#!/bin/bash
# /opt/scripts/backup-fiscal.sh

BACKUP_DIR="/var/backups/nomina"
STORAGE_DIR="/var/www/nomina/storage/fiscal"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup incremental de evidencias fiscales
tar czf $BACKUP_DIR/fiscal_$DATE.tar.gz -C $STORAGE_DIR .

# Eliminar backups mayores a 90 días (requerimiento SAT: 5 años)
find $BACKUP_DIR -type f -name "fiscal_*.tar.gz" -mtime +90 -delete

echo "Backup fiscal completado: fiscal_$DATE.tar.gz"
```

### 7.3 Programar Backups

```bash
sudo chmod +x /opt/scripts/backup-db.sh
sudo chmod +x /opt/scripts/backup-fiscal.sh
sudo crontab -e
# Agregar:
# 0 2 * * * /opt/scripts/backup-db.sh
# 0 3 * * * /opt/scripts/backup-fiscal.sh
```

---

## 8. Monitoreo

### 8.1 Health Checks

```bash
# Backend API
curl https://tu-dominio.com/api/health

# PostgreSQL
docker exec nomina-db pg_isready -U nomina

# Redis
docker exec nomina-redis redis-cli ping
```

### 8.2 Logs

| Componente | Comando |
|------------|---------|
| Backend | `docker logs -f nomina-backend` |
| Worker | `docker logs -f nomina-worker` |
| PostgreSQL | `docker logs -f nomina-db` |
| Redis | `docker logs -f nomina-redis` |
| Nginx | `/var/log/nginx/access.log` |

---

## 9. Troubleshooting

### 9.1 Problemas Comunes

#### Error de conexión a base de datos
```bash
# Verificar que PostgreSQL esté corriendo
docker exec nomina-db pg_isready -U nomina

# Verificar conexión desde backend
docker exec nomina-backend npx prisma db push --accept-data-loss
```

#### Error de conexión a Redis
```bash
# Verificar Redis
docker exec nomina-redis redis-cli ping

# Verificar password
docker exec nomina-redis redis-cli -a tu_password ping
```

#### Migraciones fallidas
```bash
# Ver estado de migraciones
docker exec nomina-backend npx prisma migrate status

# Forzar sincronización (¡SOLO EN EMERGENCIAS!)
docker exec nomina-backend npx prisma db push
```

#### Permisos de storage
```bash
# Verificar permisos
ls -la storage/fiscal/

# Corregir permisos
sudo chown -R 1000:1000 storage
sudo chmod -R 755 storage
```

---

## 10. Checklist de Despliegue

### Pre-despliegue
- [ ] Backup de base de datos existente
- [ ] Backup de evidencias fiscales existentes
- [ ] Verificar requisitos de hardware
- [ ] Obtener certificados SSL
- [ ] Configurar DNS
- [ ] Generar claves seguras (JWT_SECRET, ENCRYPTION_KEY)
- [ ] Configurar credenciales PAC de producción
- [ ] Preparar variables de entorno (.env)

### Despliegue
- [ ] Clonar repositorio
- [ ] Crear directorio de storage: `mkdir -p storage/fiscal`
- [ ] Configurar permisos: `chown -R 1000:1000 storage`
- [ ] Configurar .env con valores de producción
- [ ] Construir imágenes: `docker compose build`
- [ ] Levantar servicios: `docker compose up -d`
- [ ] Ejecutar migraciones: `npx prisma migrate deploy`
- [ ] Configurar Nginx/proxy reverso
- [ ] Configurar SSL

### Post-despliegue
- [ ] Verificar health check: `curl /api/health`
- [ ] Probar login con usuario admin
- [ ] Verificar conexión a Redis
- [ ] Probar timbrado en modo sandbox
- [ ] Verificar escritura en storage fiscal
- [ ] Configurar backups automáticos (DB + fiscal)
- [ ] Configurar monitoreo
- [ ] Documentar accesos y credenciales (seguro)
- [ ] Probar restauración de backup

### Validación Fiscal (antes de producción)
- [ ] Verificar certificados CSD vigentes
- [ ] Probar timbrado con PAC en sandbox
- [ ] Verificar generación correcta de XML CFDI 4.0
- [ ] Verificar complemento nómina 1.2
- [ ] Probar cancelación de CFDI
- [ ] Validar evidencias fiscales almacenadas

---

*Documento generado: Diciembre 2024*
*Versión del documento: 2.0*
