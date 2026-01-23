# Sistema de Nómina Empresarial Mexicano

Sistema integral de nómina para empresas mexicanas con soporte completo para cálculos fiscales (ISR, IMSS, INFONAVIT, ISSSTE), timbrado CFDI 4.0, control de asistencia, gestión de vacaciones y prestaciones.

## Tecnologías

### Backend
- **Node.js 20.x** con **NestJS 10.x** (Framework)
- **TypeScript 5.x** (Tipado estático)
- **PostgreSQL 16** (Base de datos)
- **Redis 7** (Colas de procesamiento asíncrono)
- **Prisma 5.x** (ORM con migraciones)
- **JWT** + **Passport** (Autenticación)
- **BullMQ** (Procesamiento de colas)
- **Swagger/OpenAPI** (Documentación API)

### Frontend
- **React 18** con **Vite 5.x**
- **TypeScript 5.x**
- **TailwindCSS 3.x** (Estilos)
- **TanStack React Query 5.x** (Estado del servidor)
- **React Router 6.x** (Navegación)
- **React Hook Form 7.x** + **Zod** (Formularios y validación)
- **Recharts 2.x** (Gráficas y visualizaciones)
- **i18next** (Internacionalización ES-MX / EN-US)

### Infraestructura
- **Docker** y **Docker Compose**
- **Nginx** (Proxy reverso y SSL)
- **n8n** (Automatización y workflows)

## Módulos del Sistema

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Login, roles, permisos, MFA, SSO Azure AD |
| **Empleados** | CRUD, documentos, historial salarial, foto de perfil |
| **Departamentos** | Estructura organizacional y jerarquías |
| **Nómina** | Cálculo de percepciones, deducciones, ISR, IMSS |
| **Timbrado CFDI** | Generación XML 4.0, complemento nómina 1.2, PAC |
| **Asistencia** | Check-in/out, dispositivos biométricos, geolocalización |
| **Vacaciones** | Solicitudes y aprobaciones multinivel |
| **Prestaciones** | Vales, bonos, seguros, fondo de ahorro |
| **Incidencias** | Faltas, retardos, permisos |
| **Reportes** | Excel, PDF, SUA, formatos gubernamentales |
| **Portal Empleado** | Autoservicio, recibos, solicitudes |
| **WhatsApp/n8n** | Notificaciones, ChatBot IA, automatización |

## Características Enterprise

- **Snapshots de Reglas**: Reproducibilidad fiscal completa por período
- **Flujo de Autorización Dual (Maker-Checker)**: Separación de funciones críticas
- **Auditoría Tamper-Evident**: Hash encadenado de logs con trazabilidad
- **Idempotencia**: Prevención de timbrado duplicado con bloqueo exclusivo
- **Evidencias Fiscales**: Almacenamiento con verificación SHA256
- **Multi-Tenant**: Aislamiento lógico por empresa con middleware automático
- **Worker Asíncrono**: Procesamiento de alto volumen en background

## Arquitectura de Contenedores

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (proxy)                           │
│                     Puertos: 80, 443                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌─────────────────────┐          ┌─────────────────────┐
│   Backend API       │          │   Frontend          │
│   (NestJS)          │          │   (React + Nginx)   │
│   Puerto: 3000      │          │   Puerto: 80        │
└──────────┬──────────┘          └─────────────────────┘
           │
           │ BullMQ
           ▼
┌─────────────────────┐          ┌─────────────────────┐
│   Redis             │◄─────────│   Worker            │
│   (Colas)           │          │   (Procesamiento)   │
└─────────────────────┘          └─────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL 16                              │
└─────────────────────────────────────────────────────────────────┘
```

## Inicio Rápido

### Requisitos
- Docker 24+
- Docker Compose 2+
- Make (opcional)

### Desarrollo (con hot-reload)

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# Copiar variables de entorno
cp .env.example .env

# Crear directorio de storage
mkdir -p storage/fiscal

# Levantar servicios (Opción 1: Make)
make dev

# Levantar servicios (Opción 2: Docker Compose)
docker compose -f docker-compose.dev.yml up --build

# Ejecutar migraciones
docker exec nomina-backend-dev npx prisma migrate dev

# Cargar datos de prueba
docker exec nomina-backend-dev npx prisma db seed
```

### Deploy Rápido desde Cero

```bash
# Script que hace todo automáticamente
./deploy-fresh.sh
```

## URLs de Acceso

| Servicio | Desarrollo | Producción |
|----------|------------|------------|
| Frontend | http://localhost:5173 | https://tu-dominio.com |
| Backend API | http://localhost:3000 | https://tu-dominio.com/api |
| Swagger Docs | http://localhost:3000/api/docs | (Deshabilitado) |
| Adminer (DB) | http://localhost:9090 | - |
| n8n | http://localhost:5678 | - |

### Credenciales de Prueba (Desarrollo)

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | admin@sistema.com | admin123 |
| Admin Empresa | admin@bfs.com.mx | admin123 |
| RH | rh@bfs.com.mx | admin123 |
| Gerente | gerente@bfs.com.mx | admin123 |

## Ambientes de Despliegue

El sistema cuenta con tres configuraciones de Docker Compose:

| Ambiente | Archivo | Uso |
|----------|---------|-----|
| **Desarrollo** | `docker-compose.dev.yml` | Hot-reload, debugging |
| **Staging** | `docker-compose.staging.yml` | Pruebas pre-producción |
| **Producción** | `docker-compose.production.yml` | Ambiente productivo |

