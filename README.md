# Sistema de Nómina Empresarial

Sistema completo de nómina para empresas mexicanas, con soporte para cálculos fiscales (ISR, IMSS, INFONAVIT), timbrado CFDI y gestiones gubernamentales.

## Tecnologías

### Backend
- **Node.js** con **NestJS** (Framework)
- **TypeScript**
- **PostgreSQL** (Base de datos)
- **Redis** (Colas de procesamiento asíncrono)
- **Prisma** (ORM)
- **JWT** (Autenticación)
- **Swagger** (Documentación API)

### Frontend
- **React 18** con **Vite**
- **TypeScript**
- **TailwindCSS** (Estilos)
- **React Query** (Manejo de estado del servidor)
- **React Router** (Navegación)
- **React Hook Form** (Formularios)

### Infraestructura
- **Docker** y **Docker Compose**
- **Nginx** (Servidor web para frontend)
- **PostgreSQL 16** (Base de datos)
- **Redis 7** (Colas y caché)

## Módulos

1. **Autenticación y Usuarios** - Login, roles y permisos
2. **Gestión de Empleados** - Alta, baja, modificación de empleados
3. **Departamentos** - Estructura organizacional
4. **Cálculo de Nómina** - Percepciones, deducciones, ISR, IMSS
5. **Control de Asistencia** - Check-in/out, retardos, faltas
6. **Vacaciones y Permisos** - Solicitudes y aprobaciones
7. **Prestaciones** - Vales, bonos, seguros
8. **Timbrado CFDI** - Generación de recibos fiscales
9. **Gestiones Gubernamentales** - IMSS, ISSSTE, INFONAVIT
10. **Reportes** - Excel, PDF, reportes fiscales

## Características Enterprise

- **Snapshots de Reglas**: Captura del contexto de cálculo para reproducibilidad fiscal
- **Flujo de Autorización**: Workflow de aprobación para timbrado masivo
- **Idempotencia**: Prevención de timbrado duplicado con bloqueo exclusivo
- **Evidencias Fiscales**: Almacenamiento con verificación SHA256
- **Worker Asíncrono**: Procesamiento de alto volumen en background

## Inicio Rápido con Docker

### Requisitos
- Docker 24+
- Docker Compose 2+
- Make (opcional, pero recomendado)

### Configuración Inicial

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# Copiar variables de entorno
cp .env.example .env

# Crear directorio de storage
mkdir -p storage/fiscal
```

### Desarrollo (con hot-reload)

```bash
# Opción 1: Usando Make
make dev

# Opción 2: Usando Docker Compose directamente
docker compose -f docker-compose.dev.yml up --build

# Ejecutar migraciones
docker exec nomina-backend-dev npx prisma migrate dev

# Cargar datos de prueba
docker exec nomina-backend-dev npx prisma db seed
```

### Producción

```bash
# Generar claves seguras (editar .env con los valores)
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 32  # Para ENCRYPTION_KEY

# Configurar permisos de storage
chown -R 1000:1000 storage

# Levantar servicios
docker compose up -d --build

# Ejecutar migraciones (IMPORTANTE: usar deploy en producción)
docker exec nomina-backend npx prisma migrate deploy

# Con worker enterprise (alto volumen)
docker compose --profile enterprise up -d --build
```

### URLs

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost | Aplicación web |
| Frontend (dev) | http://localhost:5173 | Desarrollo con hot-reload |
| Backend API | http://localhost:3000 | API REST |
| Swagger Docs | http://localhost:3000/api/docs | Documentación API |
| Adminer | http://localhost:9090 | UI de base de datos (solo dev) |

### Credenciales de Prueba

- **Email:** admin@empresa.com
- **Password:** admin123

## Variables de Entorno

Ver `.env.example` para la lista completa. Variables críticas:

| Variable | Descripción | Producción |
|----------|-------------|------------|
| JWT_SECRET | Firma de tokens JWT | Generar con `openssl rand -base64 32` |
| ENCRYPTION_KEY | Cifrado de datos sensibles | Generar con `openssl rand -base64 32` |
| REDIS_PASSWORD | Password de Redis | Configurar password seguro |
| PAC_URL | URL del PAC de timbrado | URL de producción del PAC |
| FISCAL_STORAGE_PATH | Ruta de evidencias fiscales | `/app/storage/fiscal` |

## Comandos Make

```bash
make help          # Ver todos los comandos disponibles

# Desarrollo
make dev           # Iniciar en modo desarrollo
make dev-d         # Iniciar en modo desarrollo (background)
make dev-down      # Detener modo desarrollo
make dev-logs      # Ver logs de desarrollo

# Producción
make prod          # Iniciar en modo producción
make prod-down     # Detener modo producción

# Logs
make logs          # Ver todos los logs
make logs-backend  # Ver logs del backend
make logs-frontend # Ver logs del frontend

# Base de datos
make migrate       # Ejecutar migraciones
make seed          # Ejecutar seed de datos
make studio        # Abrir Prisma Studio
make shell-db      # Abrir shell de PostgreSQL

# Limpieza
make clean         # Limpiar contenedores y volúmenes
make clean-all     # Limpiar todo incluyendo imágenes
```

## Estructura del Proyecto

```
nomina/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── common/         # Utilidades compartidas
│   │   └── modules/        # Módulos de negocio
│   ├── prisma/             # Esquema y migraciones
│   ├── Dockerfile          # Imagen de producción
│   └── Dockerfile.dev      # Imagen de desarrollo
│
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── contexts/       # Contextos de React
│   │   ├── pages/          # Páginas de la aplicación
│   │   └── services/       # Servicios API
│   ├── Dockerfile          # Imagen de producción
│   ├── Dockerfile.dev      # Imagen de desarrollo
│   └── nginx.conf          # Configuración Nginx
│
├── storage/                # Evidencias fiscales (volumen)
│   └── fiscal/
│
├── docs/                   # Documentación
│   ├── 01-documento-arquitectura.md
│   └── 02-documento-despliegue.md
│
├── docker-compose.yml      # Producción
├── docker-compose.dev.yml  # Desarrollo
├── .env.example            # Variables de entorno
├── Makefile                # Comandos útiles
└── package.json            # Monorepo config
```

## Configuración de Timbrado CFDI

Para habilitar el timbrado de CFDIs de nómina, configura las siguientes variables:

```env
# PAC (Proveedor Autorizado de Certificación)
PAC_URL=https://facturacion.finkok.com
PAC_USER=usuario_pac
PAC_PASSWORD=password_pac

# Certificados de Sello Digital
CER_PATH=./certs/certificado.cer
KEY_PATH=./certs/llave.key
KEY_PASSWORD=password_certificado
```

## Características Fiscales

### Cálculo de ISR
- Tablas de ISR actualizadas 2024
- Subsidio al empleo
- Retención de impuestos

### IMSS
- Cálculo de cuotas obrero-patronales
- Generación de archivo SUA
- Movimientos IDSE (altas, bajas, modificaciones)

### INFONAVIT
- Descuentos por créditos
- Tipos de descuento (%, fijo, VSM)

### CFDI de Nómina
- Generación de XML según CFDI 4.0
- Complemento de Nómina 1.2
- Integración con PAC para timbrado
- Almacenamiento de evidencias con integridad SHA256

## Documentación

- [Documento de Arquitectura](docs/01-documento-arquitectura.md)
- [Documento de Despliegue](docs/02-documento-despliegue.md)
- [API Docs (Swagger)](http://localhost:3000/api/docs) - Disponible cuando el backend está corriendo

## Licencia

Propiedad privada. Todos los derechos reservados.
