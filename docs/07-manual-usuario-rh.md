# Manual de Usuario - Recursos Humanos (RH)

## 1. Introduccion

### 1.1 Rol de Recursos Humanos
Como usuario de Recursos Humanos tienes acceso a:
- Gestion completa de empleados
- Procesamiento de nomina
- Administracion de incidencias
- Control de asistencia
- Gestion de vacaciones y beneficios
- Generacion de reportes

### 1.2 Acceso al Sistema
1. Ingresar a la URL del sistema
2. Introducir correo electronico y contrasena
3. Clic en "Iniciar Sesion"

---

## 2. Dashboard

### 2.1 Vista General
Al iniciar sesion veras:
- **Total de empleados** activos
- **Nominas del mes** procesadas
- **Proximos cumpleanos**
- **Solicitudes pendientes** de vacaciones

### 2.2 Navegacion Principal
El menu lateral incluye:
- Dashboard
- Empleados
- Departamentos
- Nomina
- Incidencias
- Asistencia
- Vacaciones
- Beneficios
- Reportes

---

## 3. Gestion de Empleados

### 3.1 Ver Lista de Empleados
1. Ir a **Empleados** en el menu
2. Ver listado con:
   - Numero de empleado
   - Nombre completo
   - Departamento
   - Puesto
   - Estado (activo/inactivo)

### 3.2 Buscar Empleados
- Usar el campo de busqueda
- Filtrar por departamento
- Filtrar por estado

### 3.3 Crear Nuevo Empleado
1. Clic en **"Nuevo Empleado"**
2. Completar informacion por pestanas:

#### Pestana: Datos Personales
- Nombre y apellidos
- CURP
- RFC
- NSS (Numero de Seguro Social)
- Fecha de nacimiento
- Genero
- Estado civil
- Direccion completa

#### Pestana: Datos Laborales
- Numero de empleado
- Fecha de ingreso
- Departamento
- Puesto
- Tipo de contrato
- Jornada laboral
- Horario asignado

#### Pestana: Datos de Nomina
- Salario diario
- Tipo de salario (fijo/variable)
- Periodicidad de pago
- Metodo de pago
- Banco y cuenta (si aplica)
- CLABE interbancaria

#### Pestana: Documentos
- Subir INE
- Subir comprobante de domicilio
- Subir acta de nacimiento
- Otros documentos

3. Clic en **Guardar**

### 3.4 Editar Empleado
1. Buscar empleado en la lista
2. Clic en el icono de edicion
3. Modificar datos necesarios
4. Guardar cambios

### 3.5 Dar de Baja Empleado
1. Abrir detalle del empleado
2. Clic en **"Dar de Baja"**
3. Seleccionar motivo de baja
4. Ingresar fecha de baja
5. Confirmar operacion

---

## 4. Departamentos

### 4.1 Ver Departamentos
1. Ir a **Departamentos**
2. Ver estructura organizacional
3. Ver empleados por departamento

### 4.2 Crear Departamento
1. Clic en **"Nuevo Departamento"**
2. Ingresar:
   - Nombre del departamento
   - Codigo
   - Departamento padre (si aplica)
   - Descripcion
3. Guardar

### 4.3 Asignar Responsable
1. Editar departamento
2. Seleccionar empleado responsable
3. Guardar cambios

---

## 5. Procesamiento de Nomina

### 5.1 Tipos de Nomina
- **Ordinaria**: Nomina regular del periodo
- **Extraordinaria**: Aguinaldo, PTU, finiquitos

### 5.2 Crear Nueva Nomina
1. Ir a **Nomina**
2. Clic en **"Nueva Nomina"**
3. Seleccionar:
   - Tipo de nomina
   - Periodo (quincenal/mensual)
   - Fechas del periodo
4. Clic en **Crear**

### 5.3 Revisar Pre-Nomina
1. Seleccionar nomina creada
2. Clic en **"Vista Previa"**
3. Verificar:
   - Percepciones por empleado
   - Deducciones aplicadas
   - Totales correctos

### 5.4 Agregar Percepciones Extras
1. En la nomina, seleccionar empleado
2. Clic en **"Agregar Percepcion"**
3. Seleccionar tipo:
   - Bono
   - Comision
   - Premio
   - Horas extra
4. Ingresar monto
5. Guardar

### 5.5 Agregar Deducciones
1. Seleccionar empleado
2. Clic en **"Agregar Deduccion"**
3. Seleccionar tipo:
   - Prestamo
   - Descuento
   - Pension alimenticia
4. Ingresar monto
5. Guardar

### 5.6 Procesar Nomina
1. Verificar que toda la informacion este correcta
2. Clic en **"Procesar Nomina"**
3. El sistema calculara:
   - ISR
   - IMSS (cuotas obrero)
   - Subsidio al empleo
   - Neto a pagar