### Scripts de Deploy

```bash
# Desarrollo desde cero
./deploy-fresh.sh

# Staging (Ubuntu 24.04 / VM)
./deploy-staging.sh                    # Deploy normal
./deploy-staging.sh --ssl dominio.com  # Con Let's Encrypt
./deploy-staging.sh --ssl-self         # Con SSL auto-firmado
./deploy-staging.sh --fresh            # Borrar y recrear todo

# Producción
./deploy-production.sh --ssl dominio.com    # Deploy con SSL
./deploy-production.sh --update             # Solo actualizar código
./deploy-production.sh --backup             # Backup antes de deploy
```

## Variables de Entorno

Ver archivos de ejemplo para cada ambiente:
- `.env.example` - Desarrollo
- `.env.staging.example` - Staging
- `.env.production.example` - Producción

### Variables Críticas (Producción)

| Variable | Descripción | Generar con |
|----------|-------------|-------------|
| `JWT_SECRET` | Firma de tokens JWT | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | Cifrado de datos sensibles | `openssl rand -base64 48` |
| `DB_PASSWORD` | Password PostgreSQL | `openssl rand -base64 24` |
| `REDIS_PASSWORD` | Password Redis | `openssl rand -base64 24` |

## Comandos Make

```bash
make help          # Ver todos los comandos

# Desarrollo
make dev           # Iniciar desarrollo
make dev-d         # Desarrollo en background
make dev-down      # Detener desarrollo

# Producción
make prod          # Iniciar producción
make prod-down     # Detener producción

# Base de datos
make migrate       # Ejecutar migraciones
make seed          # Cargar datos iniciales
make studio        # Abrir Prisma Studio

# Logs
make logs          # Ver todos los logs
make logs-backend  # Ver logs del backend
```

## Configuración de Timbrado CFDI

```env
# PAC (Proveedor de Certificación)
PAC_MODE=sandbox                              # sandbox | production | disabled
PAC_PROVIDER=finkok                           # finkok, solucion_factible, etc.
PAC_USER=usuario_pac
PAC_PASSWORD=password_pac

# Modo de procesamiento
CFDI_STAMP_MODE=async                         # sync | async (usar async en prod)
```

## Estructura del Proyecto

```
nomina/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── common/         # Guards, decorators, utils
│   │   ├── modules/        # Módulos de negocio (29+)
│   │   └── i18n/           # Traducciones ES-MX, EN-US
│   └── prisma/             # Esquema y migraciones
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Vistas de la aplicación
│   │   └── services/       # Cliente API
│   └── nginx.conf          # Configuración Nginx
├── docs/                   # Documentación completa
├── nginx/                  # Configuraciones Nginx por ambiente
├── scripts/                # Scripts auxiliares
├── storage/                # Evidencias fiscales
├── n8n-workflows/          # Workflows de automatización
├── docker-compose.yml          # Base
├── docker-compose.dev.yml      # Desarrollo
├── docker-compose.staging.yml  # Staging
├── docker-compose.production.yml # Producción
├── deploy-fresh.sh             # Deploy desarrollo
├── deploy-staging.sh           # Deploy staging
├── deploy-production.sh        # Deploy producción
└── Makefile                    # Comandos útiles
```

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Documento Técnico](docs/01-documento-tecnico.md) | Arquitectura, stack, modelo de datos |
| [Guía de Despliegue](docs/02-documento-despliegue.md) | Requisitos, procedimientos, checklist |
| [Manual Usuario Admin](docs/06-manual-usuario-admin.md) | Guía para administradores |
| [Manual Usuario RH](docs/07-manual-usuario-rh.md) | Guía operativa para RH |
| [Manual Portal Empleado](docs/08-manual-usuario-empleado.md) | Guía de autoservicio |
| [Configuración Sistema](docs/09-MANUAL-CONFIGURACION-SISTEMA.md) | Configuración detallada |
| [Guía Ubuntu 24.04](docs/11-GUIA-DESPLIEGUE-UBUNTU-24.md) | Deploy en Ubuntu/VM |
| [Dispositivos Biométricos](docs/BIOMETRIC_DEVICES.md) | Integración ZKTECO, ANVIZ |
| [WhatsApp + n8n](docs/WHATSAPP_N8N_SETUP.md) | ChatBot IA y automatización |

## Integraciones

- **SAT**: CFDI 4.0, Complemento Nómina 1.2, Catálogos actualizados
- **IMSS**: Cálculo cuotas, SUA, IDSE
- **INFONAVIT**: Descuentos automáticos por crédito
- **ISSSTE**: Soporte para empleados del gobierno
- **Biométricos**: ZKTECO, ANVIZ, Suprema (HTTP/TCP)
- **WhatsApp**: Twilio + n8n para notificaciones y ChatBot
- **IA**: Claude, GPT-4, Gemini para ChatBot

## Cumplimiento Normativo

- CFDI 4.0 + Complemento Nómina 1.2
- Ley Federal del Trabajo
- Ley del Seguro Social
- Ley del INFONAVIT
- Ley del ISR (Tablas actualizadas)
- Ley Federal de Protección de Datos Personales

## Soporte

- **Issues**: https://github.com/tu-usuario/nomina/issues
- **Documentación**: Carpeta `docs/`

## Licencia

Propiedad privada. Todos los derechos reservados.

---
*Última actualización: Enero 2025*
*Versión: 2.0.0*
