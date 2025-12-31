# Manual Operativo para RH / Nómina

## Sistema de Nómina - Guía de Operación

### Índice
1. [Flujo de Nómina](#flujo-de-nómina)
2. [Estados y Transiciones](#estados-y-transiciones)
3. [Proceso de Cálculo](#proceso-de-cálculo)
4. [Autorización de Timbrado](#autorización-de-timbrado)
5. [Timbrado de CFDI](#timbrado-de-cfdi)
6. [Manejo de Errores](#manejo-de-errores)
7. [Recálculos y Correcciones](#recálculos-y-correcciones)
8. [Cancelación de CFDI](#cancelación-de-cfdi)
9. [Reportes y Auditoría](#reportes-y-auditoría)

---

## Flujo de Nómina

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   BORRADOR  │───▶│  CALCULANDO │───▶│  CALCULADO  │───▶│ AUTORIZADO  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │                   │
                                            ▼                   ▼
                                      ┌─────────────┐    ┌─────────────┐
                                      │ RECÁLCULO   │    │   PAGADO    │
                                      │ (si aplica) │    └─────────────┘
                                      └─────────────┘           │
                                                                ▼
                                                          ┌─────────────┐
                                                          │   CERRADO   │
                                                          └─────────────┘
```

### Descripción de Estados

| Estado | Descripción | Acciones Permitidas |
|--------|-------------|---------------------|
| **BORRADOR** | Período en preparación | Cargar incidencias, modificar configuración |
| **PROCESANDO** | Cálculo en ejecución | Solo visualización |
| **CALCULADO** | Cálculo completado | Revisar, aprobar, recalcular |
| **AUTORIZADO** | Aprobado para timbrado | Timbrar recibos |
| **PAGADO** | Nómina pagada | Generar reportes, cancelar CFDI |
| **CERRADO** | Período cerrado | Solo consulta |

---

## Estados y Transiciones

### Reglas de Transición

Cada cambio de estado requiere:
- Usuario con rol autorizado
- Justificación (para acciones críticas)
- Confirmación por segundo usuario (para acciones de alto riesgo)

### Acciones que Requieren Justificación

1. **Recálculo de Período** - Debe explicar el motivo
2. **Revocación de Autorización** - Motivo del retroceso
3. **Cancelación de CFDI** - Fundamento de la cancelación
4. **Cierre de Período** - Confirmación de que todo está correcto

### Acciones que Requieren Doble Control

- Recálculo masivo de período
- Cancelación de CFDI timbrado
- Revocación de autorización de timbrado

---

## Proceso de Cálculo

### Paso 1: Preparar el Período

1. Crear período de nómina (Nómina → Períodos → Nuevo)
2. Verificar fechas: inicio, fin, pago
3. Verificar fecha límite de incidencias

### Paso 2: Cargar Incidencias

1. Revisar incidencias pendientes
2. Aprobar/rechazar incidencias
3. Verificar incidencias retroactivas

### Paso 3: Ejecutar Cálculo

1. Ir a Nómina → Períodos → [Período]
2. Click en "Calcular Nómina"
3. Esperar procesamiento
4. Revisar resumen de cálculo

### Paso 4: Validar Resultados

Revisar:
- Total de percepciones
- Total de deducciones
- ISR retenido
- Cuotas IMSS
- Neto a pagar

### Consideraciones Fiscales

El sistema aplica automáticamente:
- **ISR**: Según tablas Art. 96 LISR vigentes
- **Subsidio al empleo**: Si aplica
- **IMSS empleado**: EyM, IV, CEAV
- **ISN**: Según estado configurado

---

## Autorización de Timbrado

### Requisitos para Autorizar

1. Período en estado CALCULADO
2. Usuario con permiso `PAYROLL_AUTHORIZE_STAMPING`
3. Configuración de PAC válida
4. Certificado CSD vigente

### Proceso de Autorización

1. Ir a Nómina → Períodos → [Período]
2. Revisar totales y recibos
3. Click en "Autorizar Timbrado"
4. Ingresar justificación
5. Confirmar autorización

### Revocación de Autorización

Solo se puede revocar si:
- No hay recibos timbrados
- Usuario tiene permiso ADMIN

---

## Timbrado de CFDI

### Proceso Automático

1. Período autorizado
2. Sistema genera XMLs
3. Envío a PAC
4. Recepción de UUID y sello SAT
5. Almacenamiento de evidencias

### Estados de CFDI

| Estado | Descripción |
|--------|-------------|
| **PENDIENTE** | Esperando timbrado |
| **TIMBRADO** | Timbrado exitoso |
| **ERROR** | Error en timbrado |
| **CANCELADO** | Cancelado ante SAT |

### Reintentos Automáticos

El sistema reintenta automáticamente:
- Errores de red: 5 intentos
- Errores temporales del PAC: 5 intentos
- **NO reintenta**: Errores de validación fiscal

---

## Manejo de Errores

### Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| Certificado vencido | CSD expirado | Renovar ante SAT |
| RFC inválido | RFC incorrecto | Corregir en expediente |
| Sello inválido | CSD incorrecto | Verificar certificado |
| PAC no disponible | Servicio caído | Esperar reintento |
| Error de validación | Datos incorrectos | Revisar y corregir |

### Pasos para Corregir Error

1. Identificar el error en el log
2. Corregir la causa raíz
3. Marcar recibo para reintento
4. Ejecutar reintento manual

---

## Recálculos y Correcciones

### Cuándo Recalcular

- Corrección de salario
- Incidencia omitida
- Error en días trabajados
- Corrección de deducciones

### Proceso de Recálculo

1. Justificar el motivo (obligatorio)
2. Obtener confirmación (si aplica)
3. Ejecutar recálculo
4. Sistema crea nueva versión
5. Versión anterior queda en historial

### Importante

- Los recibos TIMBRADOS no se pueden recalcular
- Se debe cancelar el CFDI primero
- Cada versión queda registrada para auditoría

---

## Cancelación de CFDI

### Motivos Válidos de Cancelación (SAT)

| Código | Motivo |
|--------|--------|
| 01 | Comprobante emitido con errores con relación |
| 02 | Comprobante emitido con errores sin relación |
| 03 | No se llevó a cabo la operación |
| 04 | Operación nominativa relacionada en factura global |

### Proceso de Cancelación

1. Seleccionar CFDI a cancelar
2. Elegir motivo de cancelación
3. Ingresar justificación detallada
4. Confirmar por segundo usuario
5. Sistema envía solicitud al SAT
6. Almacenar acuse de cancelación

### Consideraciones

- La cancelación puede tardar 24-72 horas
- El empleado puede rechazar la cancelación
- Guardar acuse como evidencia

---

## Reportes y Auditoría

### Reportes Disponibles

1. **Reporte de Período** - Resumen ejecutivo
2. **Detalle por Empleado** - Recibos individuales
3. **Auditoría Fiscal** - Cálculos con fundamento legal
4. **Historial de Versiones** - Cambios en recibos
5. **Log de Acciones** - Quién hizo qué

### Exportación para Auditoría

Formatos disponibles:
- Excel (.xlsx)
- CSV
- JSON

Datos exportables:
- Auditoría fiscal completa
- Snapshots de reglas
- Transiciones de estado
- Acciones críticas

### Acceso a Reportes

1. Ir a Reportes → Auditoría
2. Seleccionar período y tipo
3. Elegir formato
4. Descargar archivo

---

## Vista Ejecutiva

### Indicadores Clave

| Indicador | Descripción |
|-----------|-------------|
| Total Nómina | Suma de netos a pagar |
| Total Impuestos | ISR + IMSS + ISN |
| Promedio por Empleado | Neto promedio |
| Variación vs Anterior | Comparativo períodos |

### Panel de Control

El dashboard muestra:
- Estado actual del período
- Recibos pendientes de timbrado
- Errores activos
- Alertas de integridad

---

## Contacto de Soporte

Para problemas técnicos:
- Administrador del sistema
- Soporte técnico

Para dudas fiscales:
- Contador de la empresa
- Asesor fiscal

---

*Documento generado por Sistema de Nómina v1.0*
*Última actualización: Diciembre 2024*
