# Despliegue en Staging

Guía para desplegar el Sistema de Nómina en un entorno de staging.

## Requisitos Previos

- Docker >= 20.10
- Docker Compose >= 2.0
- 4GB RAM mínimo (8GB recomendado)
- 20GB espacio en disco
- Puerto 80 y 443 disponibles

## Estructura de Archivos

```
nomina/
├── docker-compose.staging.yml    # Configuración de servicios
├── .env.staging.example          # Variables de entorno (plantilla)
├── .env.staging                   # Variables de entorno (crear)
├── nginx/
│   ├── staging.conf              # Configuración de Nginx
│   └── ssl/                      # Certificados SSL (opcional)
├── backend/
│   ├── Dockerfile                # Build del backend
│   └── docker-entrypoint.sh      # Script de validación de entorno
└── frontend/
    └── Dockerfile                # Build del frontend
```

## Arquitectura de Contenedores

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (proxy)                            │
│                     Puertos: 80, 443                             │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Backend API       │            │   Frontend          │
│   (QUEUE_MODE=api)  │            │   (React + Nginx)   │
│   Puerto: 3000      │            │   Puerto: 80        │
└─────────────────────┘            └─────────────────────┘
         │
         │ Encola jobs
         ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Redis (BullMQ)    │◄───────────│   Worker            │
│   Cola de jobs      │            │   (QUEUE_MODE=worker)│
└─────────────────────┘            │   Procesa CFDIs     │
         │                          └─────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL                                 │
│                   (Base de datos)                                │
└─────────────────────────────────────────────────────────────────┘
```

**Separación de responsabilidades:**
- **Backend (QUEUE_MODE=api)**: Solo API HTTP, encola jobs en Redis
- **Worker (QUEUE_MODE=worker)**: Solo procesa jobs, no expone API
- **Redis**: Cola de mensajes para procesamiento asíncrono
- **PostgreSQL**: Base de datos (NO expone puertos externamente)

## Paso 1: Configurar Variables de Entorno

```bash
# Copiar plantilla
cp .env.staging.example .env.staging

# Editar con valores reales
nano .env.staging
```

### Variables Requeridas

| Variable | Descripción |
|----------|-------------|
| `DB_USER` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `DB_NAME` | Nombre de la base de datos |
| `JWT_SECRET` | Secreto para tokens JWT (mín 32 chars) |
| `ENCRYPTION_KEY` | Clave de cifrado (mín 32 chars) |
| `REDIS_PASSWORD` | Contraseña de Redis |
| `FRONTEND_URL` | URL del frontend para CORS |

### Generar Secretos Seguros

```bash
# Generar JWT_SECRET
openssl rand -base64 48

# Generar ENCRYPTION_KEY
openssl rand -base64 48

# Generar REDIS_PASSWORD
openssl rand -base64 32
```

## Paso 2: Configurar SSL (Opcional pero Recomendado)

```bash
# Crear directorio para certificados
mkdir -p nginx/ssl

# Opción A: Let's Encrypt con certbot
certbot certonly --standalone -d staging.nomina.example.com

# Copiar certificados
cp /etc/letsencrypt/live/staging.nomina.example.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/staging.nomina.example.com/privkey.pem nginx/ssl/

# Descomentar configuración SSL en nginx/staging.conf
```

## Paso 3: Desplegar

```bash
# Build y despliegue
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# Ver logs
docker compose -f docker-compose.staging.yml logs -f

# Ver estado de los servicios
docker compose -f docker-compose.staging.yml ps
```

## Paso 4: Ejecutar Migraciones

```bash
# Acceder al contenedor del backend
docker exec -it nomina-staging-backend sh

# Ejecutar migraciones
npx prisma migrate deploy

# Ejecutar seeds (opcional)
npx prisma db seed

# Salir del contenedor
exit
```

## Comandos Útiles

### Ver logs de un servicio específico

```bash
docker compose -f docker-compose.staging.yml logs -f backend
docker compose -f docker-compose.staging.yml logs -f nginx
```

### Reiniciar servicios

```bash
# Reiniciar todo
docker compose -f docker-compose.staging.yml restart

# Reiniciar servicio específico
docker compose -f docker-compose.staging.yml restart backend
```

### Actualizar deployment

```bash
# Pull cambios y rebuild
git pull
docker compose -f docker-compose.staging.yml up -d --build
```

### Ver recursos

```bash
docker stats nomina-staging-backend nomina-staging-worker nomina-staging-db nomina-staging-redis
```

### Ver logs del worker

```bash
# Logs del worker (procesamiento de CFDIs)
docker compose -f docker-compose.staging.yml logs -f worker

# Ver solo errores de timbrado
docker compose -f docker-compose.staging.yml logs worker | grep -E "(ERROR|FAILED)"
```

### Escalar workers

```bash
# Escalar a 2 workers para mayor throughput
docker compose -f docker-compose.staging.yml up -d --scale worker=2

# Ver estado de workers
docker compose -f docker-compose.staging.yml ps worker
```

### Backup de base de datos

```bash
# Crear backup
docker exec nomina-staging-db pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i nomina-staging-db psql -U $DB_USER $DB_NAME < backup_20260113.sql
```

## Detener Servicios

```bash
# Detener sin eliminar datos
docker compose -f docker-compose.staging.yml down

