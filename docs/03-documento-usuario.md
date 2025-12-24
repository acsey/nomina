# Manual de Usuario - Sistema de Nómina

## 1. Introducción

### 1.1 Acerca del Sistema
El Sistema de Nómina es una plataforma integral para la gestión de nómina empresarial, diseñada para cumplir con las normativas mexicanas. Permite administrar empleados, calcular nóminas, generar recibos CFDI y gestionar prestaciones.

### 1.2 Acceso al Sistema
- **URL**: https://tu-dominio.com
- **Navegadores soportados**: Chrome, Firefox, Safari, Edge (versiones recientes)
- **Dispositivos**: Computadoras, tablets y móviles (responsive)

---

## 2. Inicio de Sesión

### 2.1 Acceder al Sistema
1. Abra su navegador web
2. Ingrese la URL del sistema
3. En la pantalla de login, ingrese:
   - **Correo electrónico**: Su email registrado
   - **Contraseña**: Su contraseña
4. Haga clic en **"Iniciar Sesión"**

### 2.2 Recuperar Contraseña
1. En la pantalla de login, haga clic en "¿Olvidaste tu contraseña?"
2. Ingrese su correo electrónico
3. Recibirá un enlace para restablecer su contraseña

---

## 3. Navegación Principal

### 3.1 Menú Lateral
El menú lateral contiene las siguientes secciones (según su rol):

| Sección | Descripción | Roles |
|---------|-------------|-------|
| Dashboard | Resumen general y estadísticas | Todos |
| Mi Portal | Portal personal del empleado | Todos |
| Empleados | Gestión de empleados | Admin, RH |
| Departamentos | Administración de departamentos | Admin, RH |
| Nómina | Cálculo y procesamiento de nómina | Admin, RH |
| Recibos Nómina | Consulta de recibos generados | Admin, RH |
| Incidencias | Gestión de incidencias | Admin, RH, Manager |
| Asistencia | Control de asistencia | Admin, RH, Manager |
| Vacaciones | Gestión de vacaciones | Admin, RH, Manager |
| Prestaciones | Administración de prestaciones | Admin, RH |
| Reportes | Generación de reportes | Admin, RH |
| Config. Empresa | Configuración de empresa | Admin, RH |
| Config. Sistema | Configuración global | Admin |

### 3.2 Barra Superior
- **Selector de tema**: Alterna entre modo claro/oscuro
- **Email del usuario**: Muestra el usuario actual

### 3.3 Cambiar Tema
1. Haga clic en el icono de sol/luna en la barra superior
2. O vaya a Config. Sistema > Tema de la Interfaz
3. Seleccione: Claro, Oscuro o Sistema (automático)

---

## 4. Dashboard

### 4.1 Estadísticas Principales
El dashboard muestra:
- **Total de Empleados**: Cantidad de empleados activos
- **Nómina del Mes**: Total pagado en el mes actual
- **Asistencia**: Porcentaje de asistencia del día
- **Vacaciones**: Empleados de vacaciones

### 4.2 Gráficas
- **Distribución por Departamento**: Empleados por área
- **Tendencia de Nómina**: Gasto mensual de nómina
- **Altas y Bajas**: Movimientos de personal

---

## 5. Gestión de Empleados

### 5.1 Listar Empleados
1. Vaya a **Empleados** en el menú
2. Use la barra de búsqueda para filtrar
3. Filtre por departamento o estatus

### 5.2 Crear Nuevo Empleado
1. Haga clic en **"Nuevo Empleado"**
2. Complete los datos obligatorios:
   - Datos personales (nombre, CURP, RFC)
   - Datos laborales (fecha ingreso, salario, contrato)
   - Datos bancarios (banco, cuenta)
3. Haga clic en **"Guardar"**

### 5.3 Editar Empleado
1. Haga clic en el empleado de la lista
2. Haga clic en **"Editar"**
3. Modifique los campos necesarios
4. Haga clic en **"Guardar Cambios"**

### 5.4 Dar de Baja a un Empleado
1. Abra el detalle del empleado
2. Haga clic en **"Dar de Baja"**
3. Seleccione el motivo de baja
4. Ingrese la fecha de baja
5. Confirme la operación

---

## 6. Cálculo de Nómina

### 6.1 Proceso de Nómina

#### Paso 1: Crear Periodo
1. Vaya a **Nómina**
2. Haga clic en **"Nuevo Periodo"**
3. Seleccione tipo (quincenal/mensual) y fechas
4. Guarde el periodo

#### Paso 2: Calcular Nómina
1. Seleccione el periodo activo
2. Haga clic en **"Calcular Nómina"**
3. El sistema calculará automáticamente:
   - Días trabajados
   - Percepciones (salario, horas extra, bonos)
   - Deducciones (IMSS, ISR, INFONAVIT)
4. Revise los cálculos

#### Paso 3: Procesar Nómina
1. Verifique que los cálculos sean correctos
2. Haga clic en **"Procesar Nómina"**
3. Confirme la operación
4. El sistema generará los recibos

### 6.2 Revisar Detalles
Para cada empleado puede ver:
- Desglose de percepciones
- Desglose de deducciones
- Subsidio al empleo
- ISR retenido
- Neto a pagar

---

## 7. Recibos de Nómina (CFDI)

### 7.1 Generar Recibos
1. Vaya a **Recibos Nómina**
2. Seleccione el periodo
3. Haga clic en **"Generar CFDI"**
4. Los recibos se generarán automáticamente

### 7.2 Timbrar Recibos
1. Seleccione los recibos a timbrar
2. Haga clic en **"Timbrar Seleccionados"**
3. El sistema enviará al PAC para timbrado
4. Una vez timbrados, mostrará el UUID

