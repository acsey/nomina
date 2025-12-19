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

## Estructura del Proyecto

```
nomina/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── common/         # Utilidades compartidas
│   │   ├── config/         # Configuración
│   │   └── modules/        # Módulos de negocio
│   │       ├── auth/
│   │       ├── employees/
│   │       ├── departments/
│   │       ├── payroll/
│   │       ├── attendance/
│   │       ├── vacations/
│   │       ├── benefits/
│   │       ├── cfdi/
│   │       ├── government/
│   │       └── reports/
│   └── prisma/             # Esquema y migraciones
│
├── frontend/               # Aplicación React
│   └── src/
│       ├── components/     # Componentes reutilizables
│       ├── contexts/       # Contextos de React
│       ├── hooks/          # Custom hooks
│       ├── pages/          # Páginas de la aplicación
│       ├── services/       # Servicios API
│       └── types/          # Tipos TypeScript
│
└── package.json            # Monorepo config
```

## Instalación

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
# Desde la raíz del proyecto
npm run dev
```

Esto iniciará:
- Backend en `http://localhost:3000`
- Frontend en `http://localhost:5173`
- API Docs en `http://localhost:3000/api/docs`

## Credenciales de Prueba

- **Email:** admin@empresa.com
- **Password:** admin123

## Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia backend y frontend
npm run dev:backend      # Solo backend
npm run dev:frontend     # Solo frontend

# Base de datos
npm run db:migrate       # Ejecutar migraciones
npm run db:generate      # Generar cliente Prisma
npm run db:seed          # Ejecutar seed
npm run db:studio        # Abrir Prisma Studio

# Build
npm run build            # Build de producción
npm run build:backend    # Build solo backend
npm run build:frontend   # Build solo frontend

# Lint y tests
npm run lint             # Ejecutar linter
npm run test             # Ejecutar tests
```

## Configuración de Timbrado CFDI

Para habilitar el timbrado de CFDIs de nómina, configura las siguientes variables en `.env`:

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
