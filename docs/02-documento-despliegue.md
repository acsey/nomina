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

### 1.3 Puertos Requeridos

| Puerto | Servicio |
|--------|----------|
| 80 | HTTP (redirige a HTTPS) |
| 443 | HTTPS |
| 5432 | PostgreSQL |
| 3000 | Backend API |
| 5173 | Frontend (desarrollo) |

---

## 2. Despliegue con Docker (Recomendado)

### 2.1 Estructura de Archivos Docker

```
nomina/
├── docker-compose.yml          # Producción
├── docker-compose.dev.yml      # Desarrollo
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
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones

# Frontend
cp frontend/.env.example frontend/.env
# Editar frontend/.env
```

#### Paso 3: Levantar servicios
```bash
docker compose -f docker-compose.dev.yml up --build
```

#### Paso 4: Ejecutar migraciones
```bash
docker exec nomina-backend-dev npx prisma migrate dev
```

#### Paso 5: Crear datos iniciales (seed)
```bash
docker exec nomina-backend-dev npx prisma db seed
```

### 2.3 Despliegue en Producción

#### docker-compose.yml (Producción)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: nomina-db
    environment:
      POSTGRES_DB: nomina
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nomina-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: nomina-backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/nomina
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - postgres
    networks:
      - nomina-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${API_URL}
    container_name: nomina-frontend
    networks:
      - nomina-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: nomina-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - nomina-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  nomina-network:
    driver: bridge
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
```

---

## 3. Despliegue Manual (Sin Docker)

### 3.1 Preparación del Servidor

#### Ubuntu/Debian
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2
```

### 3.2 Configuración de PostgreSQL

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear usuario y base de datos
CREATE USER nomina_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE nomina OWNER nomina_user;
GRANT ALL PRIVILEGES ON DATABASE nomina TO nomina_user;
\q
```

### 3.3 Despliegue del Backend

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

# Ejecutar migraciones
npx prisma migrate deploy

# Compilar TypeScript
npm run build

# Iniciar con PM2
pm2 start dist/main.js --name nomina-backend
pm2 save
pm2 startup
```

### 3.4 Despliegue del Frontend

```bash
cd /var/www/nomina/frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
nano .env  # Configurar VITE_API_URL

# Compilar para producción
npm run build

# Los archivos compilados están en /dist
```

### 3.5 Configuración de Nginx

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

## 4. Configuración de SSL

### 4.1 Con Let's Encrypt (Recomendado)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (cron)
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 4.2 Con Certificado Propio

```bash
# Copiar certificados
sudo cp tu-certificado.crt /etc/ssl/certs/
sudo cp tu-certificado.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/tu-certificado.key
```

---

## 5. Variables de Entorno de Producción

### 5.1 Backend (.env)

```env
# Base de datos
DATABASE_URL="postgresql://nomina_user:password_seguro@localhost:5432/nomina"

# JWT - Usar clave segura generada
JWT_SECRET="clave-secreta-muy-larga-y-aleatoria-minimo-32-caracteres"
JWT_EXPIRES_IN="7d"

# Servidor
PORT=3000
NODE_ENV=production

# PAC (Proveedor de Timbrado)
PAC_PROVIDER=finkok
PAC_USER=tu_usuario_pac
PAC_PASSWORD=tu_password_pac
PAC_MODE=production
```

### 5.2 Frontend (.env)

```env
VITE_API_URL=https://tu-dominio.com/api
```

---

## 6. Backups

### 6.1 Backup de Base de Datos

#### Script de Backup
```bash
#!/bin/bash
# /opt/scripts/backup-db.sh

BACKUP_DIR="/var/backups/nomina"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="nomina"
DB_USER="nomina_user"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Realizar backup
PGPASSWORD="tu_password" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/nomina_$DATE.sql.gz

# Eliminar backups mayores a 30 días
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completado: nomina_$DATE.sql.gz"
```

#### Programar Backup Diario
```bash
sudo chmod +x /opt/scripts/backup-db.sh
sudo crontab -e
# Agregar: 0 2 * * * /opt/scripts/backup-db.sh
```

### 6.2 Restaurar Backup

```bash
gunzip -c /var/backups/nomina/nomina_20241220_020000.sql.gz | psql -U nomina_user -d nomina
```

---

## 7. Monitoreo

### 7.1 Monitoreo con PM2

```bash
# Ver estado de procesos
pm2 status

# Ver logs en tiempo real
pm2 logs nomina-backend

# Monitoreo de recursos
pm2 monit
```

### 7.2 Health Check

El backend expone un endpoint de health check:
```bash
curl https://tu-dominio.com/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-12-20T10:00:00.000Z"
}
```

---

## 8. Actualizaciones

### 8.1 Proceso de Actualización

```bash
# 1. Crear backup antes de actualizar
/opt/scripts/backup-db.sh

# 2. Obtener últimos cambios
cd /var/www/nomina
git pull origin main

# 3. Actualizar backend
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart nomina-backend

# 4. Actualizar frontend
cd ../frontend
npm install
npm run build

# 5. Verificar funcionamiento
curl https://tu-dominio.com/api/health
```

### 8.2 Rollback

```bash
# Revertir a commit anterior
git log --oneline  # Ver commits
git checkout <commit-hash>

# Restaurar base de datos
gunzip -c /var/backups/nomina/nomina_backup_anterior.sql.gz | psql -U nomina_user -d nomina

# Reconstruir y reiniciar
cd backend && npm run build && pm2 restart nomina-backend
cd ../frontend && npm run build
```

---

## 9. Troubleshooting

### 9.1 Problemas Comunes

#### Error de conexión a base de datos
```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar conexión
psql -U nomina_user -d nomina -h localhost
```

#### Error 502 Bad Gateway
```bash
# Verificar que el backend esté corriendo
pm2 status
pm2 logs nomina-backend

# Verificar configuración de Nginx
sudo nginx -t
```

#### Migraciones fallidas
```bash
# Ver estado de migraciones
npx prisma migrate status

# Forzar reset (¡SOLO EN DESARROLLO!)
npx prisma migrate reset --force
```

### 9.2 Logs Importantes

| Log | Ubicación |
|-----|-----------|
| Backend | `pm2 logs nomina-backend` |
| Nginx Access | `/var/log/nginx/access.log` |
| Nginx Error | `/var/log/nginx/error.log` |
| PostgreSQL | `/var/log/postgresql/postgresql-15-main.log` |

---

## 10. Checklist de Despliegue

### Pre-despliegue
- [ ] Backup de base de datos existente
- [ ] Verificar requisitos de hardware
- [ ] Obtener certificados SSL
- [ ] Configurar DNS
- [ ] Preparar variables de entorno

### Despliegue
- [ ] Clonar repositorio
- [ ] Instalar dependencias
- [ ] Configurar variables de entorno
- [ ] Ejecutar migraciones
- [ ] Compilar frontend y backend
- [ ] Configurar Nginx/proxy
- [ ] Configurar SSL

### Post-despliegue
- [ ] Verificar health check
- [ ] Probar login
- [ ] Verificar funcionalidades críticas
- [ ] Configurar backups automáticos
- [ ] Configurar monitoreo
- [ ] Documentar accesos y credenciales

---

*Documento generado: Diciembre 2024*
*Versión del documento: 1.0*