4. Confirmar procesamiento

### 5.7 Timbrar CFDI
1. Con la nomina procesada
2. Clic en **"Timbrar Recibos"**
3. El sistema:
   - Genera XML de cada recibo
   - Envia al PAC para timbrado
   - Almacena recibos timbrados
4. Verificar que todos tengan UUID

### 5.8 Descargar Recibos
1. Ir a **Nomina > Recibos**
2. Filtrar por periodo
3. Opciones de descarga:
   - Individual (PDF o XML)
   - Masivo (ZIP con todos)

---

## 6. Incidencias

### 6.1 Tipos de Incidencias
| Tipo | Descripcion |
|------|-------------|
| Falta | Ausencia no justificada |
| Retardo | Llegada tarde |
| Incapacidad | Enfermedad/accidente |
| Permiso | Ausencia autorizada |
| Suspension | Sancion administrativa |

### 6.2 Registrar Incidencia
1. Ir a **Incidencias**
2. Clic en **"Nueva Incidencia"**
3. Seleccionar empleado
4. Seleccionar tipo de incidencia
5. Ingresar fechas (inicio y fin)
6. Agregar observaciones
7. Subir documento soporte (si aplica)
8. Guardar

### 6.3 Incapacidades IMSS
1. Crear incidencia tipo "Incapacidad"
2. Completar datos adicionales:
   - Numero de incapacidad IMSS
   - Tipo (enfermedad general, riesgo de trabajo, maternidad)
   - Porcentaje de subsidio
3. El sistema ajustara el calculo de nomina

### 6.4 Consultar Historial
1. Ir al detalle del empleado
2. Pestana **"Incidencias"**
3. Ver historial completo

---

## 7. Control de Asistencia

### 7.1 Ver Registros de Asistencia
1. Ir a **Asistencia**
2. Seleccionar periodo
3. Ver registros de entrada/salida

### 7.2 Filtrar por Empleado
1. Usar el buscador
2. Seleccionar empleado especifico
3. Ver su historial de asistencia

### 7.3 Registrar Asistencia Manual
1. Clic en **"Nuevo Registro"**
2. Seleccionar empleado
3. Ingresar fecha y hora de entrada
4. Ingresar hora de salida (opcional)
5. Agregar observaciones
6. Guardar

### 7.4 Corregir Registro
1. Buscar el registro en la lista
2. Clic en editar
3. Modificar hora entrada/salida
4. Agregar justificacion del cambio
5. Guardar

### 7.5 Reportes de Asistencia
1. Seleccionar rango de fechas
2. Clic en **"Generar Reporte"**
3. Ver resumen:
   - Dias trabajados
   - Faltas
   - Retardos
   - Horas extra

---

## 8. Vacaciones

### 8.1 Ver Solicitudes
1. Ir a **Vacaciones**
2. Ver listado de solicitudes:
   - Pendientes (por aprobar)
   - Aprobadas
   - Rechazadas

### 8.2 Revisar Solicitud
1. Clic en la solicitud pendiente
2. Ver detalles:
   - Empleado solicitante
   - Fechas solicitadas
   - Dias disponibles
   - Dias solicitados
3. Verificar que no afecte operacion

### 8.3 Aprobar/Rechazar
1. En la solicitud
2. Clic en **"Aprobar"** o **"Rechazar"**
3. Si rechaza, agregar motivo
4. El empleado recibira notificacion

### 8.4 Ver Saldos de Vacaciones
1. Ir al detalle del empleado
2. Pestana **"Vacaciones"**
3. Ver:
   - Dias correspondientes por antiguedad
   - Dias tomados
   - Dias pendientes

### 8.5 Registrar Vacaciones Directamente
1. Clic en **"Nuevo Periodo"**
2. Seleccionar empleado
3. Ingresar fechas de vacaciones
4. El sistema calculara dias habiles
5. Guardar (queda como aprobado)

---

## 9. Beneficios

### 9.1 Tipos de Beneficios
- Vales de despensa
- Fondo de ahorro
- Seguro de gastos medicos
- Otros beneficios

### 9.2 Configurar Beneficio
1. Ir a **Beneficios**
2. Clic en **"Nuevo Beneficio"**
3. Configurar:
   - Nombre del beneficio
   - Tipo (monto fijo/porcentaje)
   - Valor
   - Periodicidad
4. Guardar

### 9.3 Asignar a Empleados
1. Seleccionar beneficio
2. Clic en **"Asignar Empleados"**
3. Seleccionar empleados participantes
4. Configurar fechas de vigencia
5. Guardar

