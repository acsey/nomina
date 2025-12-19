# Sistema de Nómina Empresarial

Sistema completo de nómina para empresas mexicanas, con soporte para cálculos fiscales (ISR, IMSS, INFONAVIT), timbrado CFDI y gestiones gubernamentales.

## Tecnologías

### Backend
- **Node.js** con **NestJS** (Framework)
- **TypeScript**
- **PostgreSQL** (Base de datos)
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

## Inicio Rápido con Docker

### Requisitos
- Docker 20+
- Docker Compose 2+
- Make (opcional, pero recomendado)

### Producción

```bash
# Opción 1: Usando Make
make prod

# Opción 2: Usando Docker Compose directamente
docker compose up --build -d
```

### Desarrollo (con hot-reload)

```bash
# Opción 1: Usando Make
make dev

# Opción 2: Usando Docker Compose directamente
docker compose -f docker-compose.dev.yml up --build
```

### URLs

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost | Aplicación web |
| Backend API | http://localhost:3000 | API REST |
| Swagger Docs | http://localhost:3000/api/docs | Documentación API |
| Adminer | http://localhost:8080 | UI de base de datos (solo dev) |

### Credenciales de Prueba

- **Email:** admin@empresa.com
- **Password:** admin123

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

## Instalación Manual (sin Docker)

### Requisitos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd nomina
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cd backend
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Configurar base de datos**
```bash
# Crear base de datos PostgreSQL
createdb nomina_db

# Ejecutar migraciones
npm run db:migrate --workspace=backend

# Ejecutar seed de datos iniciales
npm run db:seed --workspace=backend
```

5. **Iniciar en desarrollo**
```bash
npm run dev
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
├── docker-compose.yml      # Producción
├── docker-compose.dev.yml  # Desarrollo
├── Makefile                # Comandos útiles
└── package.json            # Monorepo config
```

## Configuración de Timbrado CFDI

Para habilitar el timbrado de CFDIs de nómina, configura las siguientes variables:

```env
PAC_URL=https://api.tu-pac.com
PAC_USER=usuario_pac
PAC_PASSWORD=password_pac
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

## Licencia

Propiedad privada. Todos los derechos reservados.
