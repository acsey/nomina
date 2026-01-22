# Manual Completo de Configuración del Sistema de Nómina

## Índice General

1. [Introducción y Visión General](#1-introducción-y-visión-general)
2. [Requisitos del Sistema](#2-requisitos-del-sistema)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Variables de Entorno - Guía Completa](#4-variables-de-entorno---guía-completa)
5. [Configuración de Base de Datos](#5-configuración-de-base-de-datos)
6. [Configuración de Redis y Colas](#6-configuración-de-redis-y-colas)
7. [Configuración de Autenticación](#7-configuración-de-autenticación)
8. [Configuración de Seguridad](#8-configuración-de-seguridad)
9. [Configuración Fiscal (PAC/CFDI)](#9-configuración-fiscal-paccfdi)
10. [Configuración de Integraciones](#10-configuración-de-integraciones)
11. [Configuración del Frontend](#11-configuración-del-frontend)
12. [Despliegue por Entorno](#12-despliegue-por-entorno)
13. [Configuración de Monitoreo](#13-configuración-de-monitoreo)
14. [Solución de Problemas](#14-solución-de-problemas)
15. [Checklists de Configuración](#15-checklists-de-configuración)

---

## 1. Introducción y Visión General

### 1.1 ¿Qué es el Sistema de Nómina?

El **Sistema de Nómina Empresarial** es una solución integral para la gestión de nómina en empresas mexicanas. Incluye:

- **Gestión de Empleados**: Alta, baja, modificaciones, documentos
- **Cálculo de Nómina**: Percepciones, deducciones, impuestos (ISR, IMSS, INFONAVIT)
- **Timbrado Fiscal**: Generación y timbrado de CFDI 4.0 con complemento de nómina 1.2
- **Control de Asistencia**: Integración con dispositivos biométricos y WhatsApp
- **Portal del Empleado**: Autoservicio, vacaciones, beneficios
- **Reportes**: Exportación a Excel, PDF, reportes fiscales
- **Integraciones**: WhatsApp, n8n (automatización), Anthropic (IA)

### 1.2 Tecnologías Utilizadas

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Backend** | NestJS | 10.3.0 |
| **Frontend** | React + Vite | 18.2 / 5.0 |
| **Base de Datos** | PostgreSQL | 16 |
| **Cache/Colas** | Redis + BullMQ | 7 / 5.1 |
| **ORM** | Prisma | 5.8.0 |
| **Contenedores** | Docker + Compose | 24+ / 2+ |
| **Proxy Reverso** | Nginx | Latest |

### 1.3 Módulos del Sistema

El sistema cuenta con **26 módulos funcionales**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÓDULOS PRINCIPALES                          │
├─────────────────────────────────────────────────────────────────┤
│ Auth          │ Autenticación JWT, OAuth, MFA                   │
│ Users         │ Gestión de usuarios del sistema                 │
│ Employees     │ Gestión de empleados                            │
│ Departments   │ Estructura organizacional                       │
│ Payroll       │ Cálculo y gestión de nómina                     │
│ CFDI          │ Generación y timbrado fiscal                    │
│ Attendance    │ Control de asistencia                           │
│ Vacations     │ Gestión de vacaciones                           │
│ Benefits      │ Prestaciones y beneficios                       │
│ Incidents     │ Incidencias laborales                           │
│ Reports       │ Generación de reportes                          │
│ Government    │ Integraciones IMSS/ISSSTE/INFONAVIT             │
├─────────────────────────────────────────────────────────────────┤
│                    MÓDULOS DE SOPORTE                           │
├─────────────────────────────────────────────────────────────────┤
│ Catalogs      │ Catálogos del SAT y empresariales               │
│ BulkUpload    │ Carga masiva de datos                           │
│ Devices       │ Dispositivos biométricos                        │
│ SystemConfig  │ Configuración del sistema                       │
│ Hierarchy     │ Jerarquía organizacional                        │
│ Uploads       │ Gestión de archivos                             │
│ PAC           │ Configuración de proveedores de timbrado        │
│ Notifications │ Sistema de notificaciones                       │
│ Email         │ Envío de correos electrónicos                   │
│ Portal        │ Portal del empleado                             │
│ SystemModules │ Habilitación de módulos por empresa             │
│ WhatsApp      │ Integración con WhatsApp                        │
│ N8n           │ Automatización con n8n                          │
│ AccountingCfg │ Configuración contable                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Requisitos del Sistema

### 2.1 Requisitos de Hardware

#### Desarrollo Local

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Almacenamiento | 10 GB | 20 GB SSD |
| Red | 10 Mbps | 100 Mbps |

#### Staging

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Almacenamiento | 40 GB SSD | 80 GB SSD |
| Red | 100 Mbps | 1 Gbps |

#### Producción

| Componente | Mínimo | Recomendado | Enterprise |
|------------|--------|-------------|------------|
| CPU | 4 cores | 8 cores | 16+ cores |
| RAM | 8 GB | 16 GB | 32+ GB |
| Almacenamiento | 100 GB SSD | 250 GB SSD | 500+ GB SSD |
| Red | 100 Mbps | 1 Gbps | 10 Gbps |

### 2.2 Requisitos de Software

#### Con Docker (Recomendado)

| Software | Versión Mínima | Comando de Verificación |
|----------|----------------|-------------------------|
| Docker | 24.0 | `docker --version` |
| Docker Compose | 2.0 | `docker compose version` |
| Git | 2.30 | `git --version` |

#### Sin Docker (Manual)

| Software | Versión Mínima | Comando de Verificación |
|----------|----------------|-------------------------|
| Node.js | 18.0.0 | `node --version` |
| npm | 9.0.0 | `npm --version` |
| PostgreSQL | 15.0 | `psql --version` |
| Redis | 7.0 | `redis-server --version` |
| Nginx | 1.20 | `nginx -v` |

### 2.3 Puertos Requeridos

| Puerto | Servicio | Ambiente | Descripción |
|--------|----------|----------|-------------|
| 80 | HTTP | Producción | Redirección a HTTPS |
| 443 | HTTPS | Producción | Tráfico web seguro |
| 3000 | Backend API | Todos | API REST NestJS |
| 5173 | Frontend Dev | Desarrollo | Servidor Vite |
| 5432 | PostgreSQL | Todos | Base de datos |
| 6379 | Redis | Todos | Cache y colas |
| 5555 | Prisma Studio | Desarrollo | UI de base de datos |
| 5678 | n8n | Todos | Automatización |
| 9090 | Adminer | Desarrollo | UI PostgreSQL |

### 2.4 Verificación de Requisitos

```bash
#!/bin/bash
# Script: verify-requirements.sh

echo "=== Verificación de Requisitos del Sistema ==="

# Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker: $(docker --version)"
else
    echo "❌ Docker no instalado"
fi

# Docker Compose
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "✅ Docker Compose: $(docker compose version --short)"
else
    echo "❌ Docker Compose no instalado"
fi

# Git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version)"
else
    echo "❌ Git no instalado"
fi

# Node.js (opcional si usa Docker)
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "⚠️ Node.js no instalado (opcional con Docker)"
fi

# Espacio en disco
DISK_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo "📁 Espacio disponible: $DISK_SPACE"

# Memoria RAM
if command -v free &> /dev/null; then
    TOTAL_RAM=$(free -h | awk '/^Mem:/ {print $2}')
    echo "🧠 RAM total: $TOTAL_RAM"
fi

echo "=== Verificación completada ==="
```

---

## 3. Arquitectura del Sistema

### 3.1 Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NGINX (Proxy Reverso)                            │
│                    SSL/TLS Termination, Load Balancing                   │
│                         Puerto: 80/443                                   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────────────────┐
│      FRONTEND (React)      │   │          BACKEND (NestJS)              │
│    Vite + TypeScript       │   │       API REST + WebSocket             │
│    Puerto: 5173 (dev)      │   │         Puerto: 3000                   │
│                            │   │                                        │
│  ┌──────────────────────┐  │   │  ┌────────────────────────────────┐   │
│  │ React Query          │  │   │  │ Módulos de Negocio             │   │
│  │ React Router         │  │   │  │ (Auth, Payroll, CFDI, etc.)    │   │
│  │ Context API          │  │   │  └────────────────────────────────┘   │
│  │ i18n                 │  │   │                                        │
│  │ Tailwind CSS         │  │   │  ┌────────────────────────────────┐   │
│  └──────────────────────┘  │   │  │ Servicios Comunes              │   │
│                            │   │  │ (Prisma, Queue, Security)      │   │
└───────────────────────────┘   │  └────────────────────────────────┘   │
                                 └──────────────────┬────────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────┐
                    │                               │                   │
                    ▼                               ▼                   ▼
┌───────────────────────────┐   ┌───────────────────────┐   ┌─────────────────┐
│    PostgreSQL 16          │   │      Redis 7          │   │   Filesystem    │
│    Base de Datos          │   │   Cache + Queues      │   │   Storage       │
│    Puerto: 5432           │   │   Puerto: 6379        │   │   /storage/     │
│                           │   │                       │   │   fiscal/       │
│  ┌─────────────────────┐  │   │  ┌─────────────────┐  │   │                 │
│  │ 80+ Tablas          │  │   │  │ BullMQ Queues   │  │   │  XML timbrados  │
│  │ Multi-tenant        │  │   │  │ Session Cache   │  │   │  PDFs recibos   │
│  │ Cifrado de datos    │  │   │  │ Rate Limiting   │  │   │  Acuses         │
│  └─────────────────────┘  │   │  └─────────────────┘  │   │                 │
└───────────────────────────┘   └───────────────────────┘   └─────────────────┘

                    ┌───────────────────────────────────────────────────────┐
                    │                 INTEGRACIONES EXTERNAS                 │
                    ├───────────────────────────────────────────────────────┤
                    │  PAC (FINKOK/SW)  │  Timbrado CFDI con SAT            │
                    │  Twilio WhatsApp  │  Mensajería y asistencia          │
                    │  n8n              │  Automatización de procesos       │
                    │  Anthropic API    │  ChatBot IA                       │
                    │  Microsoft Azure  │  OAuth / SSO                      │
                    │  SMTP Server      │  Envío de correos                 │
                    └───────────────────────────────────────────────────────┘
```

### 3.2 Flujo de Datos

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE PROCESAMIENTO DE NÓMINA                       │
└──────────────────────────────────────────────────────────────────────────┘

1. CREACIÓN DEL PERÍODO
   Usuario RH ─► API /payroll/periods ─► Validación ─► DB (PayrollPeriod)

2. CÁLCULO DE NÓMINA
   Usuario RH ─► API /payroll/calculate
        │
        ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  PayrollCalculationService                                          │
   │  ├─► Obtener empleados activos                                      │
   │  ├─► Calcular días trabajados (asistencia)                          │
   │  ├─► Obtener incidencias del período                                │
   │  ├─► Calcular percepciones (salario, extras, aguinaldo, etc.)       │
   │  ├─► Calcular deducciones (ISR, IMSS, INFONAVIT, etc.)              │
   │  ├─► Aplicar fórmulas personalizadas                                │
   │  └─► Guardar PayrollDetail por empleado                             │
   └─────────────────────────────────────────────────────────────────────┘

3. APROBACIÓN (DUAL CONTROL)
   Usuario Autorizador ─► API /payroll/approve
        │
        ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  DualControlService                                                  │
   │  ├─► Validar que usuario es diferente al creador                    │
   │  ├─► Verificar permisos de aprobación                               │
   │  ├─► Registrar aprobación en AuditLog                               │
   │  └─► Cambiar estado del período a APPROVED                          │
   └─────────────────────────────────────────────────────────────────────┘

4. GENERACIÓN DE CFDI
   Sistema/Usuario ─► API /cfdi/generate
        │
        ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  CfdiGeneratorService                                                │
   │  ├─► Obtener datos del recibo (PayrollDetail)                       │
   │  ├─► Construir XML CFDI 4.0 + Complemento Nómina 1.2                │
   │  ├─► Calcular cadena original                                       │
   │  ├─► Firmar con certificado CSD de la empresa                       │
   │  └─► Guardar XML pre-timbrado                                       │
   └─────────────────────────────────────────────────────────────────────┘

5. TIMBRADO CON PAC
   Sistema ─► Queue (cfdi-stamping) ─► Worker
        │
        ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  CfdiStampingProcessor                                               │
   │  ├─► Obtener XML pre-timbrado                                       │
   │  ├─► Enviar al PAC (FINKOK/SW)                                      │
   │  ├─► Recibir respuesta (UUID, Timbre Fiscal)                        │
   │  ├─► Guardar XML timbrado y PDF                                     │
   │  ├─► Actualizar estado del CFDI                                     │
   │  └─► Notificar al empleado (email/WhatsApp)                         │
   └─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Estructura de Directorios

```
nomina/
├── backend/                          # API NestJS
│   ├── src/
│   │   ├── common/                   # Módulos compartidos
│   │   │   ├── decorators/           # Decoradores personalizados
│   │   │   ├── filters/              # Filtros de excepciones
│   │   │   ├── formulas/             # Motor de fórmulas
│   │   │   ├── guards/               # Guards de autenticación
│   │   │   ├── health/               # Health checks
│   │   │   ├── prisma/               # Servicio Prisma
│   │   │   ├── queues/               # Sistema de colas BullMQ
│   │   │   │   └── processors/       # Procesadores de jobs
│   │   │   ├── security/             # Cifrado y seguridad
│   │   │   ├── tenant/               # Multi-tenancy
│   │   │   └── utils/                # Utilidades
│   │   ├── modules/                  # Módulos de negocio
│   │   │   ├── auth/                 # Autenticación
│   │   │   ├── payroll/              # Nómina
│   │   │   ├── cfdi/                 # CFDI/Timbrado
│   │   │   ├── employees/            # Empleados
│   │   │   ├── whatsapp/             # WhatsApp
│   │   │   ├── n8n/                  # n8n
│   │   │   └── ...                   # Otros módulos
│   │   ├── main.ts                   # Punto de entrada API
│   │   └── worker.ts                 # Punto de entrada Worker
│   ├── prisma/
│   │   ├── schema.prisma             # Esquema de BD
│   │   ├── migrations/               # Migraciones
│   │   └── seed.ts                   # Datos iniciales
│   ├── Dockerfile                    # Imagen producción
│   ├── Dockerfile.dev                # Imagen desarrollo
│   └── package.json
│
├── frontend/                         # React + Vite
│   ├── src/
│   │   ├── components/               # Componentes UI
│   │   ├── contexts/                 # React Context
│   │   ├── hooks/                    # Custom hooks
│   │   ├── i18n/                     # Internacionalización
│   │   │   └── locales/              # Traducciones
│   │   ├── lib/                      # Librerías
│   │   ├── pages/                    # Páginas/Vistas
│   │   ├── services/                 # Clientes API
│   │   ├── types/                    # TypeScript types
│   │   ├── utils/                    # Utilidades
│   │   └── App.tsx                   # Componente raíz
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── nginx.conf                    # Config Nginx
│   └── vite.config.ts
│
├── nginx/                            # Configuración Nginx
│   ├── production.conf
│   ├── staging.conf
│   └── ssl/                          # Certificados SSL
│
├── n8n-workflows/                    # Workflows n8n
│   └── chatbot-rrhh.json
│
├── scripts/                          # Scripts de utilidad
│   ├── init-n8n.sh
│   └── verify-staging.sh
│
├── docs/                             # Documentación
│
├── storage/                          # Almacenamiento persistente
│   └── fiscal/                       # Documentos fiscales
│
├── docker-compose.yml                # Producción
├── docker-compose.dev.yml            # Desarrollo
├── docker-compose.production.yml     # Producción con SSL
├── docker-compose.staging.yml        # Staging
├── docker-compose.n8n.yml            # n8n standalone
│
├── .env.example                      # Plantilla variables
├── .env.production.example           # Plantilla producción
├── .env.staging.example              # Plantilla staging
│
├── Makefile                          # Comandos make
├── deploy-fresh.sh                   # Deploy limpio
├── deploy-staging.sh                 # Deploy staging
└── deploy-production.sh              # Deploy producción
```

---

## 4. Variables de Entorno - Guía Completa

### 4.1 Archivo .env Maestro

A continuación se documenta **CADA** variable de entorno disponible en el sistema:

```bash
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE BASE DE DATOS                          ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# URL de conexión completa a PostgreSQL
# Formato: postgresql://USUARIO:PASSWORD@HOST:PUERTO/BASE_DE_DATOS?schema=ESQUEMA
# IMPORTANTE: En producción, usar credenciales únicas y seguras
DATABASE_URL=postgresql://nomina:nomina123@db:5432/nomina_db?schema=public

# Credenciales individuales (usadas por Docker Compose)
DB_USER=nomina                    # Usuario de PostgreSQL
DB_PASSWORD=nomina123             # Contraseña (CAMBIAR EN PRODUCCIÓN)
DB_NAME=nomina_db                 # Nombre de la base de datos

# Modo de aislamiento de base de datos para multi-tenancy
# Opciones: SHARED_DATABASE (una BD, filtrado por companyId)
#           DATABASE_PER_TENANT (una BD por empresa - no implementado)
DATABASE_ISOLATION_MODE=SHARED_DATABASE

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE REDIS                                   ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Host de Redis
# En Docker: redis (nombre del servicio)
# Sin Docker: localhost o IP del servidor Redis
REDIS_HOST=redis

# Puerto de Redis (por defecto 6379)
REDIS_PORT=6379

# Contraseña de Redis (VACÍO en desarrollo, OBLIGATORIO en producción)
REDIS_PASSWORD=

# Número de base de datos Redis (0-15)
REDIS_DB=0

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE AUTENTICACIÓN                           ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Secreto para firmar tokens JWT
# CRÍTICO: Generar con: openssl rand -base64 48
# Mínimo 32 caracteres, idealmente 48+
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Tiempo de expiración de tokens JWT
# Formatos: 15m, 1h, 24h, 7d, 30d
# Recomendado: 8h para producción, 24h para desarrollo
JWT_EXPIRES_IN=24h

# Proveedor de autenticación principal
# Opciones: local, microsoft, combined
AUTH_PROVIDER=local

# Habilitar autenticación Multi-Factor (MFA/2FA)
# true: Permite configurar TOTP por usuario
# false: Solo usuario/contraseña
MFA_ENABLED=false

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    MICROSOFT AZURE AD (OAuth/SSO)                           ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# ID de la aplicación registrada en Azure Portal
# Obtener de: Azure Portal > App Registrations > Application (client) ID
AZURE_AD_CLIENT_ID=

# ID del tenant de Azure AD
# Obtener de: Azure Portal > Azure Active Directory > Tenant ID
AZURE_AD_TENANT_ID=

# Secreto del cliente de la aplicación
# Obtener de: Azure Portal > App Registrations > Certificates & secrets
AZURE_AD_CLIENT_SECRET=

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE SEGURIDAD                               ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Clave maestra para cifrado de datos sensibles (RFC, CURP, cuentas bancarias)
# CRÍTICO: Generar con: openssl rand -base64 32
# Mínimo 32 caracteres
# ADVERTENCIA: Si se pierde, los datos cifrados serán irrecuperables
ENCRYPTION_KEY=your-encryption-key-change-in-production-min-32-chars

# Configuración de rate limiting (protección contra abuso)
RATE_LIMIT_SHORT=100              # Peticiones por minuto por IP
RATE_LIMIT_MEDIUM=1000            # Peticiones por hora por IP
RATE_LIMIT_LONG=10000             # Peticiones por día por IP

# Modo estricto de aislamiento de tenant
# true: Bloquea acceso cross-tenant (lanza excepción)
# false: Solo advierte en logs
TENANT_ISOLATION_STRICT=false

# Debug de aislamiento de tenant (solo desarrollo)
# true: Registra todas las consultas relacionadas con tenant
TENANT_ISOLATION_DEBUG=false

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE LA APLICACIÓN                           ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Entorno de ejecución
# Opciones: development, staging, production
NODE_ENV=development

# Puerto del servidor backend
PORT=3000

# URL del frontend (para CORS)
# Múltiples URLs separadas por coma
# Ejemplo: http://localhost:5173,https://nomina.empresa.com
FRONTEND_URL=http://localhost:5173

# Habilitar documentación Swagger
# true: Disponible en /api/docs
# false: Deshabilitado (recomendado en producción)
ENABLE_SWAGGER=true

# Zona horaria del servidor
GENERIC_TIMEZONE=America/Mexico_City

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE COLAS (BullMQ)                          ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Modo de operación de colas
# api: Solo encola trabajos (requiere workers separados)
# worker: Solo procesa trabajos (sin API HTTP)
# both: API + Worker en mismo proceso (solo desarrollo)
# sync: Procesamiento síncrono sin Redis (desarrollo local)
QUEUE_MODE=both

# Número de trabajos concurrentes por worker
# Recomendado: 3-5 para desarrollo, 5-10 para producción
WORKER_CONCURRENCY=3

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN FISCAL (PAC/CFDI)                          ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Modo del PAC
# sandbox: Ambiente de pruebas (no genera CFDIs válidos)
# production: Ambiente productivo (CFDIs válidos con SAT)
# disabled: Timbrado deshabilitado
PAC_MODE=sandbox

# Proveedor de timbrado
# Opciones: finkok, sw
PAC_PROVIDER=finkok

# URL del servicio PAC
# FINKOK Sandbox: https://demo-facturacion.finkok.com
# FINKOK Producción: https://facturacion.finkok.com
PAC_URL=https://demo-facturacion.finkok.com

# Credenciales del PAC (generalmente el RFC de la empresa)
PAC_USER=
PAC_PASSWORD=

# Rutas a certificados CSD del SAT
# Ruta relativa desde el directorio backend o ruta absoluta
CER_PATH=./certs/certificado.cer
KEY_PATH=./certs/llave.key

# Contraseña del archivo .key del certificado CSD
KEY_PASSWORD=

# Ruta de almacenamiento de documentos fiscales
# Docker: /app/storage/fiscal
# Sin Docker: ./storage/fiscal o ruta absoluta
FISCAL_STORAGE_PATH=/app/storage/fiscal

# Modo de timbrado de CFDI
# sync: Timbrado síncrono (bloquea hasta completar)
# async: Timbrado asíncrono (mediante cola)
CFDI_STAMP_MODE=sync

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE EMAIL (SMTP)                            ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Servidor SMTP
SMTP_HOST=

# Puerto SMTP
# 25: Sin cifrado (no recomendado)
# 465: SSL/TLS implícito
# 587: STARTTLS (recomendado)
SMTP_PORT=587

# Credenciales SMTP
SMTP_USER=
SMTP_PASSWORD=

# Dirección de correo remitente
SMTP_FROM_EMAIL=noreply@empresa.com

# Nombre mostrado del remitente
SMTP_FROM_NAME=Sistema de Nomina

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE WHATSAPP (Twilio)                       ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Account SID de Twilio
# Obtener de: https://console.twilio.com/
TWILIO_ACCOUNT_SID=

# Auth Token de Twilio
TWILIO_AUTH_TOKEN=

# Número de WhatsApp Business de Twilio
# Formato: whatsapp:+5215551234567
TWILIO_WHATSAPP_NUMBER=

# Token de verificación para webhook de WhatsApp
# Valor arbitrario que debe coincidir con la configuración en Twilio
WHATSAPP_VERIFY_TOKEN=nomina_verify_token

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE N8N                                     ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# URL base del servicio n8n
# Docker: http://n8n:5678
# Externo: https://n8n.empresa.com
N8N_BASE_URL=http://n8n:5678

# URL base para webhooks de n8n
N8N_WEBHOOK_BASE_URL=http://n8n:5678/webhook

# API Key de n8n (si está habilitada)
N8N_API_KEY=

# Credenciales de acceso a n8n
N8N_USER=admin
N8N_PASSWORD=admin123

# Host y puerto de n8n
N8N_HOST=localhost
N8N_PORT=5678

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DE IA (Anthropic)                          ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# API Key de Anthropic para el ChatBot IA
# Obtener de: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURACIÓN DEL FRONTEND                               ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# URL de la API para el frontend
# Desarrollo: /api (proxy de Vite)
# Producción: https://api.empresa.com/api
VITE_API_URL=/api
```

### 4.2 Generación de Claves Seguras

```bash
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║              COMANDOS PARA GENERAR CLAVES SEGURAS                           ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# JWT_SECRET (recomendado 48 caracteres base64)
openssl rand -base64 48
# Ejemplo resultado: K8j2mP9xR4qL7nF1hT6wY3sA5vB0cD2eG8iH4jK6mN1oP3qR5tU7wX9yZ0aB2cD4eF6g

# ENCRYPTION_KEY (mínimo 32 caracteres base64)
openssl rand -base64 32
# Ejemplo resultado: aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5a

# DB_PASSWORD (recomendado 24 caracteres)
openssl rand -base64 24
# Ejemplo resultado: xY9zW8vU7tS6rQ5pO4nM3lK2jI

# REDIS_PASSWORD (recomendado 24 caracteres)
openssl rand -base64 24
# Ejemplo resultado: hG1fE2dC3bA4zY5xW6vU7tS8rQ

# Verificar longitud de la clave generada
echo -n "tu-clave-aqui" | wc -c
```

### 4.3 Variables por Ambiente

#### Desarrollo (.env)

```bash
# Desarrollo local - valores permisivos para facilitar desarrollo
NODE_ENV=development
DATABASE_URL=postgresql://nomina:nomina123@db:5432/nomina_db?schema=public
DB_USER=nomina
DB_PASSWORD=nomina123
DB_NAME=nomina_db
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=dev-secret-key-not-for-production-use-only
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=dev-encryption-key-32-chars-min!
FRONTEND_URL=http://localhost:5173
ENABLE_SWAGGER=true
QUEUE_MODE=both
PAC_MODE=sandbox
```

#### Staging (.env.staging)

```bash
# Staging - valores similares a producción pero con sandbox
NODE_ENV=staging
DATABASE_URL=postgresql://nomina_staging:GENERATED_PASSWORD@db:5432/nomina_staging?schema=public
DB_USER=nomina_staging
DB_PASSWORD=GENERATED_PASSWORD
DB_NAME=nomina_staging
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=GENERATED_REDIS_PASSWORD
JWT_SECRET=GENERATED_JWT_SECRET_48_CHARS
JWT_EXPIRES_IN=8h
ENCRYPTION_KEY=GENERATED_ENCRYPTION_KEY_32_CHARS
FRONTEND_URL=https://staging.nomina.empresa.com
ENABLE_SWAGGER=false
QUEUE_MODE=api
PAC_MODE=sandbox
TENANT_ISOLATION_STRICT=true
```

#### Producción (.env.production)

```bash
# Producción - máxima seguridad
NODE_ENV=production
DATABASE_URL=postgresql://nomina_prod:VERY_SECURE_PASSWORD@db:5432/nomina_prod?schema=public
DB_USER=nomina_prod
DB_PASSWORD=VERY_SECURE_PASSWORD
DB_NAME=nomina_prod
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=VERY_SECURE_REDIS_PASSWORD
JWT_SECRET=VERY_SECURE_JWT_SECRET_MIN_48_CHARS
JWT_EXPIRES_IN=8h
ENCRYPTION_KEY=VERY_SECURE_ENCRYPTION_KEY_MIN_32
FRONTEND_URL=https://nomina.empresa.com
ENABLE_SWAGGER=false
QUEUE_MODE=api
WORKER_CONCURRENCY=5
PAC_MODE=production
PAC_URL=https://facturacion.finkok.com
TENANT_ISOLATION_STRICT=true
RATE_LIMIT_SHORT=100
RATE_LIMIT_MEDIUM=1000
RATE_LIMIT_LONG=10000
```

---

## 5. Configuración de Base de Datos

### 5.1 PostgreSQL con Docker

El sistema utiliza PostgreSQL 16 como base de datos principal. La configuración con Docker es automática.

#### docker-compose.yml (extracto)

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: nomina-db
    environment:
      POSTGRES_USER: ${DB_USER:-nomina}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-nomina123}
      POSTGRES_DB: ${DB_NAME:-nomina_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-nomina} -d ${DB_NAME:-nomina_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

### 5.2 Configuración Manual de PostgreSQL

Si no usa Docker, configure PostgreSQL manualmente:

```bash
# 1. Instalar PostgreSQL 16
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# 2. Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Acceder como usuario postgres
sudo -u postgres psql

# 4. Crear usuario y base de datos
CREATE USER nomina_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE nomina_db OWNER nomina_user;
GRANT ALL PRIVILEGES ON DATABASE nomina_db TO nomina_user;

# 5. Habilitar extensiones necesarias
\c nomina_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

# 6. Salir
\q

# 7. Configurar pg_hba.conf para conexiones (si es remoto)
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Agregar línea:
# host    nomina_db    nomina_user    192.168.1.0/24    scram-sha-256

# 8. Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 5.3 Migraciones de Base de Datos

#### Comandos Prisma

```bash
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    COMANDOS DE MIGRACIÓN PRISMA                             ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# DESARROLLO - Crear y aplicar nueva migración
npx prisma migrate dev --name nombre_descriptivo
# Ejemplo: npx prisma migrate dev --name add_employee_phone_field

# PRODUCCIÓN - Aplicar migraciones pendientes (NO INTERACTIVO)
npx prisma migrate deploy

# Ver estado de migraciones
npx prisma migrate status

# Resetear base de datos (¡DESTRUCTIVO! Solo desarrollo)
npx prisma migrate reset

# Generar cliente Prisma (después de cambios en schema)
npx prisma generate

# Sincronizar schema sin migración (desarrollo rápido)
npx prisma db push

# Abrir Prisma Studio (UI de base de datos)
npx prisma studio

# Ejecutar seeds (datos iniciales)
npx prisma db seed

# Formatear schema.prisma
npx prisma format
```

#### Con Docker

```bash
# Ejecutar migración en contenedor de desarrollo
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

# Ejecutar migración en contenedor de producción
docker compose exec backend npx prisma migrate deploy

# Ejecutar seed
docker compose exec backend npx prisma db seed

# Abrir Prisma Studio
docker compose exec backend npx prisma studio
```

### 5.4 Esquema de la Base de Datos

El sistema tiene más de 80 modelos. Los principales son:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODELOS PRINCIPALES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ORGANIZACIÓN                    EMPLEADOS                                   │
│  ─────────────                   ─────────                                   │
│  Company ◄───────────────────────┤ Employee                                  │
│  Department ◄────────────────────┤                                           │
│  JobPosition ◄───────────────────┤                                           │
│                                  │                                           │
│                                  ├── EmergencyContact                        │
│                                  ├── EmployeeDocument                        │
│                                  ├── SalaryHistory                           │
│                                  └── EmployeeIncident                        │
│                                                                              │
│  NÓMINA                          FISCAL                                      │
│  ──────                          ──────                                      │
│  PayrollPeriod ◄─────────────────┤ PayrollDetail ◄──────── CfdiNomina        │
│                                  │                                           │
│  PayrollConcept                  ├── PayrollPerception                       │
│  PayrollConfig                   └── PayrollDeduction                        │
│                                                                              │
│  ASISTENCIA                      VACACIONES                                  │
│  ──────────                      ──────────                                  │
│  AttendanceRecord ◄──────────────┤ Employee                                  │
│  BiometricDevice                 │                                           │
│  BiometricLog                    └── VacationRequest                         │
│                                      VacationBalance                         │
│                                                                              │
│  SEGURIDAD                       AUDITORÍA                                   │
│  ─────────                       ─────────                                   │
│  User                            AuditLog                                    │
│  Role                            PayrollCalculationAudit                     │
│  MfaConfig                       FiscalCalculationAudit                      │
│  DualControlRequest              IntegrityAlert                              │
│                                                                              │
│  INTEGRACIONES                                                               │
│  ─────────────                                                               │
│  WhatsAppConfig                  N8nConfig                                   │
│  EmployeeWhatsApp                WebhookLog                                  │
│  WhatsAppMessage                 PacProvider                                 │
│  Geofence                        CompanyPacConfig                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Seed de Datos Iniciales

El sistema incluye seeds para datos iniciales:

```bash
# Ejecutar seed principal
npm run db:seed

# O con Docker
docker compose exec backend npm run db:seed
```

**Datos que se crean:**

1. **Roles del sistema**: super_admin, admin, rh, accountant, manager, employee
2. **Usuario administrador inicial**: admin@empresa.com / admin123
3. **Empresa de prueba**: Empresa Demo S.A. de C.V.
4. **Catálogos SAT**: Tipos de régimen, tipos de nómina, etc.
5. **Valores fiscales**: UMA, SMG, tablas ISR, subsidio al empleo
6. **Tasas IMSS**: Cuotas patronales y obreras

### 5.6 Backup y Restauración

#### Script de Backup Automático

```bash
#!/bin/bash
# backup-database.sh

# Configuración
BACKUP_DIR="/var/backups/nomina/db"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup con Docker
docker compose exec -T db pg_dump \
    -U ${DB_USER:-nomina} \
    -d ${DB_NAME:-nomina_db} \
    --format=custom \
    --compress=9 \
    > "$BACKUP_DIR/nomina_db_$DATE.dump"

# Verificar que el backup se creó correctamente
if [ -f "$BACKUP_DIR/nomina_db_$DATE.dump" ]; then
    echo "✅ Backup creado: nomina_db_$DATE.dump"
    echo "   Tamaño: $(du -h "$BACKUP_DIR/nomina_db_$DATE.dump" | cut -f1)"
else
    echo "❌ Error al crear backup"
    exit 1
fi

# Eliminar backups antiguos
find $BACKUP_DIR -type f -name "*.dump" -mtime +$RETENTION_DAYS -delete
echo "🗑️ Backups mayores a $RETENTION_DAYS días eliminados"

# Listar backups existentes
echo "📁 Backups disponibles:"
ls -lh $BACKUP_DIR/*.dump 2>/dev/null || echo "   Ninguno"
```

#### Restauración

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: ./restore-database.sh <archivo_backup.dump>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Archivo no encontrado: $BACKUP_FILE"
    exit 1
fi

echo "⚠️ ADVERTENCIA: Esto sobrescribirá la base de datos actual."
read -p "¿Continuar? (s/N): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Operación cancelada."
    exit 0
fi

# Restaurar
docker compose exec -T db pg_restore \
    -U ${DB_USER:-nomina} \
    -d ${DB_NAME:-nomina_db} \
    --clean \
    --if-exists \
    < "$BACKUP_FILE"

echo "✅ Base de datos restaurada desde: $BACKUP_FILE"
```

---

## 6. Configuración de Redis y Colas

### 6.1 Redis con Docker

```yaml
# docker-compose.yml (extracto)
services:
  redis:
    image: redis:7-alpine
    container_name: nomina-redis
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      ${REDIS_PASSWORD:+--requirepass ${REDIS_PASSWORD}}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  redis_data:
    driver: local
```

### 6.2 Configuración Manual de Redis

```bash
# 1. Instalar Redis 7
# Ubuntu/Debian
sudo apt update
sudo apt install -y redis-server

# 2. Configurar Redis
sudo nano /etc/redis/redis.conf

# Cambiar/agregar estas líneas:
# bind 127.0.0.1 ::1              # Solo conexiones locales
# requirepass tu_password_seguro  # Contraseña obligatoria
# maxmemory 512mb                 # Límite de memoria
# maxmemory-policy allkeys-lru    # Política de evicción
# appendonly yes                  # Persistencia

# 3. Reiniciar Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# 4. Verificar conexión
redis-cli -a tu_password_seguro ping
# Respuesta esperada: PONG
```

### 6.3 Sistema de Colas BullMQ

El sistema usa BullMQ para procesamiento asíncrono de tareas pesadas.

#### Colas Registradas

| Cola | Propósito | Reintentos | Prioridad |
|------|-----------|------------|-----------|
| `cfdi-stamping` | Timbrado de CFDIs | 3 | Alta |
| `payroll-calculation` | Cálculos de nómina | 2 | Alta |
| `notifications` | Envío de notificaciones | 5 | Media |
| `whatsapp-messages` | Mensajes WhatsApp | 3 | Media |

#### Modos de Operación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODOS DE OPERACIÓN DE COLAS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  QUEUE_MODE=sync (Sin Redis)                                                 │
│  ────────────────────────────                                                │
│  ┌──────────┐      ┌──────────┐                                              │
│  │  Cliente │ ───► │  Backend │ ───► Procesamiento inmediato                 │
│  └──────────┘      └──────────┘      (bloquea hasta completar)               │
│                                                                              │
│  Uso: Desarrollo local sin Redis                                             │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  QUEUE_MODE=both (API + Worker)                                              │
│  ──────────────────────────────                                              │
│  ┌──────────┐      ┌────────────────────────┐      ┌───────┐                 │
│  │  Cliente │ ───► │  Backend (API+Worker)  │ ◄──► │ Redis │                 │
│  └──────────┘      └────────────────────────┘      └───────┘                 │
│                                                                              │
│  Uso: Desarrollo con Docker                                                  │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  QUEUE_MODE=api + QUEUE_MODE=worker (Separados)                              │
│  ──────────────────────────────────────────────                              │
│  ┌──────────┐      ┌─────────────────┐                                       │
│  │  Cliente │ ───► │  Backend (API)  │                                       │
│  └──────────┘      └────────┬────────┘                                       │
│                             │                                                │
│                             ▼                                                │
│                       ┌───────────┐                                          │
│                       │   Redis   │                                          │
│                       └─────┬─────┘                                          │
│                             │                                                │
│               ┌─────────────┼─────────────┐                                  │
│               ▼             ▼             ▼                                  │
│        ┌──────────┐  ┌──────────┐  ┌──────────┐                              │
│        │ Worker 1 │  │ Worker 2 │  │ Worker 3 │                              │
│        └──────────┘  └──────────┘  └──────────┘                              │
│                                                                              │
│  Uso: Producción (escalado horizontal)                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Configuración de Workers

```yaml
# docker-compose.yml - Worker separado
services:
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: ["node", "dist/worker.js"]
    environment:
      QUEUE_MODE: worker
      WORKER_CONCURRENCY: 5
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      replicas: 2  # Escalar workers
    restart: unless-stopped
```

### 6.4 Monitoreo de Colas

```bash
# Ver estado de Redis
docker compose exec redis redis-cli INFO

# Monitorear comandos en tiempo real
docker compose exec redis redis-cli MONITOR

# Ver colas BullMQ
docker compose exec redis redis-cli KEYS "bull:*"

# Ver trabajos pendientes
docker compose exec redis redis-cli LLEN "bull:cfdi-stamping:wait"

# Ver trabajos completados
docker compose exec redis redis-cli LLEN "bull:cfdi-stamping:completed"

# Ver trabajos fallidos
docker compose exec redis redis-cli LLEN "bull:cfdi-stamping:failed"
```

---

## 7. Configuración de Autenticación

### 7.1 Autenticación JWT (Local)

El sistema usa JWT (JSON Web Tokens) para autenticación stateless.

#### Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE AUTENTICACIÓN JWT                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LOGIN                                                                    │
│  ───────                                                                     │
│  Cliente ─► POST /api/auth/login                                             │
│             { email, password }                                              │
│                    │                                                         │
│                    ▼                                                         │
│             ┌──────────────────┐                                             │
│             │ AuthService      │                                             │
│             │ ├─ Buscar usuario│                                             │
│             │ ├─ Verificar pwd │                                             │
│             │ ├─ Verificar MFA │                                             │
│             │ └─ Generar JWT   │                                             │
│             └────────┬─────────┘                                             │
│                      │                                                       │
│                      ▼                                                       │
│             { token: "eyJhbG...", user: {...} }                              │
│                                                                              │
│  2. PETICIONES AUTENTICADAS                                                  │
│  ──────────────────────────                                                  │
│  Cliente ─► GET /api/employees                                               │
│             Headers: { Authorization: "Bearer eyJhbG..." }                   │
│                    │                                                         │
│                    ▼                                                         │
│             ┌──────────────────┐                                             │
│             │ JwtAuthGuard     │                                             │
│             │ ├─ Extraer token │                                             │
│             │ ├─ Verificar firma│                                            │
│             │ ├─ Validar expir.│                                             │
│             │ └─ Inyectar user │                                             │
│             └────────┬─────────┘                                             │
│                      │                                                       │
│                      ▼                                                       │
│             ┌──────────────────┐                                             │
│             │ RolesGuard       │                                             │
│             │ └─ Verificar rol │                                             │
│             └────────┬─────────┘                                             │
│                      │                                                       │
│                      ▼                                                       │
│             Controller ─► Service ─► Response                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Estructura del Token JWT

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "usuario@empresa.com",
    "role": "admin",
    "companyId": "company-uuid",
    "permissions": ["PAYROLL.CREATE", "PAYROLL.APPROVE"],
    "iat": 1704067200,
    "exp": 1704153600
  }
}
```

### 7.2 Autenticación Microsoft Azure AD

Para habilitar SSO con Microsoft:

#### 1. Configurar Azure Portal

```
1. Ir a Azure Portal > Azure Active Directory > App Registrations
2. Click "New registration"
3. Configurar:
   - Name: Sistema de Nomina
   - Supported account types: Single tenant (o multi-tenant)
   - Redirect URI: https://nomina.empresa.com/api/auth/microsoft/callback
4. Guardar Application (client) ID
5. Ir a "Certificates & secrets" > New client secret
6. Copiar el valor del secreto (solo visible una vez)
7. Ir a "API permissions" > Add permission > Microsoft Graph
   - User.Read
   - email
   - profile
```

#### 2. Configurar Variables

```bash
AZURE_AD_CLIENT_ID=12345678-1234-1234-1234-123456789012
AZURE_AD_TENANT_ID=87654321-4321-4321-4321-210987654321
AZURE_AD_CLIENT_SECRET=your-client-secret
AUTH_PROVIDER=microsoft  # o "combined" para ambos métodos
```

#### 3. Flujo OAuth

```
Usuario ─► GET /api/auth/microsoft/login
              │
              ▼
         Redirect a Microsoft Login
              │
              ▼
         Usuario ingresa credenciales Microsoft
              │
              ▼
         Microsoft redirect a /api/auth/microsoft/callback
              │
              ▼
         Backend valida código, obtiene tokens
              │
              ▼
         Crear/actualizar usuario local
              │
              ▼
         Generar JWT local
              │
              ▼
         Redirect al frontend con token
```

### 7.3 Multi-Factor Authentication (MFA)

#### Habilitar MFA

```bash
# En .env
MFA_ENABLED=true
```

#### Flujo MFA

```
1. Usuario habilita MFA en su perfil
   POST /api/auth/mfa/setup
   └─► Genera secreto TOTP
   └─► Retorna QR code para Google Authenticator

2. Usuario escanea QR con app (Google Authenticator, Authy, etc.)

3. Usuario verifica código
   POST /api/auth/mfa/verify
   { code: "123456" }
   └─► Valida código TOTP
   └─► Habilita MFA para el usuario

4. En siguientes logins:
   POST /api/auth/login
   { email, password }
   └─► Retorna { requiresMfa: true, mfaToken: "..." }

   POST /api/auth/mfa/validate
   { mfaToken: "...", code: "123456" }
   └─► Retorna JWT completo
```

### 7.4 Roles y Permisos

#### Roles del Sistema

| Rol | Descripción | Permisos Principales |
|-----|-------------|---------------------|
| `super_admin` | Administrador del sistema | Todos los permisos |
| `admin` | Administrador de empresa | Gestión completa de empresa |
| `company_admin` | Gerente de empresa | Configuración de empresa |
| `rh` | Recursos Humanos | Empleados, nómina, reportes |
| `accountant` | Contabilidad | Reportes fiscales, CFDI |
| `manager` | Gerente de área | Aprobaciones de su equipo |
| `employee` | Empleado | Portal de autoservicio |

#### Permisos Granulares

```typescript
// Ejemplo de permisos por módulo
const PERMISSIONS = {
  // Empleados
  'EMPLOYEES.VIEW': 'Ver empleados',
  'EMPLOYEES.CREATE': 'Crear empleados',
  'EMPLOYEES.UPDATE': 'Modificar empleados',
  'EMPLOYEES.DELETE': 'Eliminar empleados',

  // Nómina
  'PAYROLL.VIEW': 'Ver nómina',
  'PAYROLL.CREATE': 'Crear períodos',
  'PAYROLL.CALCULATE': 'Calcular nómina',
  'PAYROLL.APPROVE': 'Aprobar nómina',

  // CFDI
  'CFDI.VIEW': 'Ver CFDIs',
  'CFDI.GENERATE': 'Generar CFDIs',
  'CFDI.STAMP': 'Timbrar CFDIs',
  'CFDI.CANCEL': 'Cancelar CFDIs',

  // Reportes
  'REPORTS.VIEW': 'Ver reportes',
  'REPORTS.EXPORT': 'Exportar reportes',

  // Configuración
  'CONFIG.VIEW': 'Ver configuración',
  'CONFIG.UPDATE': 'Modificar configuración',
};
```

#### Uso en Controladores

```typescript
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayrollController {

  @Get()
  @Roles('admin', 'rh', 'accountant')  // Múltiples roles
  findAll() { ... }

  @Post('approve/:id')
  @Roles('admin')
  @Permissions('PAYROLL.APPROVE')  // Permiso específico
  approve(@Param('id') id: string) { ... }
}
```

---

## 8. Configuración de Seguridad

### 8.1 Cifrado de Datos Sensibles

El sistema cifra automáticamente datos sensibles en la base de datos.

#### Datos Cifrados

| Dato | Modelo | Campo |
|------|--------|-------|
| RFC | Employee | rfc |
| CURP | Employee | curp |
| NSS (Número Seguro Social) | Employee | nss |
| Cuenta bancaria | Employee | bankAccount |
| CLABE | Employee | clabe |
| Contraseña certificado | CompanyPacConfig | keyPassword |
| Credenciales PAC | CompanyPacConfig | pacPassword |

#### Configuración

```bash
# Clave de cifrado (CRÍTICO - no perder)
ENCRYPTION_KEY=your-32-character-encryption-key!
```

#### Rotación de Clave de Cifrado

```bash
# ADVERTENCIA: Proceso delicado, hacer backup primero

# 1. Backup de la base de datos
./backup-database.sh

# 2. Ejecutar script de rotación
docker compose exec backend npm run security:rotate-key -- \
  --old-key="clave-anterior" \
  --new-key="clave-nueva-32-chars-minimo"

# 3. Actualizar .env con nueva clave
ENCRYPTION_KEY=clave-nueva-32-chars-minimo

# 4. Reiniciar servicios
docker compose restart backend worker
```

### 8.2 Headers de Seguridad (Helmet)

El backend aplica headers de seguridad automáticamente:

```typescript
// main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### 8.3 Rate Limiting

Protección contra abuso de API:

```bash
# Configuración
RATE_LIMIT_SHORT=100    # 100 peticiones por minuto
RATE_LIMIT_MEDIUM=1000  # 1000 peticiones por hora
RATE_LIMIT_LONG=10000   # 10000 peticiones por día
```

### 8.4 CORS

```bash
# URLs permitidas (separadas por coma)
FRONTEND_URL=https://nomina.empresa.com,https://admin.nomina.empresa.com
```

### 8.5 Dual Control (Maker-Checker)

Para operaciones críticas, se requiere aprobación de un segundo usuario.

#### Operaciones con Dual Control

| Operación | Descripción |
|-----------|-------------|
| `PAYROLL_APPROVE` | Aprobar nómina calculada |
| `CFDI_CANCEL` | Cancelar CFDI timbrado |
| `SALARY_CHANGE` | Cambio de salario > 20% |
| `EMPLOYEE_DELETE` | Eliminar empleado |
| `FISCAL_CONFIG_CHANGE` | Cambiar configuración fiscal |

#### Flujo

```
Usuario A (Maker)
    │
    ▼
POST /api/payroll/periods/{id}/approve
    │
    ▼
Sistema crea DualControlRequest
    │
    ▼
Notificación a aprobadores
    │
    ▼
Usuario B (Checker)
    │
    ▼
POST /api/dual-control/requests/{id}/approve
    │
    ▼
Sistema ejecuta la operación
    │
    ▼
AuditLog registra ambos usuarios
```

### 8.6 Auditoría

Todas las acciones críticas se registran en `AuditLog`:

```typescript
// Estructura de AuditLog
{
  id: "uuid",
  userId: "user-uuid",           // Quién
  action: "UPDATE",              // Qué (CREATE, UPDATE, DELETE, LOGIN, etc.)
  entity: "Employee",            // Dónde
  entityId: "employee-uuid",     // Cuál registro
  oldValues: { salary: 10000 },  // Valores anteriores
  newValues: { salary: 12000 },  // Valores nuevos
  ipAddress: "192.168.1.100",    // Desde dónde
  userAgent: "Mozilla/5.0...",   // Con qué
  isCriticalAction: true,        // Es crítico
  justification: "Aumento anual",// Justificación
  createdAt: "2024-01-15T10:30:00Z"
}
```

### 8.7 Verificación de Integridad

Los logs de auditoría incluyen hash para detectar manipulación:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Entrada 1                                                                │
│ sequenceNumber: 1                                                        │
│ entryHash: SHA256(contenido + "")                                        │
│ previousEntryHash: ""                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ Entrada 2                                                                │
│ sequenceNumber: 2                                                        │
│ entryHash: SHA256(contenido + hash_entrada_1)                            │
│ previousEntryHash: hash_entrada_1                                        │
├──────────────────────────────────────────────────────────────────────────┤
│ Entrada 3                                                                │
│ sequenceNumber: 3                                                        │
│ entryHash: SHA256(contenido + hash_entrada_2)                            │
│ previousEntryHash: hash_entrada_2                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Configuración Fiscal (PAC/CFDI)

### 9.1 Conceptos Básicos

#### ¿Qué es un CFDI?

El **CFDI** (Comprobante Fiscal Digital por Internet) es el formato de factura electrónica oficial en México. Para nóminas, se utiliza el **CFDI 4.0** con el **Complemento de Nómina versión 1.2**.

#### ¿Qué es un PAC?

El **PAC** (Proveedor Autorizado de Certificación) es una empresa autorizada por el SAT para timbrar (certificar) los CFDIs. El sistema soporta:

- **FINKOK** (principal)
- **SW Sapien** (alternativo)

### 9.2 Modos de Operación

```bash
# En .env
PAC_MODE=sandbox      # Modo de pruebas (no válido para SAT)
PAC_MODE=production   # Modo productivo (CFDIs válidos)
PAC_MODE=disabled     # Timbrado deshabilitado
```

| Modo | Descripción | Uso |
|------|-------------|-----|
| `sandbox` | CFDIs de prueba, no válidos ante SAT | Desarrollo, testing |
| `production` | CFDIs válidos, reportados al SAT | Producción |
| `disabled` | No genera ni timbra CFDIs | Migración, mantenimiento |

### 9.3 Configuración de FINKOK

#### Sandbox (Pruebas)

```bash
PAC_MODE=sandbox
PAC_PROVIDER=finkok
PAC_URL=https://demo-facturacion.finkok.com
PAC_USER=usuario_sandbox
PAC_PASSWORD=password_sandbox
```

#### Producción

```bash
PAC_MODE=production
PAC_PROVIDER=finkok
PAC_URL=https://facturacion.finkok.com
PAC_USER=RFC_EMPRESA
PAC_PASSWORD=password_produccion
```

#### Obtener Credenciales FINKOK

1. Ir a https://www.finkok.com/
2. Registrarse como desarrollador para sandbox
3. Para producción, contactar comercial de FINKOK
4. Completar proceso de activación con SAT

### 9.4 Configuración de Certificados CSD

Los certificados CSD (Certificado de Sello Digital) son emitidos por el SAT y necesarios para firmar CFDIs.

#### Estructura de Archivos

```
backend/
└── certs/
    ├── certificado.cer    # Certificado público (.cer)
    └── llave.key          # Llave privada (.key)
```

#### Configuración

```bash
CER_PATH=./certs/certificado.cer
KEY_PATH=./certs/llave.key
KEY_PASSWORD=contraseña_del_certificado
```

#### Obtener Certificados CSD

```
1. Ingresar a sat.gob.mx
2. Ir a "Otros trámites y servicios"
3. Seleccionar "Certificados de sello digital"
4. Generar nuevo CSD con FIEL vigente
5. Descargar archivos .cer y .key
6. Guardar contraseña de manera segura
```

### 9.5 Configuración Multi-PAC por Empresa

Cada empresa puede tener su propia configuración de PAC:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN PAC POR EMPRESA                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Empresa A (Company)                                                         │
│  └── CompanyPacConfig                                                        │
│      ├── provider: "finkok"                                                  │
│      ├── pacUser: "RFC_EMPRESA_A"                                            │
│      ├── pacPassword: (cifrado)                                              │
│      ├── cerPath: "/certs/empresa_a.cer"                                     │
│      ├── keyPath: "/certs/empresa_a.key"                                     │
│      └── keyPassword: (cifrado)                                              │
│                                                                              │
│  Empresa B (Company)                                                         │
│  └── CompanyPacConfig                                                        │
│      ├── provider: "sw"                                                      │
│      ├── pacUser: "RFC_EMPRESA_B"                                            │
│      └── ... (diferente configuración)                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.6 Estructura del XML CFDI de Nómina

```xml
<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
    xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
    xmlns:nomina12="http://www.sat.gob.mx/nomina12"
    Version="4.0"
    TipoDeComprobante="N"
    Fecha="2024-01-15T12:00:00"
    SubTotal="15000.00"
    Descuento="2500.00"
    Total="12500.00"
    Moneda="MXN"
    Exportacion="01"
    LugarExpedicion="06600">

    <cfdi:Emisor
        Rfc="EMP123456ABC"
        Nombre="Empresa SA de CV"
        RegimenFiscal="601"/>

    <cfdi:Receptor
        Rfc="AAAA000000AAA"
        Nombre="Juan Pérez García"
        DomicilioFiscalReceptor="06600"
        RegimenFiscalReceptor="605"
        UsoCFDI="CN01"/>

    <cfdi:Conceptos>
        <cfdi:Concepto
            ClaveProdServ="84111505"
            Cantidad="1"
            ClaveUnidad="ACT"
            Descripcion="Pago de nómina"
            ValorUnitario="15000.00"
            Importe="15000.00"
            Descuento="2500.00"
            ObjetoImp="01"/>
    </cfdi:Conceptos>

    <cfdi:Complemento>
        <nomina12:Nomina
            Version="1.2"
            TipoNomina="O"
            FechaPago="2024-01-15"
            FechaInicialPago="2024-01-01"
            FechaFinalPago="2024-01-15"
            NumDiasPagados="15"
            TotalPercepciones="15000.00"
            TotalDeducciones="2500.00">

            <nomina12:Emisor RegistroPatronal="A1234567890"/>

            <nomina12:Receptor
                Curp="AAAA000000HDFAAA00"
                NumSeguridadSocial="12345678901"
                FechaInicioRelLaboral="2020-01-15"
                Antigüedad="P4Y0M0D"
                TipoContrato="01"
                TipoRegimen="02"
                NumEmpleado="EMP001"
                Departamento="Sistemas"
                Puesto="Desarrollador"
                RiesgoTrabajo="1"
                PeriodicidadPago="04"
                SalarioDiarioIntegrado="600.00"
                ClaveEntFed="CMX"/>

            <nomina12:Percepciones
                TotalSueldos="15000.00"
                TotalGravado="12000.00"
                TotalExento="3000.00">

                <nomina12:Percepcion
                    TipoPercepcion="001"
                    Clave="001"
                    Concepto="Sueldo"
                    ImporteGravado="12000.00"
                    ImporteExento="0.00"/>

                <nomina12:Percepcion
                    TipoPercepcion="004"
                    Clave="004"
                    Concepto="Aguinaldo"
                    ImporteGravado="0.00"
                    ImporteExento="3000.00"/>
            </nomina12:Percepciones>

            <nomina12:Deducciones
                TotalOtrasDeducciones="1300.00"
                TotalImpuestosRetenidos="1200.00">

                <nomina12:Deduccion
                    TipoDeduccion="002"
                    Clave="ISR"
                    Concepto="ISR"
                    Importe="1200.00"/>

                <nomina12:Deduccion
                    TipoDeduccion="001"
                    Clave="IMSS"
                    Concepto="IMSS"
                    Importe="1300.00"/>
            </nomina12:Deducciones>

        </nomina12:Nomina>
    </cfdi:Complemento>

</cfdi:Comprobante>
```

### 9.7 Almacenamiento de Documentos Fiscales

```bash
FISCAL_STORAGE_PATH=/app/storage/fiscal
```

#### Estructura de Almacenamiento

```
storage/fiscal/
└── {companyId}/
    └── {year}/
        └── {periodId}/
            ├── {detailId}_xml_original_v1.xml    # XML sin timbrar
            ├── {detailId}_xml_timbrado_v1.xml    # XML timbrado
            ├── {detailId}_pdf_recibo_v1.pdf      # PDF del recibo
            └── {detailId}_acuse_v1.xml           # Acuse de recepción
```

#### Retención de Documentos

Por ley (SAT), los documentos fiscales deben conservarse por **5 años**. El sistema incluye:

- **RetentionPolicy**: Configuración de retención por tipo de documento
- **Backup automático**: Scripts para respaldo de documentos
- **Verificación de integridad**: Hash SHA-256 de cada documento

---

## 10. Configuración de Integraciones

### 10.1 WhatsApp (Twilio)

#### Propósito

- Registro de asistencia vía ubicación (geofence)
- Notificaciones a empleados
- ChatBot de RH

#### Configuración

```bash
# Credenciales de Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Token para verificación de webhook
WHATSAPP_VERIFY_TOKEN=mi_token_secreto_para_verificar
```

#### Configurar Webhook en Twilio

```
1. Ir a Twilio Console > Messaging > Settings > WhatsApp sandbox
2. Configurar Webhook URL:
   - When a message comes in: https://nomina.empresa.com/api/whatsapp/webhook
   - Method: POST
3. Configurar Status Callback URL (opcional):
   - https://nomina.empresa.com/api/whatsapp/status
```

#### Flujo de Asistencia por WhatsApp

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ASISTENCIA VÍA WHATSAPP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Empleado envía "entrada" o "salida" por WhatsApp                         │
│                     │                                                        │
│                     ▼                                                        │
│  2. Sistema solicita compartir ubicación                                     │
│                     │                                                        │
│                     ▼                                                        │
│  3. Empleado comparte ubicación actual                                       │
│                     │                                                        │
│                     ▼                                                        │
│  4. GeofenceService verifica si está dentro del área permitida               │
│     ┌─────────────────────────────────────────────────────┐                  │
│     │  Geofence configurado:                              │                  │
│     │  - Centro: lat 19.4326, lng -99.1332 (oficina)      │                  │
│     │  - Radio: 100 metros                                │                  │
│     │  - Ubicación empleado: lat 19.4328, lng -99.1330    │                  │
│     │  - Distancia: 25 metros ✅                          │                  │
│     └─────────────────────────────────────────────────────┘                  │
│                     │                                                        │
│                     ▼                                                        │
│  5. Si está dentro del geofence:                                             │
│     - Registrar AttendanceRecord                                             │
│     - Enviar confirmación al empleado                                        │
│                                                                              │
│  6. Si está fuera del geofence:                                              │
│     - Rechazar registro                                                      │
│     - Notificar al empleado                                                  │
│     - Alertar a RH (opcional)                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Configurar Geofence por Empresa

```
POST /api/whatsapp/geofences
{
  "companyId": "uuid",
  "name": "Oficina Principal",
  "latitude": 19.4326,
  "longitude": -99.1332,
  "radiusMeters": 100,
  "isActive": true
}
```

### 10.2 n8n (Automatización)

#### Propósito

- Automatización de procesos de RH
- Integraciones con otros sistemas
- ChatBot IA avanzado

#### Configuración

```bash
# URL del servicio n8n
N8N_BASE_URL=http://n8n:5678
N8N_WEBHOOK_BASE_URL=http://n8n:5678/webhook

# Credenciales
N8N_USER=admin
N8N_PASSWORD=password_seguro

# API Key (opcional, para autenticación API)
N8N_API_KEY=
```

#### Docker Compose para n8n

```yaml
# docker-compose.n8n.yml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: nomina-n8n
    environment:
      - N8N_HOST=${N8N_HOST:-localhost}
      - N8N_PORT=${N8N_PORT:-5678}
      - N8N_PROTOCOL=http
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER:-admin}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD:-admin123}
      - WEBHOOK_URL=http://n8n:5678/
      - GENERIC_TIMEZONE=${GENERIC_TIMEZONE:-America/Mexico_City}
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "5678:5678"
    restart: unless-stopped

volumes:
  n8n_data:
    driver: local
```

#### Inicializar n8n

```bash
# Ejecutar script de inicialización
./scripts/init-n8n.sh

# O manualmente
docker compose -f docker-compose.n8n.yml up -d

# Acceder a http://localhost:5678
# Usuario: admin
# Contraseña: admin123 (cambiar en producción)
```

#### Workflows Incluidos

```
n8n-workflows/
└── chatbot-rrhh.json    # ChatBot de RH con IA
```

#### Importar Workflow

```
1. Acceder a n8n (http://localhost:5678)
2. Ir a Workflows > Import from File
3. Seleccionar archivo JSON del workflow
4. Configurar credenciales necesarias
5. Activar workflow
```

### 10.3 Anthropic (ChatBot IA)

#### Propósito

Alimentar el ChatBot de RH con inteligencia artificial para responder preguntas de empleados.

#### Configuración

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Obtener API Key

```
1. Ir a https://console.anthropic.com/
2. Registrarse o iniciar sesión
3. Ir a API Keys
4. Crear nueva API Key
5. Copiar y guardar de forma segura
```

#### Uso en el Sistema

El ChatBot puede responder preguntas como:

- "¿Cuántos días de vacaciones me quedan?"
- "¿Cuándo es mi próximo pago?"
- "¿Cómo solicito vacaciones?"
- "¿Cuál es mi saldo de aguinaldo?"

### 10.4 Email (SMTP)

#### Configuración

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nomina@empresa.com
SMTP_PASSWORD=app_password_here
SMTP_FROM_EMAIL=nomina@empresa.com
SMTP_FROM_NAME=Sistema de Nómina
```

#### Configuración para Proveedores Comunes

**Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
# Nota: Usar "App Password" si tiene 2FA habilitado
```

**Office 365:**
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
```

**Amazon SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
```

#### Plantillas de Email

El sistema incluye plantillas para:

- Bienvenida de nuevo empleado
- Notificación de recibo de nómina
- Aprobación/rechazo de vacaciones
- Recordatorio de documentos pendientes
- Confirmación de timbrado de CFDI

---

## 11. Configuración del Frontend

### 11.1 Variables de Entorno

```bash
# frontend/.env

# URL de la API
VITE_API_URL=/api

# Ambiente
VITE_APP_ENV=development

# Versión de la aplicación
VITE_APP_VERSION=1.0.0
```

### 11.2 Configuración de Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', 'lucide-react'],
        },
      },
    },
  },
});
```

### 11.3 Internacionalización (i18n)

#### Idiomas Soportados

- **es-MX**: Español (México) - Predeterminado
- **en-US**: English (US)

#### Estructura de Traducciones

```
frontend/src/i18n/
├── index.ts              # Configuración i18next
└── locales/
    ├── es-MX/
    │   ├── common.json
    │   ├── auth.json
    │   ├── employees.json
    │   ├── payroll.json
    │   ├── nav.json
    │   └── errors.json
    └── en-US/
        ├── common.json
        ├── auth.json
        └── ...
```

#### Ejemplo de Uso

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('payroll.title')}</h1>
      <p>{t('payroll.description')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 11.4 Temas (Light/Dark Mode)

```typescript
// contexts/ThemeContext.tsx
const themes = {
  light: {
    background: '#ffffff',
    text: '#1f2937',
    primary: '#3b82f6',
  },
  dark: {
    background: '#1f2937',
    text: '#f9fafb',
    primary: '#60a5fa',
  },
};
```

### 11.5 Nginx para Producción

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Compresión gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Cache de assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy a API (si no hay proxy externo)
    location /api/ {
        proxy_pass http://backend:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 12. Despliegue por Entorno

### 12.1 Desarrollo Local

#### Requisitos

- Docker y Docker Compose instalados
- Git

#### Pasos

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/nomina.git
cd nomina

# 2. Copiar archivo de entorno
cp .env.example .env

# 3. Iniciar servicios
docker compose -f docker-compose.dev.yml up --build

# 4. En otra terminal, ejecutar migraciones
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

# 5. Ejecutar seeds
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed

# 6. Acceder a:
#    - Frontend: http://localhost:5173
#    - API: http://localhost:3000
#    - Swagger: http://localhost:3000/api/docs
#    - Adminer: http://localhost:9090
#    - n8n: http://localhost:5678
```

#### Credenciales por Defecto (Desarrollo)

| Servicio | Usuario | Contraseña |
|----------|---------|------------|
| Sistema | admin@empresa.com | admin123 |
| PostgreSQL | nomina | nomina123 |
| n8n | admin | admin123 |

### 12.2 Staging

#### Configuración

```bash
# 1. Crear archivo de entorno staging
cp .env.staging.example .env

# 2. Editar con valores de staging
nano .env

# 3. Generar claves seguras
JWT_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)

# 4. Actualizar .env con las claves generadas
```

#### Despliegue

```bash
# Usando script
./deploy-staging.sh

# O manualmente
docker compose -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.staging.yml exec backend npx prisma migrate deploy
```

#### Verificación

```bash
./scripts/verify-staging.sh
```

### 12.3 Producción

#### Pre-requisitos de Seguridad

- [ ] Claves generadas con `openssl rand -base64`
- [ ] SSL/TLS configurado
- [ ] Dominio con DNS configurado
- [ ] Firewall configurado
- [ ] Credenciales PAC de producción
- [ ] Certificados CSD del SAT

#### Pasos de Despliegue

```bash
# 1. Preparar entorno
cp .env.production.example .env.production

# 2. Generar TODAS las claves seguras
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "DB_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"

# 3. Editar .env.production con valores reales
nano .env.production

# 4. Crear directorio de storage
mkdir -p storage/fiscal
chown -R 1000:1000 storage

# 5. Desplegar con SSL
./deploy-production.sh --ssl nomina.empresa.com

# 6. Verificar despliegue
curl https://nomina.empresa.com/api/health
```

#### Configuración de SSL con Let's Encrypt

```bash
# Incluido en deploy-production.sh, pero manualmente:

# 1. Instalar certbot
apt install -y certbot

# 2. Obtener certificado
certbot certonly --standalone -d nomina.empresa.com

# 3. Los certificados se guardan en:
#    /etc/letsencrypt/live/nomina.empresa.com/fullchain.pem
#    /etc/letsencrypt/live/nomina.empresa.com/privkey.pem

# 4. Configurar renovación automática
echo "0 3 * * * certbot renew --quiet" | crontab -
```

### 12.4 Comandos Make Disponibles

```bash
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                         COMANDOS MAKE                                       ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# DESARROLLO
make dev              # Iniciar entorno de desarrollo
make dev-d            # Iniciar en modo detached
make dev-down         # Detener desarrollo
make dev-logs         # Ver logs de desarrollo

# PRODUCCIÓN
make prod             # Iniciar producción
make prod-down        # Detener producción

# BASE DE DATOS
make migrate          # Ejecutar migraciones
make seed             # Ejecutar seeds
make studio           # Abrir Prisma Studio
make db:cleanup       # Limpiar duplicados

# UTILIDADES
make shell-backend    # Shell en contenedor backend
make shell-db         # Shell en contenedor DB
make ps               # Estado de contenedores
make clean            # Limpiar contenedores
make clean-all        # Limpiar todo (incluyendo volúmenes)

# LOGS
make logs             # Ver todos los logs
make logs-backend     # Ver logs del backend
make logs-db          # Ver logs de la BD
```

---

## 13. Configuración de Monitoreo

### 13.1 Health Checks

#### Endpoints de Salud

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api` | GET | Health check básico |
| `/api/health` | GET | Health check detallado |

#### Respuesta de Health Check

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "redis": {
      "status": "up",
      "responseTime": 2
    },
    "storage": {
      "status": "up",
      "freeSpace": "50GB"
    }
  }
}
```

### 13.2 Logs del Sistema

#### Niveles de Log

| Nivel | Descripción | Ambiente |
|-------|-------------|----------|
| `error` | Errores críticos | Todos |
| `warn` | Advertencias | Todos |
| `log` | Información general | Desarrollo, Staging |
| `debug` | Información detallada | Desarrollo |
| `verbose` | Todo | Solo bajo demanda |

#### Configuración de Logs

```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  logger: process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['error', 'warn', 'log', 'debug'],
});
```

#### Ver Logs con Docker

```bash
# Todos los servicios
docker compose logs -f

# Servicio específico
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f redis
docker compose logs -f worker

# Últimas N líneas
docker compose logs --tail=100 backend

# Con timestamps
docker compose logs -t backend
```

### 13.3 Métricas de Colas

```bash
# Ver estado de colas Redis
docker compose exec redis redis-cli

# Comandos útiles
KEYS bull:*                           # Listar colas
LLEN bull:cfdi-stamping:wait          # Trabajos pendientes
LLEN bull:cfdi-stamping:active        # Trabajos activos
LLEN bull:cfdi-stamping:completed     # Trabajos completados
LLEN bull:cfdi-stamping:failed        # Trabajos fallidos
```

### 13.4 Script de Monitoreo

```bash
#!/bin/bash
# monitor.sh - Script de monitoreo del sistema

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              MONITOREO DEL SISTEMA DE NÓMINA               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Health check del backend
echo "🔍 Backend API..."
HEALTH=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
    echo "   ✅ Backend: UP"
else
    echo "   ❌ Backend: DOWN"
fi

# Estado de PostgreSQL
echo ""
echo "🔍 Base de Datos..."
docker compose exec -T db pg_isready -U nomina > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ PostgreSQL: UP"
else
    echo "   ❌ PostgreSQL: DOWN"
fi

# Estado de Redis
echo ""
echo "🔍 Redis..."
docker compose exec -T redis redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Redis: UP"
else
    echo "   ❌ Redis: DOWN"
fi

# Estado de contenedores
echo ""
echo "🔍 Contenedores..."
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Espacio en disco
echo ""
echo "🔍 Espacio en Disco..."
df -h storage/ 2>/dev/null || df -h .

# Memoria
echo ""
echo "🔍 Uso de Memoria..."
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "════════════════════════════════════════════════════════════"
```

---

## 14. Solución de Problemas

### 14.1 Problemas de Conexión a Base de Datos

#### Error: "Connection refused"

```bash
# Verificar que el contenedor esté corriendo
docker compose ps db

# Verificar logs
docker compose logs db

# Verificar que el puerto esté disponible
lsof -i :5432

# Reiniciar contenedor
docker compose restart db
```

#### Error: "Authentication failed"

```bash
# Verificar credenciales en .env
cat .env | grep DB_

# Verificar credenciales en el contenedor
docker compose exec db psql -U nomina -d nomina_db -c "SELECT 1"
```

### 14.2 Problemas de Redis

#### Error: "Redis connection refused"

```bash
# Verificar contenedor
docker compose ps redis

# Test de conexión
docker compose exec redis redis-cli ping

# Si tiene password
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

### 14.3 Problemas de Migraciones

#### Error: "Migration failed"

```bash
# Ver estado de migraciones
docker compose exec backend npx prisma migrate status

# Forzar reset (¡SOLO DESARROLLO!)
docker compose exec backend npx prisma migrate reset

# Aplicar manualmente
docker compose exec backend npx prisma db push
```

### 14.4 Problemas de CORS

#### Error: "CORS policy blocked"

```bash
# Verificar FRONTEND_URL en .env
cat .env | grep FRONTEND_URL

# Debe incluir la URL exacta del frontend
FRONTEND_URL=http://localhost:5173,https://nomina.empresa.com
```

### 14.5 Problemas de Timbrado CFDI

#### Error: "PAC authentication failed"

```bash
# Verificar credenciales PAC
cat .env | grep PAC_

# Probar conexión al PAC
curl -v https://demo-facturacion.finkok.com
```

#### Error: "Certificate not found"

```bash
# Verificar que los certificados existan
ls -la backend/certs/

# Verificar permisos
chmod 644 backend/certs/*.cer
chmod 600 backend/certs/*.key
```

### 14.6 Problemas de Memoria

#### Error: "Out of memory"

```bash
# Ver uso de memoria
docker stats

# Aumentar límites en docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G

# Limpiar cache de Docker
docker system prune -a
```

### 14.7 Problemas de Permisos en Storage

#### Error: "Permission denied" en storage

```bash
# Verificar permisos actuales
ls -la storage/

# Corregir permisos (UID 1000 es el usuario node en Docker)
sudo chown -R 1000:1000 storage/
chmod -R 755 storage/
```

### 14.8 Logs de Diagnóstico

```bash
# Exportar logs para diagnóstico
docker compose logs > diagnostico_$(date +%Y%m%d_%H%M%S).log

# Incluir información del sistema
echo "=== Docker Info ===" >> diagnostico.log
docker info >> diagnostico.log

echo "=== Docker Compose PS ===" >> diagnostico.log
docker compose ps >> diagnostico.log

echo "=== Environment ===" >> diagnostico.log
cat .env | grep -v PASSWORD | grep -v SECRET | grep -v KEY >> diagnostico.log
```

---

## 15. Checklists de Configuración

### 15.1 Checklist de Desarrollo

```
□ Docker y Docker Compose instalados
□ Git instalado
□ Repositorio clonado
□ Archivo .env creado desde .env.example
□ Contenedores iniciados (docker compose up)
□ Migraciones ejecutadas (prisma migrate dev)
□ Seeds ejecutados (prisma db seed)
□ Frontend accesible en http://localhost:5173
□ API accesible en http://localhost:3000
□ Swagger accesible en http://localhost:3000/api/docs
□ Login con admin@empresa.com / admin123 funciona
```

### 15.2 Checklist de Staging

```
□ Servidor con requisitos mínimos
□ Docker instalado en servidor
□ Archivo .env.staging configurado
□ Claves generadas con openssl
□ Base de datos separada de producción
□ Redis con password configurado
□ SSL configurado (puede ser self-signed)
□ Dominio de staging configurado
□ Migraciones aplicadas
□ Health check responde correctamente
□ Timbrado en modo sandbox funciona
□ Notificaciones por email funcionan (opcional)
```

### 15.3 Checklist de Producción

```
SEGURIDAD
□ JWT_SECRET generado (mínimo 48 caracteres)
□ ENCRYPTION_KEY generado (mínimo 32 caracteres)
□ DB_PASSWORD seguro generado
□ REDIS_PASSWORD configurado
□ Certificados SSL de Let's Encrypt o comerciales
□ CORS configurado solo para dominios permitidos
□ Rate limiting habilitado
□ Swagger deshabilitado (ENABLE_SWAGGER=false)

BASE DE DATOS
□ PostgreSQL con credenciales únicas
□ Backup automático configurado
□ Retención de backups (mínimo 30 días)

FISCAL
□ Credenciales PAC de producción
□ Certificados CSD del SAT instalados
□ PAC_MODE=production
□ Storage de documentos fiscales configurado
□ Backup de documentos fiscales configurado

INFRAESTRUCTURA
□ Dominio DNS configurado
□ Firewall configurado (puertos 80, 443)
□ Workers separados del API (QUEUE_MODE=api)
□ Monitoreo configurado
□ Logs persistentes configurados

INTEGRACIONES (opcionales)
□ WhatsApp (Twilio) configurado
□ n8n configurado y accesible
□ SMTP configurado y probado
□ Azure AD configurado (si aplica)

VERIFICACIÓN FINAL
□ Health check responde
□ Login funciona
□ Creación de empleado funciona
□ Cálculo de nómina funciona
□ Timbrado de CFDI funciona
□ Reportes se generan correctamente
□ Backup y restore probados
```

### 15.4 Checklist de Actualización

```
ANTES DE ACTUALIZAR
□ Backup de base de datos creado
□ Backup de storage fiscal creado
□ Notificar a usuarios del mantenimiento
□ Documentar versión actual

DURANTE ACTUALIZACIÓN
□ Detener servicios (docker compose down)
□ Pull de cambios (git pull)
□ Revisar cambios en .env.example
□ Actualizar .env si es necesario
□ Reconstruir imágenes (docker compose build)
□ Aplicar migraciones (prisma migrate deploy)
□ Iniciar servicios (docker compose up -d)

DESPUÉS DE ACTUALIZAR
□ Verificar health check
□ Verificar logs sin errores
□ Probar funcionalidades críticas
□ Notificar a usuarios que el sistema está disponible
□ Documentar cambios realizados
```

---

## Apéndice A: Referencia Rápida de Comandos

```bash
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    COMANDOS DE REFERENCIA RÁPIDA                            ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# === DOCKER ===
docker compose up -d                    # Iniciar servicios
docker compose down                     # Detener servicios
docker compose logs -f                  # Ver logs
docker compose ps                       # Estado de contenedores
docker compose exec backend sh          # Shell en backend
docker compose restart backend          # Reiniciar servicio

# === BASE DE DATOS ===
npx prisma migrate dev                  # Migración desarrollo
npx prisma migrate deploy               # Migración producción
npx prisma db seed                      # Ejecutar seeds
npx prisma studio                       # UI de base de datos
npx prisma generate                     # Regenerar cliente

# === BACKUP ===
docker compose exec db pg_dump -U nomina nomina_db > backup.sql
cat backup.sql | docker compose exec -T db psql -U nomina nomina_db

# === REDIS ===
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli KEYS "bull:*"

# === LOGS ===
docker compose logs -f backend          # Logs backend
docker compose logs --tail=100 backend  # Últimas 100 líneas

# === MONITOREO ===
curl http://localhost:3000/api/health   # Health check
docker stats                            # Recursos

# === LIMPIEZA ===
docker system prune -a                  # Limpiar Docker
docker volume prune                     # Limpiar volúmenes
```

---

## Apéndice B: Contacto y Soporte

### Recursos

- **Documentación**: `/docs/` en el repositorio
- **API Docs**: `/api/docs` (Swagger, solo desarrollo)
- **Repositorio**: https://github.com/acsey/nomina

### Reportar Problemas

Para reportar problemas o solicitar mejoras:

1. Crear issue en GitHub con:
   - Descripción detallada del problema
   - Pasos para reproducir
   - Logs relevantes (sin credenciales)
   - Ambiente (desarrollo/staging/producción)
   - Versión del sistema

---

*Manual de Configuración del Sistema de Nómina*
*Versión: 2.0*
*Última actualización: Enero 2024*
*Autor: Equipo de Desarrollo*
