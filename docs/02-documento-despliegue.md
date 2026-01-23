# Documento de Despliegue - Sistema de Nómina

Guía completa de despliegue para todos los ambientes del Sistema de Nómina.

## Tabla de Contenidos

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Ambientes Disponibles](#2-ambientes-disponibles)
3. [Desarrollo Local](#3-desarrollo-local)
4. [Staging](#4-staging)
5. [Producción](#5-producción)
6. [Archivos de Configuración](#6-archivos-de-configuración)
7. [Variables de Entorno](#7-variables-de-entorno)
8. [Scripts de Deploy](#8-scripts-de-deploy)
9. [SSL y Certificados](#9-ssl-y-certificados)
10. [Backups](#10-backups)
11. [Monitoreo](#11-monitoreo)
12. [Troubleshooting](#12-troubleshooting)
13. [Checklist de Despliegue](#13-checklist-de-despliegue)

---

## 1. Requisitos del Sistema

### 1.1 Requisitos de Hardware

| Componente | Desarrollo | Staging | Producción |
|------------|------------|---------|------------|
| CPU | 2 cores | 2 cores | 4+ cores |
| RAM | 4 GB | 4 GB | 8+ GB |
| Almacenamiento | 20 GB | 40 GB SSD | 100+ GB SSD |
| Red | - | 100 Mbps | 1 Gbps |

### 1.2 Requisitos de Software

| Software | Versión Mínima | Notas |
|----------|----------------|-------|
| Docker | 24.x | Obligatorio |
| Docker Compose | 2.x | Plugin de Docker |
| Git | 2.x | Para clonar repositorio |
| OpenSSL | 3.x | Para generar certificados |

### 1.3 Sistemas Operativos Soportados

| SO | Versión | Estado |
|----|---------|--------|
| Ubuntu | 22.04 LTS, 24.04 LTS | Recomendado |
| Debian | 11, 12 | Soportado |
| CentOS/RHEL | 8, 9 | Soportado |
| Windows | 10/11 con WSL2 | Desarrollo |
| macOS | 12+ | Desarrollo |

### 1.4 Puertos Requeridos

| Puerto | Servicio | Ambiente |
|--------|----------|----------|
| 80 | HTTP | Staging, Producción |
| 443 | HTTPS | Staging, Producción |
| 5173 | Vite Dev Server | Desarrollo |
| 3000 | Backend API | Todos |
| 5432 / 5435 | PostgreSQL | Interno |
| 6379 | Redis | Interno |
| 9090 | Adminer | Desarrollo |
| 5678 | n8n | Desarrollo |

---

## 2. Ambientes Disponibles

### 2.1 Resumen de Ambientes

| Ambiente | Archivo Compose | Archivo Env | Propósito |
|----------|-----------------|-------------|-----------|
| **Desarrollo** | `docker-compose.dev.yml` | `.env` | Hot-reload, debugging |
| **Staging** | `docker-compose.staging.yml` | `.env.staging` | QA, pre-producción |
| **Producción** | `docker-compose.production.yml` | `.env.production` | Ambiente productivo |

### 2.2 Diferencias entre Ambientes

| Característica | Desarrollo | Staging | Producción |
|----------------|------------|---------|------------|
| Hot-reload | Si | No | No |
| Swagger | Habilitado | Deshabilitado* | Deshabilitado |
| Adminer | Habilitado | No | No |
| n8n | Habilitado | No | Opcional |
| Worker separado | Opcional | Si | Si |
| SSL | No | Recomendado | Obligatorio |
| Límites recursos | No | Si | Si |
| Backups auto | No | Recomendado | Obligatorio |

*Se puede habilitar temporalmente con `ENABLE_SWAGGER=true`

---

## 3. Desarrollo Local

### 3.1 Inicio Rápido

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Crear directorio de storage
mkdir -p storage/fiscal

# 4. Levantar servicios
docker compose -f docker-compose.dev.yml up --build

# 5. En otra terminal, ejecutar migraciones
docker exec nomina-backend-dev npx prisma migrate dev

# 6. Cargar datos de prueba
docker exec nomina-backend-dev npx prisma db seed
```

### 3.2 Script Automatizado

```bash
# Hace todo automáticamente
./deploy-fresh.sh
```

### 3.3 URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Adminer | http://localhost:9090 |
| n8n | http://localhost:5678 |

### 3.4 Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | admin@sistema.com | admin123 |
| Admin BFS | admin@bfs.com.mx | admin123 |
| RH BFS | rh@bfs.com.mx | admin123 |

### 3.5 Comandos Make

```bash
make dev           # Iniciar desarrollo
make dev-d         # Desarrollo en background
make dev-down      # Detener
make logs          # Ver logs
make migrate       # Ejecutar migraciones
make seed          # Ejecutar seed
make studio        # Abrir Prisma Studio
```

---

## 4. Staging

### 4.1 Prerrequisitos

- Servidor Ubuntu 24.04 LTS (ver [Guía Ubuntu 24.04](11-GUIA-DESPLIEGUE-UBUNTU-24.md))
- Docker y Docker Compose instalados
- Puerto 80 y 443 disponibles
- Dominio configurado (opcional pero recomendado)

### 4.2 Configuración

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# 2. Crear archivo de configuración
cp .env.staging.example .env.staging

# 3. Editar con valores reales
nano .env.staging

# 4. Generar claves seguras
openssl rand -base64 48  # JWT_SECRET
openssl rand -base64 48  # ENCRYPTION_KEY
openssl rand -base64 32  # REDIS_PASSWORD
```

### 4.3 Despliegue

```bash
# Opción 1: Script automatizado
./deploy-staging.sh

# Opción 2: Con SSL auto-firmado
./deploy-staging.sh --ssl-self

# Opción 3: Con Let's Encrypt
./deploy-staging.sh --ssl staging.tu-dominio.com

# Opción 4: Desde cero (borra datos)
./deploy-staging.sh --fresh
```

### 4.4 Verificación

```bash
# Health check
curl http://localhost/api/health

# Ver logs
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f
```

### 4.5 Documentación Detallada

Ver [Guía de Despliegue Ubuntu 24.04](11-GUIA-DESPLIEGUE-UBUNTU-24.md) para instrucciones paso a paso.

---

## 5. Producción

### 5.1 Prerrequisitos

- Todo lo de staging, más:
- Certificado SSL válido (Let's Encrypt o comercial)
- Dominio público configurado
- Backup automatizado
- Monitoreo configurado

### 5.2 Configuración

```bash
# 1. Crear configuración de producción
cp .env.production.example .env.production

# 2. Configurar con valores seguros
nano .env.production

# 3. Generar claves seguras
openssl rand -base64 48  # JWT_SECRET
openssl rand -base64 48  # ENCRYPTION_KEY
openssl rand -base64 32  # REDIS_PASSWORD
openssl rand -base64 32  # DB_PASSWORD
```

### 5.3 Variables Obligatorias para Producción

```env
# Seguridad (CAMBIAR OBLIGATORIAMENTE)
JWT_SECRET=<clave-generada-min-48-chars>
ENCRYPTION_KEY=<clave-generada-min-48-chars>
DB_PASSWORD=<password-seguro>
REDIS_PASSWORD=<password-seguro>

# URLs
FRONTEND_URL=https://nomina.tu-empresa.com

# PAC (producción)
PAC_MODE=production
PAC_PROVIDER=finkok
PAC_USER=tu_usuario_pac
PAC_PASSWORD=tu_password_pac
```

### 5.4 Despliegue

```bash
# Con SSL (obligatorio)
./deploy-production.sh --ssl nomina.tu-empresa.com

# Con backup previo
./deploy-production.sh --ssl nomina.tu-empresa.com --backup

# Actualizar sin recrear
./deploy-production.sh --update
```

### 5.5 Escalar Workers

```bash
# Escalar a 3 workers
./deploy-production.sh --scale-workers 3
```

---

## 6. Archivos de Configuración

### 6.1 Estructura de Docker Compose

```
nomina/
├── docker-compose.yml              # Base (no usar directamente)
├── docker-compose.dev.yml          # Desarrollo
├── docker-compose.staging.yml      # Staging
├── docker-compose.production.yml   # Producción
└── docker-compose.n8n.yml          # n8n separado
```

### 6.2 Archivos de Entorno

```
nomina/
├── .env.example                    # Plantilla desarrollo
├── .env.staging.example            # Plantilla staging
├── .env.production.example         # Plantilla producción
├── .env                            # Desarrollo (no commitear)
├── .env.staging                    # Staging (no commitear)
└── .env.production                 # Producción (no commitear)
```

### 6.3 Configuraciones Nginx

```
nomina/nginx/
├── staging.conf                    # Nginx para staging
├── production.conf                 # Nginx para producción
└── ssl/
    ├── fullchain.pem              # Certificado SSL
    └── privkey.pem                # Llave privada SSL
```

### 6.4 Scripts de Deploy

```
nomina/
├── deploy-fresh.sh                 # Desarrollo desde cero
├── deploy-staging.sh               # Deploy staging
├── deploy-production.sh            # Deploy producción
└── scripts/
    ├── verify-staging.sh           # Verificar staging
    └── init-n8n.sh                 # Inicializar n8n
```

---

## 7. Variables de Entorno

### 7.1 Variables de Base de Datos

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_USER` | Usuario PostgreSQL | `nomina_prod` |
| `DB_PASSWORD` | Password PostgreSQL | `secure-password` |
| `DB_NAME` | Nombre de la BD | `nomina_db` |

### 7.2 Variables de Seguridad

| Variable | Descripción | Generar con |
|----------|-------------|-------------|
| `JWT_SECRET` | Firma tokens JWT | `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Expiración JWT | `24h`, `8h` |
| `ENCRYPTION_KEY` | Cifrado datos | `openssl rand -base64 48` |

### 7.3 Variables de Redis

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `REDIS_HOST` | Host de Redis | `redis` |
| `REDIS_PORT` | Puerto Redis | `6379` |
| `REDIS_PASSWORD` | Password Redis | `secure-password` |
| `REDIS_DB` | Número de BD | `0` |

### 7.4 Variables de PAC (Timbrado)

| Variable | Descripción | Valores |
|----------|-------------|---------|
| `PAC_MODE` | Modo de operación | `sandbox`, `production`, `disabled` |
| `PAC_PROVIDER` | Proveedor PAC | `finkok`, `solucion_factible` |
| `PAC_USER` | Usuario PAC | - |
| `PAC_PASSWORD` | Password PAC | - |

### 7.5 Variables de Procesamiento

| Variable | Descripción | Valores |
|----------|-------------|---------|
| `QUEUE_MODE` | Modo de colas | `api`, `worker`, `both`, `sync` |
| `CFDI_STAMP_MODE` | Modo timbrado | `sync`, `async` |
| `WORKER_CONCURRENCY` | Jobs paralelos | `3`, `5` |

---

## 8. Scripts de Deploy

### 8.1 deploy-fresh.sh (Desarrollo)

```bash
# Uso
./deploy-fresh.sh

# Qué hace:
# 1. Detiene contenedores existentes
# 2. Elimina volúmenes de desarrollo
# 3. Reconstruye imágenes
# 4. Inicia base de datos
# 5. Ejecuta migraciones
# 6. Ejecuta seed
# 7. Inicia todos los servicios
# 8. Muestra credenciales de prueba
```

### 8.2 deploy-staging.sh

```bash
# Uso básico
./deploy-staging.sh

# Opciones
./deploy-staging.sh --ssl dominio.com    # Con Let's Encrypt
./deploy-staging.sh --ssl-self           # Con SSL auto-firmado
./deploy-staging.sh --fresh              # Desde cero (borra datos)
./deploy-staging.sh --migrate-only       # Solo migraciones
./deploy-staging.sh --help               # Ver ayuda

# Ver logs
./deploy-staging.sh logs
./deploy-staging.sh logs backend
```

### 8.3 deploy-production.sh

```bash
# Uso básico (SSL obligatorio)
./deploy-production.sh --ssl nomina.empresa.com

# Opciones
./deploy-production.sh --ssl dominio.com --backup    # Con backup previo
./deploy-production.sh --update                       # Solo actualizar
./deploy-production.sh --migrate-only                 # Solo migraciones
./deploy-production.sh --scale-workers 3              # Escalar workers
./deploy-production.sh --restore backup.sql.gz        # Restaurar backup

# Ver logs
./deploy-production.sh logs
```

---

## 9. SSL y Certificados

### 9.1 SSL Auto-firmado (Staging/Pruebas)

```bash
mkdir -p nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -subj "/C=MX/ST=Estado/L=Ciudad/O=Empresa/CN=localhost"
```

### 9.2 Let's Encrypt (Producción)

```bash
# Instalar certbot
sudo apt install -y certbot

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Copiar a nginx/ssl/
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem nginx/ssl/
```

### 9.3 Renovación Automática

```bash
# Cron para renovación
echo "0 3 * * * certbot renew --quiet && docker restart nomina-prod-nginx" | sudo crontab -
```

---

## 10. Backups

### 10.1 Backup Manual de Base de Datos

```bash
# Staging
docker compose -f docker-compose.staging.yml --env-file .env.staging exec db \
    pg_dump -U nomina_staging nomina_staging_db > backup_$(date +%Y%m%d).sql

# Producción
docker compose -f docker-compose.production.yml --env-file .env.production exec db \
    pg_dump -U nomina_prod nomina_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 10.2 Restaurar Backup

```bash
# Descomprimir si es necesario
gunzip backup_20250123.sql.gz

# Restaurar
docker compose -f docker-compose.production.yml --env-file .env.production exec -T db \
    psql -U nomina_prod nomina_db < backup_20250123.sql
```

### 10.3 Backup Automatizado (Cron)

```bash
# Script de backup
cat > /opt/scripts/backup-nomina.sh << 'EOF'
#!/bin/bash
cd /home/nomina/proyectos/nomina
BACKUP_DIR="/var/backups/nomina"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker compose -f docker-compose.production.yml --env-file .env.production exec -T db \
    pg_dump -U nomina_prod nomina_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /opt/scripts/backup-nomina.sh

# Cron diario a las 2 AM
echo "0 2 * * * /opt/scripts/backup-nomina.sh" | sudo crontab -
```

---

## 11. Monitoreo

### 11.1 Health Checks

```bash
# API Health
curl -s http://localhost/api/health | jq

# Respuesta esperada:
# {
#   "status": "ok",
#   "timestamp": "2025-01-23T...",
#   "version": "2.0.0"
# }
```

### 11.2 Estado de Servicios

```bash
# Ver estado
docker compose -f docker-compose.staging.yml --env-file .env.staging ps

# Recursos utilizados
docker stats
```

### 11.3 Logs

```bash
# Todos los logs
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f

# Solo errores
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f 2>&1 | grep -i error

# Logs del backend
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f backend

# Logs del worker
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f worker
```

---

## 12. Troubleshooting

### 12.1 Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| Puerto en uso | Otro servicio | `sudo lsof -i :80` y detener |
| Permiso denegado Docker | Usuario no en grupo | `sudo usermod -aG docker $USER` |
| Sin espacio | Disco lleno | `docker system prune -a` |
| Migraciones fallan | BD inconsistente | `npx prisma migrate reset` |
| Frontend blanco | API no accesible | Verificar CORS y logs |

### 12.2 Comandos de Diagnóstico

```bash
# Ver estado de Docker
docker info
systemctl status docker

# Ver uso de disco
df -h
docker system df

# Ver procesos Docker
docker ps -a
docker stats

# Logs del sistema
journalctl -u docker -f
```

### 12.3 Documentación Detallada

Ver [Guía de Despliegue Ubuntu 24.04](11-GUIA-DESPLIEGUE-UBUNTU-24.md) para solución detallada de problemas.

---

## 13. Checklist de Despliegue

### 13.1 Pre-despliegue

- [ ] Requisitos de hardware verificados
- [ ] Docker y Docker Compose instalados
- [ ] Puerto 80 y 443 disponibles
- [ ] Repositorio clonado
- [ ] Archivo .env configurado con claves seguras
- [ ] Certificados SSL preparados (si aplica)

### 13.2 Despliegue

- [ ] Imágenes construidas exitosamente
- [ ] Base de datos iniciada y healthy
- [ ] Redis iniciado y healthy
- [ ] Migraciones ejecutadas
- [ ] Seed ejecutado (si primera vez)
- [ ] Backend iniciado y healthy
- [ ] Worker iniciado y healthy
- [ ] Frontend iniciado
- [ ] Nginx iniciado

### 13.3 Post-despliegue

- [ ] Health check API responde OK
- [ ] Login funciona correctamente
- [ ] Frontend carga sin errores
- [ ] SSL funcionando (si aplica)
- [ ] Backup configurado (producción)
- [ ] Monitoreo configurado (producción)
- [ ] Documentación actualizada

### 13.4 Validación Fiscal (Pre-producción)

- [ ] Certificados CSD vigentes
- [ ] Timbrado PAC en sandbox probado
- [ ] XML CFDI 4.0 válido
- [ ] Complemento nómina 1.2 correcto
- [ ] Cancelación de CFDI probada
- [ ] Evidencias fiscales almacenadas correctamente

---

*Documento actualizado: Enero 2025*
*Versión: 2.0*
