# Manual de Usuario - Administrador del Sistema

## 1. Introducción

### 1.1 Rol de Administrador
Como administrador del sistema, tienes acceso completo a todas las funcionalidades:
- Gestión de empresas y usuarios
- Configuración global del sistema
- Acceso a todos los módulos
- Supervisión de todas las operaciones

### 1.2 Responsabilidades Clave
- Configuración inicial del sistema
- Gestión de accesos y permisos
- Configuración de certificados digitales
- Monitoreo del sistema

---

## 2. Configuración Inicial

### 2.1 Primera Configuración
1. **Acceder al sistema** con credenciales de administrador
2. **Ir a Config. Sistema** > Verificar configuración global
3. **Ir a Config. Empresa** > Configurar datos de la empresa

### 2.2 Configurar Modo Multiempresa
1. Ir a **Config. Sistema**
2. En la sección "General", localizar "MULTI COMPANY ENABLED"
3. **Activar** si gestionará múltiples empresas
4. **Desactivar** si es sistema de empresa única
5. Guardar cambios

---

## 3. Gestión de Empresas

### 3.1 Crear Nueva Empresa
1. Ir a **Empresas**
2. Clic en **"Nueva Empresa"**
3. Completar datos obligatorios:
   - Nombre comercial
   - RFC
   - Registro patronal IMSS
   - Dirección
4. Guardar

### 3.2 Configurar Certificados Digitales
1. Ir a **Config. Empresa** > pestaña **CFDI**
2. Subir archivos:
   - **Certificado (.cer)**: Archivo del SAT
   - **Llave privada (.key)**: Archivo del SAT
   - **Contraseña**: Contraseña de la llave
3. El sistema validará la vigencia
4. Guardar configuración

### 3.3 Configurar PAC (Timbrado)
1. En **Config. Empresa** > pestaña **PAC**
2. Seleccionar proveedor (Finkok, Diverza, etc.)
3. Ingresar credenciales:
   - Usuario PAC
   - Contraseña PAC
4. Seleccionar modo: Sandbox (pruebas) o Producción
5. **Probar conexión** antes de guardar

---

## 4. Gestión de Usuarios

### 4.1 Crear Usuario
1. Ir a **Usuarios**
2. Clic en **"Nuevo Usuario"**
3. Completar:
   - Nombre y apellidos
   - Correo electrónico (será el login)
   - Contraseña temporal
   - Rol asignado
   - Empresa (si aplica)
4. Guardar

### 4.2 Roles Disponibles

| Rol | Accesos |
|-----|---------|
| **admin** | Acceso total al sistema |
| **company_admin** | Administrador de empresa específica |
| **rh** | Recursos Humanos (nómina, empleados) |
| **manager** | Supervisor (asistencia, vacaciones) |
| **employee** | Solo portal personal |

### 4.3 Editar/Desactivar Usuario
1. En **Usuarios**, buscar el usuario
2. Clic en el ícono de edición
3. Modificar datos o cambiar estado a "Inactivo"
4. Guardar

---

## 5. Configuración del Sistema

### 5.1 Acceso a Configuración Global
1. Ir a **Config. Sistema**
2. Solo visible para rol admin

### 5.2 Opciones Disponibles

#### General
- **MULTI_COMPANY_ENABLED**: Modo multiempresa
- **SYSTEM_NAME**: Nombre mostrado en UI
- **DEFAULT_LANGUAGE**: Idioma del sistema

#### Tema
- Seleccionar entre Claro, Oscuro o Sistema
- Afecta a todos los usuarios (preferencia personal)

### 5.3 Configuración Contable
1. Ir a **Config. Contable**
2. Configurar por pestañas:

| Pestaña | Contenido |
|---------|-----------|
| ISN | Tasas por estado |
| Fiscal | UMA, SMG, topes IMSS |
| ISR | Tablas de ISR |
| IMSS | Tasas de cuotas |
| Empresa | Config por empresa |

---

## 6. Monitoreo y Auditoría

### 6.1 Dashboard General
- Ver estadísticas de todas las empresas
- Selector de empresa para filtrar
- Métricas de nómina y empleados

### 6.2 Logs de Auditoría
Las acciones críticas se registran:
- Creación/eliminación de usuarios
- Cambios en configuración
- Procesamiento de nómina
- Timbrado de CFDI

### 6.3 Verificar Estado del Sistema
```bash
# Health check del API
curl https://tu-dominio.com/api/health
```

---

## 7. Respaldos y Recuperación

### 7.1 Respaldo de Base de Datos
1. Acceder al servidor
2. Ejecutar script de backup:
```bash
/opt/scripts/backup-db.sh
```

### 7.2 Respaldo de Certificados
- Los certificados se almacenan encriptados en BD
- Mantener copia segura de archivos originales
- Registrar fechas de vencimiento

### 7.3 Restaurar Backup
```bash
# En caso de emergencia
gunzip -c /var/backups/nomina/backup.sql.gz | psql -U nomina_user -d nomina
```

---

## 8. Resolución de Problemas

### 8.1 Usuarios No Pueden Acceder
1. Verificar que el usuario esté activo
2. Verificar que tenga empresa asignada
3. Restablecer contraseña si es necesario

### 8.2 Error en Timbrado CFDI
1. Verificar certificados no expirados
2. Verificar credenciales PAC
3. Verificar modo (sandbox vs producción)
4. Revisar logs del sistema

### 8.3 Cálculos de Nómina Incorrectos
1. Verificar tablas ISR actualizadas
2. Verificar tasas IMSS
3. Verificar configuración de empresa
4. Revisar incidencias del periodo

---

## 9. Mantenimiento Preventivo

### 9.1 Checklist Mensual
- [ ] Verificar backups automáticos
- [ ] Revisar logs de errores
- [ ] Actualizar tablas fiscales si hay cambios
- [ ] Verificar vigencia de certificados

### 9.2 Checklist Anual
- [ ] Actualizar tablas ISR (enero)
- [ ] Actualizar valor UMA
- [ ] Renovar certificados digitales
- [ ] Actualizar catálogos SAT

---

## 10. Contactos de Soporte

### Soporte Técnico Interno
- **Email**: soporte@empresa.com
- **Teléfono**: (55) 1234-5678

### Proveedores
- **PAC**: [Datos del proveedor]
- **SAT**: sat.gob.mx
- **IMSS**: imss.gob.mx

---

*Manual de Administrador v1.0*
*Última actualización: Diciembre 2024*