# Detener y eliminar volúmenes (CUIDADO: borra datos)
docker compose -f docker-compose.staging.yml down -v
```

## Healthchecks

| Endpoint | Descripción |
|----------|-------------|
| `http://localhost/health` | Nginx health |
| `http://localhost/api/health` | Backend health |

## Troubleshooting

### El backend no arranca

```bash
# Ver logs detallados
docker compose -f docker-compose.staging.yml logs backend

# Verificar variables de entorno
docker exec nomina-staging-backend env | grep -E "(DATABASE_URL|JWT_SECRET)"
```

### Error de conexión a base de datos

```bash
# Verificar que db esté healthy
docker compose -f docker-compose.staging.yml ps db

# Probar conexión
docker exec nomina-staging-db pg_isready -U $DB_USER -d $DB_NAME
```

### Error de migraciones

```bash
# Ver estado de migraciones
docker exec nomina-staging-backend npx prisma migrate status

# Resolver migraciones pendientes
docker exec nomina-staging-backend npx prisma migrate deploy
```

### Limpiar caché de Docker

```bash
# Limpiar builds anteriores
docker builder prune -f

# Limpiar todo (CUIDADO)
docker system prune -a
```

## Arquitectura de Timbrado CFDI

El sistema soporta dos modos de timbrado controlados por `CFDI_STAMP_MODE`:

### Modo Sync (desarrollo)
```env
CFDI_STAMP_MODE=sync
```
- Timbrado directo y bloqueante
- El endpoint `/api/payroll/:id/approve` espera a que todos los CFDIs se timbren
- Ideal para desarrollo y pruebas rápidas

### Modo Async (staging/producción)
```env
CFDI_STAMP_MODE=async
```
- Timbrado via cola de BullMQ/Redis
- El endpoint `/api/payroll/:id/approve` retorna inmediatamente con `batchId`
- Frontend debe hacer polling a `/api/payroll/:id/stamping-status`
- Los workers procesan los jobs en segundo plano
- **Period Finalizer**: Cuando TODOS los CFDIs están timbrados (STAMP_OK),
  el worker automáticamente cambia el período a estado `APPROVED`

### Flujo de Estados del Período

```
DRAFT → CALCULATED → PROCESSING → APPROVED → PAID → CLOSED
                          │            ▲
                          │            │
                          └────────────┘
                       Period Finalizer
                    (auto cuando todos
                     CFDIs timbrados)
```

### Arquitectura de Colas

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Backend API   │────▶│    Redis    │────▶│ StampingWorker  │
│  (QUEUE_MODE:   │     │  (BullMQ)   │     │ (QUEUE_MODE:    │
│      api)       │     │             │     │    worker)      │
└─────────────────┘     └─────────────┘     └─────────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │   PAC (SAT) │
                                            │   FINKOK    │
                                            │   SW_SAPIEN │
                                            └─────────────┘
```

**IMPORTANTE:** En staging/producción usamos contenedores separados:
- `backend`: `QUEUE_MODE=api` (solo encola, no procesa)
- `worker`: `QUEUE_MODE=worker` (solo procesa, no API)

## Smoke Tests

### 1. Verificar servicios arriba
```bash
# Health check de todos los servicios
curl -s http://localhost/api/health | jq
# Esperado: { "status": "ok", "version": "..." }
```

### 2. Verificar autenticación
```bash
# Login
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq

# Esperado: { "accessToken": "...", "user": {...} }
```

### 3. Verificar Redis y colas
```bash
# Verificar conexión a Redis
docker exec nomina-staging-backend sh -c "redis-cli -h redis -a \$REDIS_PASSWORD ping"
# Esperado: PONG

# Verificar estadísticas de colas
curl -s -X GET http://localhost/api/queues/stats \
  -H "Authorization: Bearer <token>" | jq
# Esperado: { "cfdiStamping": {...}, "payrollCalculation": {...} }
```

### 4. Verificar modo de timbrado
```bash
# Consultar configuración
docker exec nomina-staging-backend sh -c "echo \$CFDI_STAMP_MODE"
# Esperado: async (en staging)
```

### 5. Test completo de nómina (con datos de prueba)
```bash
# 1. Crear período de prueba
curl -s -X POST http://localhost/api/payroll/periods \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"companyId":"...","periodType":"WEEKLY",...}'

# 2. Calcular nómina
curl -s -X POST http://localhost/api/payroll/periods/<id>/calculate \
  -H "Authorization: Bearer <token>"

# 3. Aprobar (dispara timbrado)
curl -s -X POST http://localhost/api/payroll/periods/<id>/approve \
  -H "Authorization: Bearer <token>"

# 4. Verificar estado de timbrado (modo async)
curl -s http://localhost/api/payroll/periods/<id>/stamping-status \
  -H "Authorization: Bearer <token>" | jq
# Esperado: { "stamping": { "total": N, "stamped": X, "pending": Y, "progress": Z } }
```

## Seguridad

- Cambiar todas las contraseñas por defecto
- Usar SSL/TLS en producción
- Mantener el firewall configurado (solo puertos 80/443)
- Rotar secretos periódicamente
- Realizar backups regulares
- Monitorear logs de acceso

## Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.