### 7.3 Descargar Recibos
- **PDF**: Haga clic en el icono de PDF
- **XML**: Haga clic en el icono de XML
- **Descarga masiva**: Seleccione varios y use "Descargar ZIP"

### 7.4 Enviar por Correo
1. Seleccione el recibo
2. Haga clic en **"Enviar por Email"**
3. El recibo se enviará al correo del empleado

---

## 8. Incidencias

### 8.1 Registrar Incidencia
1. Vaya a **Incidencias**
2. Haga clic en **"Nueva Incidencia"**
3. Seleccione:
   - Empleado
   - Tipo (falta, retardo, permiso, incapacidad)
   - Fechas
   - Descripción
4. Adjunte documentos si aplica
5. Guarde la incidencia

### 8.2 Tipos de Incidencias
| Tipo | Descripción | Afecta Nómina |
|------|-------------|---------------|
| Falta justificada | Con comprobante | No descuenta |
| Falta injustificada | Sin comprobante | Descuenta día |
| Retardo | Llegada tarde | Según política |
| Permiso con goce | Autorizado | No descuenta |
| Permiso sin goce | Sin pago | Descuenta día |
| Incapacidad | Por enfermedad | Subsidio IMSS |

---

## 9. Asistencia

### 9.1 Ver Asistencia del Día
1. Vaya a **Asistencia**
2. Vea el listado de empleados con:
   - Hora de entrada
   - Hora de salida
   - Estatus (a tiempo, retardo, falta)

### 9.2 Registrar Asistencia Manual
1. Busque al empleado
2. Haga clic en **"Registrar"**
3. Ingrese hora de entrada/salida
4. Guarde el registro

### 9.3 Exportar Reporte
1. Seleccione el rango de fechas
2. Haga clic en **"Exportar Excel"**
3. Descargue el archivo

---

## 10. Vacaciones

### 10.1 Consultar Días Disponibles
1. Vaya a **Vacaciones**
2. Seleccione un empleado
3. Vea los días disponibles según antigüedad

### 10.2 Solicitar Vacaciones
1. Haga clic en **"Nueva Solicitud"**
2. Seleccione empleado
3. Ingrese fechas de inicio y fin
4. Agregue comentarios si es necesario
5. Envíe la solicitud

### 10.3 Aprobar Vacaciones
1. Vea las solicitudes pendientes
2. Revise los detalles
3. Haga clic en **"Aprobar"** o **"Rechazar"**
4. Agregue comentarios si rechaza

---

## 11. Prestaciones

### 11.1 Tipos de Prestaciones
- Aguinaldo (15 días mínimo)
- Prima vacacional (25% sobre vacaciones)
- Fondo de ahorro
- Vales de despensa
- Seguro de vida

### 11.2 Configurar Prestaciones
1. Vaya a **Prestaciones**
2. Seleccione la prestación
3. Configure los parámetros
4. Asigne a empleados o grupos

---

## 12. Reportes

### 12.1 Tipos de Reportes
| Reporte | Descripción |
|---------|-------------|
| Resumen de Nómina | Total de percepciones y deducciones |
| Reporte ISN | Impuesto sobre nómina por estado |
| Reporte IMSS | Cuotas obrero-patronales |
| Reporte INFONAVIT | Descuentos por crédito |
| Listado de Empleados | Datos de empleados activos |
| Reporte de Departamento | Nómina por área |

### 12.2 Generar Reporte
1. Vaya a **Reportes**
2. Seleccione el tipo de reporte
3. Configure filtros (periodo, departamento)
4. Haga clic en **"Generar"**
5. Descargue en Excel o PDF

---

## 13. Configuración

### 13.1 Configuración de Empresa
1. Vaya a **Config. Empresa**
2. Configure:
   - Logo de la empresa
   - Colores del tema
   - Datos fiscales (RFC, Régimen)
   - Certificados digitales (CER, KEY)
   - Proveedor de timbrado (PAC)

### 13.2 Configuración del Sistema
Solo para administradores:
1. Vaya a **Config. Sistema**
2. Configure:
   - Modo multiempresa
   - Tema de la interfaz
   - Configuraciones globales

---

## 14. Mi Portal (Empleados)

### 14.1 Ver Mis Recibos
1. Vaya a **Mi Portal**
2. Vea el historial de recibos
3. Descargue PDF o XML

### 14.2 Solicitar Vacaciones
1. En Mi Portal, vaya a Vacaciones
2. Vea días disponibles
3. Solicite nuevas vacaciones

### 14.3 Ver Mi Información
1. Consulte sus datos personales
2. Vea historial de asistencia
3. Consulte prestaciones

---

## 15. Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| Ctrl + K | Búsqueda rápida |
| Esc | Cerrar modal |
| Enter | Confirmar acción |

---

## 16. Solución de Problemas

### Problema: No puedo iniciar sesión
- Verifique que su correo y contraseña sean correctos
- Use "Olvidé mi contraseña" si es necesario
- Contacte al administrador si persiste

### Problema: No veo algunos menús
- Los menús dependen de su rol asignado
- Contacte al administrador si necesita más permisos

### Problema: Error al generar CFDI
- Verifique que los certificados estén configurados
- Verifique la conexión con el PAC
- Revise que los datos del empleado estén completos

---

## 17. Contacto y Soporte

Para soporte técnico:
- **Email**: soporte@tu-empresa.com
- **Teléfono**: (55) 1234-5678
- **Horario**: Lunes a Viernes, 9:00 - 18:00

---

*Manual de Usuario v1.0*
*Última actualización: Diciembre 2024*
