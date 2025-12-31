# Guía de Respaldos y Recuperación

## Sistema de Nómina - Procedimientos de Backup

### Índice
1. [Política de Retención](#política-de-retención)
2. [Backup de PostgreSQL](#backup-de-postgresql)
3. [Backup de Evidencias Fiscales](#backup-de-evidencias-fiscales)
4. [Backup de Redis](#backup-de-redis)
5. [Procedimiento de Restauración](#procedimiento-de-restauración)
6. [Automatización](#automatización)
7. [Verificación de Backups](#verificación-de-backups)

---

## Política de Retención

### Requisitos Legales (México)

| Tipo de Dato | Retención Mínima | Base Legal |
|--------------|------------------|------------|
| CFDI XML/PDF | 5 años | Art. 30 CFF |
| Auditoría fiscal | 5 años | Art. 30 CFF |
| Recibos de nómina | 5 años | Art. 30 CFF |
| Expedientes empleados | 5 años | Art. 804 LFT |
| Registros asistencia | 2 años | Art. 804 LFT |

### Frecuencia de Backups Recomendada

| Tipo | Frecuencia | Retención |
|------|------------|-----------|
| Base de datos - Completo | Diario | 30 días |
| Base de datos - Incremental | Cada 6 horas | 7 días |
| Evidencias fiscales | Diario | 5 años |
| Logs de auditoría | Semanal | 1 año |

---

## Backup de PostgreSQL

### Backup Completo (pg_dump)

```bash
#!/bin/bash
# backup-postgres.sh

# Variables
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="nomina_db"
DB_USER="nomina"
RETENTION_DAYS=30

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Ejecutar backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/nomina_$DATE.backup"

# Comprimir
gzip "$BACKUP_DIR/nomina_$DATE.backup"

# Verificar integridad
pg_restore --list "$BACKUP_DIR/nomina_$DATE.backup.gz" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Backup exitoso: nomina_$DATE.backup.gz"
else
    echo "ERROR: Backup corrupto"
    exit 1
fi

# Limpiar backups antiguos
find $BACKUP_DIR -name "*.backup.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completado: $(date)"
```

### Backup con Docker

```bash
#!/bin/bash
# backup-postgres-docker.sh

DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="nomina-db"  # o nomina-db-dev
BACKUP_DIR="/backups/postgresql"

mkdir -p $BACKUP_DIR

# Ejecutar backup dentro del contenedor
docker exec $CONTAINER pg_dump -U nomina -d nomina_db -F c > "$BACKUP_DIR/nomina_$DATE.backup"

# Comprimir
gzip "$BACKUP_DIR/nomina_$DATE.backup"

echo "Backup Docker completado: nomina_$DATE.backup.gz"
```

### Backup Incremental (WAL Archiving)

Configurar en `postgresql.conf`:

```conf
# Habilitar WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'
```

---

## Backup de Evidencias Fiscales

### Script de Backup

```bash
#!/bin/bash
# backup-fiscal-storage.sh

# Variables
SOURCE_DIR="/app/storage/fiscal"
BACKUP_DIR="/backups/fiscal"
DATE=$(date +%Y%m%d)
RETENTION_YEARS=5

mkdir -p $BACKUP_DIR

# Backup incremental con rsync
rsync -avz --backup --backup-dir="$BACKUP_DIR/incremental_$DATE" \
    $SOURCE_DIR/ $BACKUP_DIR/current/

# Crear archivo mensual (primer día del mes)
if [ $(date +%d) -eq "01" ]; then
    tar -czf "$BACKUP_DIR/fiscal_$(date +%Y%m).tar.gz" -C $BACKUP_DIR current/
fi

# Verificar integridad de archivos
echo "Verificando integridad de evidencias..."
find $BACKUP_DIR/current -name "*.xml" -o -name "*.pdf" | while read file; do
    if [ ! -s "$file" ]; then
        echo "ALERTA: Archivo vacío: $file"
    fi
done

# Limpiar backups mayores a 5 años
find $BACKUP_DIR -name "fiscal_*.tar.gz" -mtime +$((RETENTION_YEARS * 365)) -delete

echo "Backup de evidencias completado"
```

### Verificación de SHA256

```bash
#!/bin/bash
# verify-fiscal-integrity.sh

# Verificar hashes de evidencias fiscales
psql -U nomina -d nomina_db -c "
SELECT
    rd.file_name,
    rd.sha256 as db_hash,
    encode(digest(pg_read_binary_file(rd.storage_path), 'sha256'), 'hex') as file_hash,
    CASE
        WHEN rd.sha256 = encode(digest(pg_read_binary_file(rd.storage_path), 'sha256'), 'hex')
        THEN 'OK'
        ELSE 'MISMATCH'
    END as status
FROM receipt_document rd
WHERE rd.is_active = true
LIMIT 100;
"
```

---

## Backup de Redis

### Backup RDB

```bash
#!/bin/bash
# backup-redis.sh

BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Trigger BGSAVE
redis-cli BGSAVE

# Esperar a que termine
while [ $(redis-cli LASTSAVE) == $(redis-cli LASTSAVE) ]; do
    sleep 1
done

# Copiar dump.rdb
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Comprimir
gzip "$BACKUP_DIR/redis_$DATE.rdb"

echo "Backup Redis completado"
```

### Backup con Docker

```bash
#!/bin/bash
# backup-redis-docker.sh

DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="nomina-redis"  # o nomina-redis-dev
BACKUP_DIR="/backups/redis"

mkdir -p $BACKUP_DIR

# Ejecutar BGSAVE
docker exec $CONTAINER redis-cli BGSAVE

sleep 5

# Copiar dump
docker cp $CONTAINER:/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"
gzip "$BACKUP_DIR/redis_$DATE.rdb"

echo "Backup Redis Docker completado"
```

---

## Procedimiento de Restauración

### Restaurar PostgreSQL

```bash
#!/bin/bash
# restore-postgres.sh

BACKUP_FILE=$1
DB_NAME="nomina_db"
DB_USER="nomina"

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: ./restore-postgres.sh <archivo_backup>"
    exit 1
fi

# Descomprimir si es necesario
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -k $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Terminar conexiones activas
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Eliminar y recrear base de datos
psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restaurar
pg_restore -U postgres -d $DB_NAME -F c $BACKUP_FILE

echo "Restauración completada"
```

### Restaurar con Docker

```bash
#!/bin/bash
# restore-postgres-docker.sh

BACKUP_FILE=$1
CONTAINER="nomina-db"

# Copiar backup al contenedor
docker cp $BACKUP_FILE $CONTAINER:/tmp/backup.dump

# Restaurar
docker exec $CONTAINER bash -c "
    psql -U postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'nomina_db' AND pid <> pg_backend_pid();\"
    psql -U postgres -c 'DROP DATABASE IF EXISTS nomina_db;'
    psql -U postgres -c 'CREATE DATABASE nomina_db OWNER nomina;'
    pg_restore -U postgres -d nomina_db /tmp/backup.dump
"

echo "Restauración Docker completada"
```

### Restaurar Evidencias Fiscales

```bash
#!/bin/bash
# restore-fiscal-storage.sh

BACKUP_FILE=$1
TARGET_DIR="/app/storage/fiscal"

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: ./restore-fiscal-storage.sh <archivo_backup.tar.gz>"
    exit 1
fi

# Backup del actual por seguridad
mv $TARGET_DIR "${TARGET_DIR}_backup_$(date +%Y%m%d)"

# Restaurar
mkdir -p $TARGET_DIR
tar -xzf $BACKUP_FILE -C $TARGET_DIR

# Verificar
echo "Archivos restaurados: $(find $TARGET_DIR -type f | wc -l)"
```

---

## Automatización

### Crontab para Backups

```cron
# Backup PostgreSQL completo - diario a las 2:00 AM
0 2 * * * /scripts/backup-postgres.sh >> /var/log/backup-postgres.log 2>&1

# Backup PostgreSQL incremental - cada 6 horas
0 */6 * * * /scripts/backup-postgres-incremental.sh >> /var/log/backup-postgres.log 2>&1

# Backup evidencias fiscales - diario a las 3:00 AM
0 3 * * * /scripts/backup-fiscal-storage.sh >> /var/log/backup-fiscal.log 2>&1

# Backup Redis - diario a las 4:00 AM
0 4 * * * /scripts/backup-redis.sh >> /var/log/backup-redis.log 2>&1

# Verificación de integridad - semanal (domingo 5:00 AM)
0 5 * * 0 /scripts/verify-backups.sh >> /var/log/backup-verify.log 2>&1
```

### Docker Compose para Backups

```yaml
# docker-compose.backup.yml
version: '3.8'

services:
  backup:
    image: postgres:16-alpine
    volumes:
      - ./scripts:/scripts:ro
      - ./backups:/backups
      - postgres_data:/var/lib/postgresql/data:ro
      - fiscal_storage:/fiscal:ro
    environment:
      PGHOST: db
      PGUSER: nomina
      PGPASSWORD: ${DB_PASSWORD}
      PGDATABASE: nomina_db
    command: /scripts/backup-all.sh
    profiles:
      - backup
    networks:
      - nomina-network

volumes:
  postgres_data:
    external: true
  fiscal_storage:
    external: true
```

---

## Verificación de Backups

### Script de Verificación

```bash
#!/bin/bash
# verify-backups.sh

BACKUP_DIR="/backups"
REPORT_FILE="/var/log/backup-verification-$(date +%Y%m%d).log"

echo "=== Verificación de Backups $(date) ===" > $REPORT_FILE

# Verificar PostgreSQL
echo "## PostgreSQL ##" >> $REPORT_FILE
LATEST_PG=$(ls -t $BACKUP_DIR/postgresql/*.backup.gz 2>/dev/null | head -1)
if [ -n "$LATEST_PG" ]; then
    echo "Último backup: $LATEST_PG" >> $REPORT_FILE
    echo "Tamaño: $(du -h $LATEST_PG | cut -f1)" >> $REPORT_FILE
    # Intentar listar contenido
    gunzip -c $LATEST_PG | pg_restore --list > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Estado: OK" >> $REPORT_FILE
    else
        echo "Estado: ERROR - Backup corrupto" >> $REPORT_FILE
    fi
else
    echo "Estado: ERROR - No hay backups" >> $REPORT_FILE
fi

# Verificar evidencias fiscales
echo "" >> $REPORT_FILE
echo "## Evidencias Fiscales ##" >> $REPORT_FILE
LATEST_FISCAL=$(ls -t $BACKUP_DIR/fiscal/*.tar.gz 2>/dev/null | head -1)
if [ -n "$LATEST_FISCAL" ]; then
    echo "Último backup: $LATEST_FISCAL" >> $REPORT_FILE
    echo "Tamaño: $(du -h $LATEST_FISCAL | cut -f1)" >> $REPORT_FILE
    tar -tzf $LATEST_FISCAL > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Estado: OK" >> $REPORT_FILE
        echo "Archivos: $(tar -tzf $LATEST_FISCAL | wc -l)" >> $REPORT_FILE
    else
        echo "Estado: ERROR - Archivo corrupto" >> $REPORT_FILE
    fi
else
    echo "Estado: ERROR - No hay backups" >> $REPORT_FILE
fi

# Verificar Redis
echo "" >> $REPORT_FILE
echo "## Redis ##" >> $REPORT_FILE
LATEST_REDIS=$(ls -t $BACKUP_DIR/redis/*.rdb.gz 2>/dev/null | head -1)
if [ -n "$LATEST_REDIS" ]; then
    echo "Último backup: $LATEST_REDIS" >> $REPORT_FILE
    echo "Tamaño: $(du -h $LATEST_REDIS | cut -f1)" >> $REPORT_FILE
    echo "Estado: OK" >> $REPORT_FILE
else
    echo "Estado: WARN - No hay backups (puede ser opcional)" >> $REPORT_FILE
fi

# Resumen
echo "" >> $REPORT_FILE
echo "=== Resumen ===" >> $REPORT_FILE
cat $REPORT_FILE

# Enviar alerta si hay errores
if grep -q "ERROR" $REPORT_FILE; then
    echo "ALERTA: Se detectaron errores en backups"
    # Aquí se podría enviar email/notificación
fi
```

### Prueba de Restauración

```bash
#!/bin/bash
# test-restore.sh
# EJECUTAR EN AMBIENTE DE PRUEBAS

echo "=== Prueba de Restauración $(date) ==="

# Crear base de datos temporal
createdb nomina_test

# Restaurar último backup
LATEST=$(ls -t /backups/postgresql/*.backup.gz | head -1)
gunzip -c $LATEST | pg_restore -d nomina_test

# Verificar datos
TABLES=$(psql -d nomina_test -c "\dt" | wc -l)
EMPLOYEES=$(psql -d nomina_test -t -c "SELECT COUNT(*) FROM employees;")

echo "Tablas restauradas: $TABLES"
echo "Empleados: $EMPLOYEES"

# Limpiar
dropdb nomina_test

echo "Prueba de restauración completada"
```

---

## Almacenamiento Externo

### Sincronización a S3 (AWS)

```bash
#!/bin/bash
# sync-to-s3.sh

aws s3 sync /backups/ s3://nomina-backups/ \
    --exclude "*" \
    --include "*.backup.gz" \
    --include "*.tar.gz" \
    --include "*.rdb.gz"
```

### Sincronización a Azure Blob

```bash
#!/bin/bash
# sync-to-azure.sh

azcopy sync "/backups" "https://storageaccount.blob.core.windows.net/nomina-backups" \
    --include-pattern "*.backup.gz;*.tar.gz;*.rdb.gz"
```

---

## Contacto

Para emergencias de restauración:
- Administrador de Sistemas
- DBA

---

*Sistema de Nómina v1.0 - Diciembre 2024*