### 9.4 Reportes de Beneficios
1. Seleccionar beneficio
2. Clic en **"Generar Reporte"**
3. Ver:
   - Empleados participantes
   - Montos entregados
   - Historial por periodo

---

## 10. Reportes

### 10.1 Reportes Disponibles
| Reporte | Descripcion |
|---------|-------------|
| Plantilla | Lista de empleados activos |
| Nomina | Detalle de pagos por periodo |
| Acumulados | Percepciones/deducciones anuales |
| Asistencia | Registros de entrada/salida |
| Vacaciones | Saldos y periodos tomados |

### 10.2 Generar Reporte
1. Ir a **Reportes**
2. Seleccionar tipo de reporte
3. Configurar filtros:
   - Periodo
   - Departamento
   - Empleados especificos
4. Clic en **"Generar"**
5. Descargar en formato Excel o PDF

### 10.3 Reportes Fiscales
- **IDSE**: Reporte para IMSS
- **SUA**: Archivo para pago de cuotas
- **Acumulados ISR**: Para declaraciones

---

## 11. Carga Masiva

### 11.1 Subir Archivo de Empleados
1. Ir a **Carga Masiva**
2. Descargar plantilla Excel
3. Llenar datos de empleados
4. Subir archivo
5. Validar informacion
6. Confirmar carga

### 11.2 Subir Incidencias Masivas
1. En **Carga Masiva**
2. Seleccionar tipo "Incidencias"
3. Descargar plantilla
4. Llenar datos
5. Subir y validar
6. Confirmar

---

## 12. Preguntas Frecuentes

### 12.1 Nomina

**P: Un empleado no aparece en la nomina**
R: Verificar que:
- El empleado este activo
- Tenga departamento asignado
- Tenga salario configurado
- No este dado de baja

**P: El ISR calculado parece incorrecto**
R: Verificar:
- Tablas ISR actualizadas
- Subsidio al empleo aplicado
- Acumulados del ano correctos

### 12.2 Empleados

**P: Como registro a un empleado de nuevo ingreso?**
R: Usar **Empleados > Nuevo Empleado** y completar todos los datos requeridos antes de la fecha de pago.

**P: Como cambio el salario de un empleado?**
R: Editar empleado > Pestana Nomina > Modificar salario. El cambio aplica desde el siguiente periodo.

### 12.3 Asistencia

**P: Un empleado marco doble entrada**
R: Editar el registro incorrecto y corregir manualmente, agregando justificacion.

**P: Como registro tiempo extra?**
R: En el modulo de Incidencias, crear incidencia tipo "Tiempo Extra" con las horas trabajadas.

---

## 13. Atajos y Tips

### 13.1 Atajos de Teclado
- `Ctrl + B`: Buscar empleado
- `Ctrl + N`: Nuevo registro (segun modulo activo)
- `Esc`: Cerrar modal/dialogo

### 13.2 Tips de Productividad
- Usar filtros para agilizar busquedas
- Descargar plantillas antes de cargas masivas
- Revisar pre-nomina antes de procesar
- Mantener documentos de empleados actualizados

---

## 14. Soporte

### Contacto
- **Email**: soporte@empresa.com
- **Telefono**: (55) 1234-5678
- **Horario**: Lunes a Viernes 9:00-18:00

### Reportar Problema
1. Describir el problema detalladamente
2. Incluir capturas de pantalla
3. Indicar empleado/nomina afectada
4. Enviar a soporte

---

---

## 15. Funcionalidades Adicionales

### 15.1 Dispositivos Biometricos
Si la empresa tiene checadores biometricos:
1. Los registros se sincronizan automaticamente
2. Ir a **Asistencia** > **Dispositivos** para ver estado
3. Marcas soportadas: ZKTECO, ANVIZ, Suprema

### 15.2 Notificaciones por WhatsApp
Si esta habilitado:
- Los empleados reciben notificaciones de:
  - Recibos de nomina listos
  - Solicitudes de vacaciones aprobadas/rechazadas
  - Recordatorios de asistencia

### 15.3 Timbrado Asincrono
Para nominas grandes:
- El timbrado se procesa en segundo plano
- Ver progreso en **Nomina** > **Estado de Timbrado**
- Recibiras notificacion cuando termine

### 15.4 Control Dual (Empresas Enterprise)
Para mayor seguridad en el timbrado:
- Una persona calcula la nomina
- Otra persona autoriza el timbrado
- Configurable en **Config. Sistema** > **Seguridad**

### 15.5 Snapshots de Reglas Fiscales
El sistema guarda automaticamente:
- Tablas de ISR usadas
- Tasas de IMSS aplicadas
- Valor de UMA/SMG del periodo
- Permite auditar calculos historicos

---

*Manual de Usuario RH v2.0*
*Ultima actualizacion: Enero 2025*
