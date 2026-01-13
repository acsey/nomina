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
│   └── Dockerfile                # Build del backend
└── frontend/
    └── Dockerfile                # Build del frontend
```

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
docker stats nomina-staging-backend nomina-staging-db nomina-staging-redis
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

## Seguridad

- Cambiar todas las contraseñas por defecto
- Usar SSL/TLS en producción
- Mantener el firewall configurado (solo puertos 80/443)
- Rotar secretos periódicamente
- Realizar backups regulares
- Monitorear logs de acceso

## Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.
