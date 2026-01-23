# Guía de Configuración: WhatsApp + n8n + ChatBot IA

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Configuración Local para Desarrollo](#configuración-local-para-desarrollo)
3. [Configuración de WhatsApp](#configuración-de-whatsapp)
4. [Configuración de n8n](#configuración-de-n8n)
5. [Costos de Operación](#costos-de-operación)
6. [Flujos de Trabajo](#flujos-de-trabajo)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EMPLEADO                                     │
│                    (WhatsApp en celular)                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              WHATSAPP BUSINESS API                                   │
│         (Twilio / Meta / 360Dialog)                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Webhook
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND NESTJS                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  WhatsApp   │  │   n8n       │  │  Chatbot    │                 │
│  │  Module     │  │   Module    │  │  Service    │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │               │                │                          │
│         └───────────────┼────────────────┘                          │
│                         │                                            │
│  ┌──────────────────────┼──────────────────────────────────────┐   │
│  │               PRISMA / POSTGRESQL                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         N8N                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Attendance  │  │  Chatbot    │  │  Vacation   │                 │
│  │  Workflow   │  │  Workflow   │  │  Workflow   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │               │                │                          │
│         └───────────────┼────────────────┘                          │
│                         │                                            │
│                         ▼                                            │
│               ┌─────────────────┐                                   │
│               │   Claude API    │                                   │
│               │   (Anthropic)   │                                   │
│               └─────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Configuración Local para Desarrollo

### 1. Requisitos Previos

```bash
# Docker y Docker Compose
docker --version  # Docker 24+
docker compose version  # Docker Compose 2+

# Node.js
node --version  # Node 18+
```

### 2. Levantar n8n Localmente

Crear archivo `docker-compose.n8n.yml`:

```yaml
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=America/Mexico_City
      # API Key para integraciones
      - N8N_API_KEY=tu_api_key_aqui
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

Ejecutar:
```bash
docker compose -f docker-compose.n8n.yml up -d
```

Acceder: http://localhost:5678

### 3. Exponer Webhooks para Pruebas (ngrok)

Para recibir webhooks de WhatsApp en local:

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer el backend
ngrok http 3000

# Exponer n8n (si necesitas webhooks directos)
ngrok http 5678
```

Obtendrás una URL como: `https://abc123.ngrok.io`

### 4. Simular Mensajes de WhatsApp (Sin cuenta real)

Endpoint de prueba disponible en desarrollo:

```bash
# Simular mensaje de texto
curl -X POST http://localhost:3000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "whatsapp:+525512345678",
    "message": "entrada"
  }'

# Simular mensaje con ubicación
curl -X POST http://localhost:3000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "whatsapp:+525512345678",
    "message": "",
    "location": {
      "latitude": 19.4326,
      "longitude": -99.1332
    }
  }'
```

### 5. Variables de Entorno para Desarrollo

Agregar a `.env`:

```env
# WhatsApp (Twilio Sandbox para desarrollo)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# n8n
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=tu_api_key_aqui
N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook

# Webhook verification (Meta)
WHATSAPP_VERIFY_TOKEN=nomina_verify_token

# Claude API (para chatbot con IA)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
```

---

## Configuración de WhatsApp

### Opción 1: Twilio (Recomendada para inicio)

#### Sandbox para Desarrollo (Gratis)
1. Crear cuenta en https://www.twilio.com
2. Ir a "Messaging > Try it out > Send a WhatsApp message"
3. Escanear código QR con WhatsApp
4. Enviar el código de unión al sandbox

#### Configuración en la Plataforma
```
Webhook URL: https://tu-dominio.com/webhooks/whatsapp/twilio
Method: POST
```

#### Producción
1. Solicitar WhatsApp Business API en Twilio
2. Verificar número de teléfono
3. Crear mensaje templates (para mensajes proactivos)

### Opción 2: Meta WhatsApp Business API (Directo)

1. Crear cuenta en Meta Business Suite
2. Configurar WhatsApp Business API
3. Crear aplicación en Meta Developers
4. Configurar webhook:
   - Verify Token: `nomina_verify_token`
   - Webhook URL: `https://tu-dominio.com/webhooks/whatsapp/meta`

### Opción 3: 360Dialog

1. Crear cuenta en https://www.360dialog.com
2. Conectar número de WhatsApp
3. Configurar webhook en el dashboard

---

## Configuración de n8n

### 1. Crear Workflow de Asistencia

```json
{
  "name": "WhatsApp Attendance",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "attendance",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Process Event",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Procesar evento de asistencia\nconst data = $input.all()[0].json;\n\n// Lógica de procesamiento...\n\nreturn [{ json: { success: true, ...data } }];"
      }
    }
  ]
}
```

### 2. Crear Workflow de Chatbot con IA

```json
{
  "name": "HR Chatbot",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "chatbot",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Claude AI",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-sonnet-4-20250514",
        "options": {
          "maxTokensToSample": 1024,
          "temperature": 0.7
        }
      }
    },
    {
      "name": "Build Prompt",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const message = $input.all()[0].json.message;\nconst context = $input.all()[0].json.context;\n\nconst systemPrompt = `Eres un asistente de Recursos Humanos para una empresa mexicana.\nPuedes ayudar con:\n- Consultas de vacaciones y permisos\n- Consultas de nómina\n- Registro de asistencia\n- Preguntas generales de RRHH\n\nContexto del empleado:\n${JSON.stringify(context)}\n\nResponde de manera amable y profesional en español.`;\n\nreturn [{ json: { systemPrompt, userMessage: message } }];"
      }
    },
    {
      "name": "Respond to Backend",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{$env.BACKEND_URL}}/webhooks/whatsapp/n8n",
        "method": "POST",
        "body": {
          "action": "chatbot_response",
          "response": "={{$node['Claude AI'].json.text}}",
          "intent": "={{$node['Classify Intent'].json.intent}}",
          "sessionId": "={{$input.all()[0].json.sessionId}}"
        }
      }
    }
  ]
}
```

### 3. Importar el Workflow del ChatBot

El proyecto incluye un workflow pre-configurado en `n8n-workflows/chatbot-rrhh.json`.

**Pasos para importar:**

1. **Primero crear las credenciales** (antes de importar el workflow)
   - Ir a **Settings > Credentials > Add Credential**
   - Tipo: **Anthropic**
   - Nombre: "Anthropic API"
   - API Key: `sk-ant-xxx` (tu API key de Anthropic)
   - Guardar

2. **Importar el workflow**
   - Ir a **Workflows**
   - Click en **Import from File**
   - Seleccionar `n8n-workflows/chatbot-rrhh.json`
   - Click en **Import**

3. **Conectar las credenciales**
   - Abrir el workflow importado
   - En el nodo "Claude AI - Generar Respuesta"
   - Click en el nodo > Select Credential > "Anthropic API"
   - Guardar

4. **Activar el workflow**
   - En la esquina superior derecha, activar el toggle
   - El webhook quedará disponible en: `http://localhost:5678/webhook/chatbot`

**Nota importante**: Si intentas importar el workflow sin crear las credenciales primero, obtendrás errores de `FOREIGN KEY constraint failed`. Esto es porque n8n intenta vincular referencias que no existen.

### 4. Configurar Credenciales en n8n

1. **Anthropic (Claude)**
   - Settings > Credentials > New
   - Tipo: Anthropic
   - API Key: `sk-ant-xxx`

2. **HTTP Request (para callback al backend)**
   - Tipo: Header Auth
   - Name: `X-N8N-Signature`
   - Value: `tu_webhook_secret`

---

## Costos de Operación

### WhatsApp Business API

| Proveedor | Costo por Mensaje | Costo Mensual Base | Notas |
|-----------|------------------|-------------------|-------|
| **Twilio** | $0.005 - $0.08 USD | $0 USD | Pago por uso |
| **Meta Directo** | $0.004 - $0.06 USD | $0 USD | Requiere verificación |
| **360Dialog** | €0.004 - €0.05 EUR | €49 EUR | Incluye soporte |
| **WATI** | $0.006 - $0.09 USD | $49 USD | Dashboard incluido |

#### Costo por Tipo de Conversación (Meta/Twilio)
- **Utilidad (Business-initiated)**: ~$0.05 USD
- **Autenticación**: ~$0.03 USD
- **Marketing**: ~$0.08 USD
- **Servicio (User-initiated)**: ~$0.02 USD

#### Ejemplo: 100 empleados, 4 checados/día
```
Mensajes por día: 100 empleados × 4 checados × 2 (in + out) = 800 mensajes
Mensajes por mes: 800 × 22 días hábiles = 17,600 mensajes

Costo mensual (Twilio, conversaciones de servicio):
17,600 × $0.02 = ~$352 USD/mes

Con templating eficiente (agrupar en sesiones de 24h):
~$150 USD/mes
```

### n8n

| Opción | Costo | Límites |
|--------|-------|---------|
| **Self-hosted** | $0 | Sin límites, tú pagas servidor |
| **n8n Cloud Starter** | $20 USD/mes | 2,500 ejecuciones |
| **n8n Cloud Pro** | $50 USD/mes | 10,000 ejecuciones |
| **n8n Cloud Enterprise** | Custom | Ilimitado |

#### Infraestructura Self-hosted
```
VPS mínimo (DigitalOcean/Hetzner):
- 2 vCPU, 4GB RAM: $20-24 USD/mes
- Incluye: n8n + Redis (si necesitas)

Docker en servidor existente:
- $0 adicional si ya tienes infraestructura
```

### Claude API (Anthropic)

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|------------------|-------------------|
| **Claude 3.5 Haiku** | $0.25 | $1.25 |
| **Claude 3.5 Sonnet** | $3.00 | $15.00 |
| **Claude 3 Opus** | $15.00 | $75.00 |

#### Ejemplo: Chatbot RRHH
```
Promedio por conversación:
- Input: ~500 tokens (mensaje + contexto)
- Output: ~200 tokens (respuesta)

100 conversaciones/día con Claude Sonnet:
- Input: 50,000 tokens × $3/1M = $0.15
- Output: 20,000 tokens × $15/1M = $0.30
- Total diario: ~$0.45
- Total mensual: ~$10 USD

Con Claude Haiku (suficiente para chatbot):
- Total mensual: ~$1-2 USD
```

### Resumen de Costos Mensuales (100 empleados)

| Componente | Opción Económica | Opción Estándar | Opción Premium |
|------------|-----------------|-----------------|----------------|
| WhatsApp | $100 (Twilio optimizado) | $200 (Twilio) | $300 (360Dialog) |
| n8n | $0 (self-hosted) | $20 (Cloud Starter) | $50 (Cloud Pro) |
| Claude AI | $2 (Haiku) | $10 (Sonnet) | $30 (Opus) |
| Servidor | $0 (existente) | $20 (VPS dedicado) | $50 (HA setup) |
| **TOTAL** | **~$102 USD** | **~$250 USD** | **~$430 USD** |

---

## Flujos de Trabajo

### Flujo de Checado por WhatsApp

```
1. Empleado envía "Entrada" o ubicación 📍
                ↓
2. Webhook recibe mensaje (Twilio/Meta)
                ↓
3. Backend identifica empleado por teléfono
                ↓
4. Valida geocerca (¿está en ubicación permitida?)
                ↓
    ┌───────────────────────────────────┐
    │         ¿Dentro de geocerca?      │
    └───────────────────────────────────┘
           │                    │
           ▼ SÍ                 ▼ NO
    ┌──────────────┐    ┌──────────────────┐
    │ Registrar    │    │ Marcar para      │
    │ asistencia   │    │ revisión manual  │
    └──────────────┘    └──────────────────┘
           │                    │
           └────────┬───────────┘
                    ▼
    ┌───────────────────────────────────┐
    │ Enviar confirmación por WhatsApp  │
    │ "✅ Entrada registrada: 09:00 AM" │
    └───────────────────────────────────┘
```

### Flujo de Chatbot IA (Solicitud de Vacaciones)

```
1. Empleado: "Quiero solicitar vacaciones"
                    ↓
2. n8n Workflow recibe mensaje
                    ↓
3. Claude detecta intención: REQUEST_VACATION
                    ↓
4. Bot: "📅 ¿Cuándo quieres iniciar tus vacaciones?"
                    ↓
5. Empleado: "Del 15 al 20 de febrero"
                    ↓
6. Claude extrae fechas: { start: "2025-02-15", end: "2025-02-20" }
                    ↓
7. Backend valida:
   - ¿Tiene saldo suficiente?
   - ¿No hay conflictos de calendario?
                    ↓
8. Bot: "Tu solicitud de vacaciones del 15 al 20 de febrero
         (6 días) ha sido enviada a tu supervisor.
         Te notificaré cuando sea aprobada. 📨"
                    ↓
9. Crear VacationRequest en BD
                    ↓
10. Notificar a supervisor (WhatsApp/Email)
```

---

## Próximos Pasos

1. **Desarrollo**
   - [ ] Configurar Twilio Sandbox
   - [ ] Levantar n8n local con Docker
   - [ ] Crear workflows básicos
   - [ ] Probar con endpoint de test

2. **Producción**
   - [ ] Obtener cuenta WhatsApp Business
   - [ ] Desplegar n8n en servidor
   - [ ] Configurar credenciales de Claude
   - [ ] Configurar geocercas de la empresa

3. **Mejoras Futuras**
   - [ ] Reconocimiento facial para validación
   - [ ] Voice-to-text para reportes por voz
   - [ ] Integración con calendario de Google/Outlook
   - [ ] Notificaciones push además de WhatsApp

---

## Soporte

Para dudas sobre esta implementación:
- Documentación de Twilio: https://www.twilio.com/docs/whatsapp
- Documentación de n8n: https://docs.n8n.io
- Anthropic Claude: https://docs.anthropic.com
