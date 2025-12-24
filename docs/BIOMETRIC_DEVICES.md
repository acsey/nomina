# Guía de Dispositivos Biométricos

Este documento describe cómo agregar y configurar dispositivos biométricos en el Sistema de Nómina, así como agregar soporte para nuevas marcas de dispositivos.

## Contenido

1. [Dispositivos Soportados](#dispositivos-soportados)
2. [Agregar un Dispositivo al Sistema](#agregar-un-dispositivo-al-sistema)
3. [Configuración de Red](#configuración-de-red)
4. [Agregar Nuevas Marcas de Dispositivos](#agregar-nuevas-marcas-de-dispositivos)
5. [Integración por Webhook (HTTP)](#integración-por-webhook-http)
6. [Solución de Problemas](#solución-de-problemas)

---

## Dispositivos Soportados

El sistema actualmente soporta los siguientes tipos de dispositivos:

| Tipo | Descripción | Protocolo |
|------|-------------|-----------|
| **ZKTECO** | Dispositivos ZKTeco (fingerprint, facial) | TCP/IP, SDK propietario |
| **ANVIZ** | Dispositivos Anviz | TCP/IP, SDK propietario |
| **SUPREMA** | Dispositivos Suprema BioStation | TCP/IP, BioStar SDK |
| **GENERIC_HTTP** | Dispositivos con soporte webhook | HTTP/HTTPS |
| **MANUAL** | Entrada manual (sin dispositivo físico) | API |

---

## Agregar un Dispositivo al Sistema

### Desde la Interfaz Web

1. Navega a **Control → Dispositivos** en el menú principal
2. Haz clic en **"Agregar Dispositivo"**
3. Completa el formulario:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nombre** | Nombre identificador del dispositivo | "Entrada Principal" |
| **Tipo** | Marca/tipo del dispositivo | ZKTECO |
| **Modo de Conexión** | Cómo se conecta el dispositivo | ETHERNET |
| **Dirección IP** | IP del dispositivo en la red | 192.168.1.100 |
| **Puerto** | Puerto de comunicación (generalmente 4370) | 4370 |
| **Número de Serie** | S/N del dispositivo | ABC123456 |
| **Ubicación** | Ubicación física | "Oficina Principal - Entrada" |
| **Empresa** | Empresa a la que pertenece | Mi Empresa S.A. |

4. Haz clic en **"Guardar"**
5. Usa **"Probar Conexión"** para verificar la comunicación

### Configuración JSON Adicional

Algunos dispositivos requieren configuración adicional en formato JSON:

```json
{
  "timezone": "America/Mexico_City",
  "syncInterval": 300,
  "communicationKey": "0",
  "deviceModel": "TF-1700",
  "firmwareVersion": "6.60"
}
```

---

## Configuración de Red

### Requisitos de Red

1. **Conectividad**: El servidor debe poder comunicarse con el dispositivo biométrico
2. **Puerto**: El puerto por defecto es **4370** para la mayoría de dispositivos ZKTeco
3. **Firewall**: Asegúrate de que el firewall permita conexiones TCP en el puerto configurado

### Diagrama de Red

```
┌─────────────────┐     TCP/4370     ┌──────────────────┐
│   Servidor      │◄────────────────►│   Dispositivo    │
│   Nómina        │                  │   Biométrico     │
│   (Backend)     │                  │                  │
└─────────────────┘                  └──────────────────┘
        ▲
        │ HTTP/HTTPS
        │
┌───────┴───────┐
│   Webhook     │ (Para dispositivos GENERIC_HTTP)
│   Endpoint    │
└───────────────┘
```

---

## Agregar Nuevas Marcas de Dispositivos

Para agregar soporte para una nueva marca de dispositivos biométricos, sigue estos pasos:

### Paso 1: Agregar el Tipo de Dispositivo

Edita el archivo `backend/prisma/schema.prisma` y agrega el nuevo tipo:

```prisma
enum BiometricDeviceType {
  ZKTECO
  ANVIZ
  SUPREMA
  GENERIC_HTTP
  MANUAL
  NUEVA_MARCA    // <-- Agregar aquí
}
```

### Paso 2: Crear el Adaptador del Dispositivo

Crea un nuevo archivo en `backend/src/modules/devices/adapters/`:

```typescript
// backend/src/modules/devices/adapters/nueva-marca.adapter.ts

import { DeviceAdapter, AttendanceEvent } from './device-adapter.interface';

export class NuevaMarcaAdapter implements DeviceAdapter {
  private ip: string;
  private port: number;
  private config: any;

  constructor(ip: string, port: number, config?: any) {
    this.ip = ip;
    this.port = port;
    this.config = config || {};
  }

  async connect(): Promise<boolean> {
    // Implementar lógica de conexión
    // Usar SDK del fabricante o protocolo TCP directo
    try {
      // ... conexión
      return true;
    } catch (error) {
      console.error('Error connecting to device:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    // Cerrar conexión
  }

  async testConnection(): Promise<{ success: boolean; latency?: number }> {
    const start = Date.now();
    const connected = await this.connect();
    const latency = Date.now() - start;
    await this.disconnect();
    return { success: connected, latency };
  }

  async getAttendanceRecords(fromDate?: Date): Promise<AttendanceEvent[]> {
    // Obtener registros del dispositivo
    // Retornar arreglo de eventos de asistencia
    return [];
  }

  async syncTime(): Promise<boolean> {
    // Sincronizar hora del dispositivo con el servidor
    return true;
  }

  async getDeviceInfo(): Promise<any> {
    // Obtener información del dispositivo (modelo, firmware, etc.)
    return {};
  }
}
```

### Paso 3: Registrar el Adaptador

Edita `backend/src/modules/devices/devices.service.ts`:

```typescript
import { NuevaMarcaAdapter } from './adapters/nueva-marca.adapter';

// En el método getDeviceAdapter:
private getDeviceAdapter(device: BiometricDevice): DeviceAdapter {
  switch (device.deviceType) {
    case 'ZKTECO':
      return new ZKTecoAdapter(device.ip, device.port, device.config);
    case 'ANVIZ':
      return new AnvizAdapter(device.ip, device.port, device.config);
    case 'NUEVA_MARCA':
      return new NuevaMarcaAdapter(device.ip, device.port, device.config);
    default:
      throw new Error(`Tipo de dispositivo no soportado: ${device.deviceType}`);
  }
}
```

### Paso 4: Agregar Configuración Específica

Si el dispositivo requiere configuración especial, agrégala al formulario en el frontend:

```typescript
// frontend/src/pages/DevicesPage.tsx

const DEVICE_CONFIGS = {
  NUEVA_MARCA: {
    defaultPort: 5000,
    configFields: [
      { name: 'apiKey', label: 'API Key', type: 'password' },
      { name: 'syncMode', label: 'Modo de Sincronización', type: 'select', options: ['push', 'pull'] },
    ],
  },
};
```

---

## Integración por Webhook (HTTP)

Para dispositivos que envían datos por HTTP, configura el endpoint:

### Endpoint de Recepción

```
POST /api/devices/attendance/webhook
```

### Formato del Payload

```json
{
  "deviceId": "uuid-del-dispositivo",      // o
  "serialNumber": "ABC123456",             // identificador del dispositivo
  "employeeId": "uuid-del-empleado",       // o
  "employeeNumber": "EMP001",              // número de empleado
  "eventType": "CHECK_IN",                 // CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END
  "timestamp": "2024-01-15T08:30:00Z",     // ISO 8601
  "verifyMode": "FINGERPRINT",             // método de verificación
  "rawData": {}                            // datos crudos opcionales
}
```

### Configurar el Dispositivo

1. En el panel del dispositivo, configura el webhook URL:
   ```
   https://tu-servidor.com/api/devices/attendance/webhook
   ```

2. Si requiere autenticación, usa un API key en los headers:
   ```
   Authorization: Bearer tu-api-key
   ```

### Ejemplo de Configuración para Diferentes Marcas

**ZKTeco (con push):**
```
URL: https://servidor.com/api/devices/attendance/webhook
Method: POST
Content-Type: application/json
```

**Hikvision:**
```
URL: https://servidor.com/api/devices/attendance/webhook
Event Type: Attendance
Include Personnel Info: Yes
```

---

## Solución de Problemas

### El dispositivo aparece como "Offline"

1. **Verificar conectividad**:
   ```bash
   ping 192.168.1.100
   telnet 192.168.1.100 4370
   ```

2. **Verificar firewall**: Asegurar que el puerto esté abierto

3. **Verificar configuración del dispositivo**: Revisar que esté en modo "Server" o "TCP/IP"

### No se sincronizan los registros

1. **Verificar mapeo de empleados**: El número de usuario en el dispositivo debe coincidir con el `employeeNumber` en el sistema

2. **Verificar zona horaria**: Configurar la misma zona horaria en el dispositivo y el servidor

3. **Revisar logs**: Ver `BiometricLog` para errores de sincronización

### Error de comunicación

1. **Verificar clave de comunicación**: Algunos dispositivos requieren una clave (CommKey)

2. **Actualizar firmware**: Asegurar que el firmware del dispositivo esté actualizado

3. **Revisar protocolo**: Verificar que el puerto y protocolo sean correctos

### Comandos Útiles de Diagnóstico

```bash
# Verificar puertos abiertos en el servidor
netstat -tlnp | grep 4370

# Probar conexión TCP
nc -zv 192.168.1.100 4370

# Ver logs del backend
tail -f backend/logs/devices.log
```

---

## Referencias

- [ZKTeco SDK Documentation](https://www.zkteco.com/en/Software_Download)
- [Anviz Developer Portal](https://www.anviz.com/developer)
- [Suprema BioStar API](https://www.supremainc.com/en/platform/biostar-2)

---

## Soporte

Para soporte técnico o agregar nuevas integraciones, contacta al equipo de desarrollo o crea un issue en el repositorio.
