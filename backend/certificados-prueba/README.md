# Certificados de Prueba SAT para Timbrado CFDI

Este directorio contiene información sobre cómo obtener y configurar los certificados de prueba del SAT para el timbrado de CFDIs de nómina.

## Certificados de Prueba del SAT

El SAT proporciona certificados de prueba (CSD - Certificado de Sello Digital) para realizar pruebas de timbrado sin efectos fiscales.

### Descarga de Certificados de Prueba

Los certificados de prueba se pueden obtener de:

1. **Portal SAT**: https://www.sat.gob.mx/consulta/46074/conoce-los-servicios-especializados-de-validacion
2. **Herramienta de Pruebas**: https://portalsat.plataforma.sat.gob.mx/

### Datos de los Certificados de Prueba

Para ambiente de pruebas (sandbox), puedes usar los siguientes datos ficticios:

**RFC de Prueba**: AAA010101AAA
**Número de Certificado**: 30001000000400002434

### Archivos Necesarios

Para el timbrado de CFDI necesitas los siguientes archivos:

1. **Certificado (.cer)**: El certificado público del sello digital
2. **Llave privada (.key)**: La llave privada asociada al certificado
3. **Contraseña**: La contraseña de la llave privada

### Configuración en el Sistema

1. Ve a **Configuración de Empresa** en el menú lateral
2. Selecciona la pestaña **Certificados CFDI**
3. Sube los archivos .cer y .key
4. Ingresa la contraseña del certificado
5. Selecciona el régimen fiscal correspondiente
6. Guarda la configuración

### Proveedores PAC para Pruebas

Los siguientes proveedores ofrecen ambientes de prueba (sandbox):

| Proveedor | URL | Documentación |
|-----------|-----|---------------|
| Finkok | https://demo.finkok.com | https://wiki.finkok.com |
| SW Sapien | https://services.test.sw.com.mx | https://developers.sw.com.mx |
| Facturama | https://api.facturama.mx | https://apisandbox.facturama.mx |

### Configuración del PAC

1. Crea una cuenta en el proveedor PAC de tu elección
2. Obtén las credenciales de acceso (usuario/API key y contraseña/secret)
3. En el sistema, ve a **Configuración de Empresa** > **Proveedor PAC**
4. Selecciona el proveedor y configura las credenciales
5. Asegúrate de seleccionar **Modo Sandbox** para pruebas

### Notas Importantes

- Los timbrados realizados en modo sandbox **NO** tienen validez fiscal
- Usa modo **Producción** solo cuando tengas certificados reales del SAT
- Los certificados de producción se obtienen en el portal del SAT con e.firma

### Ejemplo de Flujo de Timbrado

1. **Generar CFDI**: El sistema genera el XML original de la nómina
2. **Sellar**: El XML se firma con el certificado de la empresa
3. **Timbrar**: El PAC valida y agrega el timbre fiscal digital
4. **Descargar**: El usuario puede descargar el XML timbrado y el PDF

### Estructura del XML de Nómina

El sistema genera CFDI versión 4.0 con Complemento de Nómina 1.2, incluyendo:

- Datos del emisor (empresa)
- Datos del receptor (empleado)
- Conceptos (percepciones y deducciones)
- Complemento de nómina con datos específicos del período

### Contacto y Soporte

Para dudas sobre facturación electrónica:
- **SAT**: 55 627 22 728
- **Portal SAT**: https://www.sat.gob.mx
