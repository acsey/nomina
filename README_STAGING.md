# Despliegue en Staging

Guía rápida para desplegar el Sistema de Nómina en ambiente de staging.

## Requisitos

- Ubuntu 24.04 LTS (o sistema compatible)
- Docker >= 24.x
- Docker Compose >= 2.x
- 4GB RAM mínimo (8GB recomendado)
- 40GB espacio en disco
- Puertos 80 y 443 disponibles

## Inicio Rápido

### 1. Clonar y Configurar

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# Crear archivo de configuración
cp .env.staging.example .env.staging

# Editar con tus valores
nano .env.staging
```

### 2. Generar Claves Seguras

```bash
# JWT_SECRET
echo "JWT_SECRET: $(openssl rand -base64 48)"

# ENCRYPTION_KEY
echo "ENCRYPTION_KEY: $(openssl rand -base64 48)"

# REDIS_PASSWORD
echo "REDIS_PASSWORD: $(openssl rand -base64 32)"

# DB_PASSWORD
echo "DB_PASSWORD: $(openssl rand -base64 24)"
```

Copia estos valores al archivo `.env.staging`.

### 3. Desplegar

```bash
# Dar permisos al script
chmod +x deploy-staging.sh

# Desplegar (sin SSL)
./deploy-staging.sh

# Desplegar con SSL auto-firmado
./deploy-staging.sh --ssl-self

# Desplegar con Let's Encrypt
./deploy-staging.sh --ssl tu-dominio.com

# Desplegar desde cero (borra datos)
./deploy-staging.sh --fresh
```

### 4. Verificar

```bash
# Health check
curl http://localhost/api/health

# Ver estado de contenedores
docker compose -f docker-compose.staging.yml --env-file .env.staging ps

# Ver logs
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f
```

## Estructura de Archivos

```
nomina/
├── docker-compose.staging.yml    # Configuración de servicios
├── .env.staging.example          # Plantilla de variables
├── .env.staging                  # Variables (crear manualmente)
├── deploy-staging.sh             # Script de despliegue
├── nginx/
│   ├── staging.conf              # Configuración Nginx
│   └── ssl/                      # Certificados SSL
└── scripts/
    └── verify-staging.sh         # Script de verificación
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (proxy)                           │
│                     Puertos: 80, 443                            │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Backend API       │            │   Frontend          │
│   (QUEUE_MODE=api)  │            │   (React + Nginx)   │
└─────────────────────┘            └─────────────────────┘
         │
         │ BullMQ
         ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Redis (Colas)     │◄───────────│   Worker            │
└─────────────────────┘            │   (QUEUE_MODE=worker)│
         │                          └─────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL 16                              │
└─────────────────────────────────────────────────────────────────┘
```

## Variables de Entorno Requeridas

| Variable | Descripción | Generar |
|----------|-------------|---------|
| `DB_USER` | Usuario PostgreSQL | - |
| `DB_PASSWORD` | Password PostgreSQL | `openssl rand -base64 24` |
| `DB_NAME` | Nombre de BD | - |
| `JWT_SECRET` | Firma de tokens | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | Cifrado de datos | `openssl rand -base64 48` |
| `REDIS_PASSWORD` | Password Redis | `openssl rand -base64 32` |
| `FRONTEND_URL` | URL del frontend | URL pública |

## Comandos Útiles

### Gestión de Servicios

```bash
# Alias útil (agregar a ~/.bashrc)
alias dc='docker compose -f docker-compose.staging.yml --env-file .env.staging'

# Iniciar
dc up -d

# Detener
dc down

# Reiniciar
dc restart

# Ver estado
dc ps

# Ver logs
dc logs -f

# Logs de un servicio
dc logs -f backend
```

### Base de Datos

```bash
# Ejecutar migraciones
dc exec backend npx prisma migrate deploy

# Ejecutar seed
dc exec backend npx prisma db seed

# Conectar a PostgreSQL
dc exec db psql -U nomina_staging -d nomina_staging_db

# Backup
dc exec db pg_dump -U nomina_staging nomina_staging_db > backup.sql

# Restaurar
dc exec -T db psql -U nomina_staging nomina_staging_db < backup.sql
```

### Escalar Workers

```bash
# Escalar a 2 workers
dc up -d --scale worker=2

# Ver workers
dc ps worker
```

## Modo de Timbrado CFDI

El sistema soporta dos modos:

### Modo Sync (desarrollo)
```env
CFDI_STAMP_MODE=sync
```
- Timbrado directo y bloqueante
- Ideal para pruebas rápidas

### Modo Async (staging/producción)
```env
CFDI_STAMP_MODE=async
```
- Timbrado via colas BullMQ/Redis
- Workers procesan en segundo plano
- Retorna `batchId` inmediatamente
- Frontend hace polling a `/api/payroll/:id/stamping-status`

## Flujo de Estados del Período

```
DRAFT → CALCULATED → PROCESSING → APPROVED → PAID → CLOSED
                          │            ▲
                          │            │
                          └────────────┘
                       Period Finalizer
                    (auto cuando todos
                     CFDIs timbrados)
```

## Health Checks

| Endpoint | Descripción |
|----------|-------------|
| `http://localhost/health` | Nginx health |
| `http://localhost/api/health` | Backend health |

## Troubleshooting

### El backend no arranca

```bash
# Ver logs detallados
dc logs backend

# Verificar variables de entorno
dc exec backend env | grep -E "(DATABASE_URL|JWT_SECRET)"
```

### Error de conexión a BD

```bash
# Verificar que db esté healthy
dc ps db

# Probar conexión
dc exec db pg_isready -U nomina_staging -d nomina_staging_db
```

### Error de migraciones

```bash
# Ver estado
dc exec backend npx prisma migrate status

# Aplicar forzadamente
dc exec backend npx prisma migrate deploy
```

### Limpiar Docker

```bash
# Limpiar builds
docker builder prune -f

# Limpiar todo (CUIDADO)
docker system prune -a
```

## Smoke Tests

```bash
# 1. Health check
curl -s http://localhost/api/health | jq

# 2. Login
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"admin123"}' | jq

# 3. Verificar Redis
dc exec redis redis-cli -a $REDIS_PASSWORD ping
```

## Seguridad

- Cambiar todas las contraseñas por defecto
- Usar SSL/TLS (mínimo auto-firmado)
- No exponer puertos internos (5432, 6379)
- Rotar secretos periódicamente
- Realizar backups regulares

## Documentación Adicional

- [Guía Completa Ubuntu 24.04](docs/11-GUIA-DESPLIEGUE-UBUNTU-24.md)
- [Documento de Despliegue](docs/02-documento-despliegue.md)
- [Documento Técnico](docs/01-documento-tecnico.md)

## Soporte

Para problemas o preguntas, revisar la documentación en `docs/` o contactar al equipo de desarrollo.

---
*Última actualización: Enero 2025*
