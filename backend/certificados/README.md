# Certificados para Timbrado de CFDI de Nómina

## Certificados de Prueba del SAT

Para realizar pruebas de timbrado de CFDI, el SAT proporciona certificados de prueba.

### Descargar Certificados de Prueba

1. Ve a: https://www.sat.gob.mx/consultas/93215/conoce-los-archivos-de-prueba-del-receptor
2. Descarga el archivo ZIP con los certificados de prueba
3. Copia los archivos `.cer` y `.key` a este directorio

### Certificados de Prueba Disponibles

El SAT proporciona estos certificados de prueba:

| RFC | Archivos | Contraseña |
|-----|----------|------------|
| LAN7008173R5 | CSD_Pruebas_CFDI_LAN7008173R5.cer/.key | 12345678 |
| XAXX010101000 | CSD_Pruebas_CFDI_XAXX010101000.cer/.key | 12345678 |

### Estructura de Archivos

```
backend/certificados/
├── README.md (este archivo)
├── CSD_Pruebas_CFDI_LAN7008173R5.cer  # Certificado público
├── CSD_Pruebas_CFDI_LAN7008173R5.key  # Llave privada
└── .env.certificados                   # Contraseñas (no commitear)
```

---

## Configuración del Sistema

### 1. Variables de Entorno

Agrega a tu archivo `.env`:

```env
# Certificados CSD para firma de CFDI
CSD_CERTIFICATE_PATH=./certificados/CSD_Pruebas_CFDI_LAN7008173R5.cer
CSD_KEY_PATH=./certificados/CSD_Pruebas_CFDI_LAN7008173R5.key
CSD_KEY_PASSWORD=12345678

# Configuración PAC (Proveedor Autorizado de Certificación)
PAC_PROVIDER=FINKOK
PAC_MODE=sandbox
PAC_URL=https://demo-facturacion.finkok.com/servicios/soap
PAC_USER=tu_usuario_finkok
PAC_PASSWORD=tu_password_finkok
```

### 2. Configurar PAC por Empresa

En la pantalla de **Config. Empresa** puedes configurar:
- **Proveedor PAC**: FINKOK, SW_SAPIEN, FACTURAMA
- **Modo**: sandbox (pruebas) o production
- **Credenciales**: Usuario y contraseña del PAC

---

## Proceso de Timbrado de Nómina

### Paso 1: Generar XML

```bash
# API: POST /api/cfdi/generate/:payrollDetailId
curl -X POST http://localhost:3000/api/cfdi/generate/[ID_DETALLE_NOMINA] \
  -H "Authorization: Bearer [TOKEN]"
```

Esto genera el XML sin timbrar (status: PENDING).

### Paso 2: Firmar con Certificado

El sistema automáticamente:
1. Lee el certificado `.cer` y la llave `.key`
2. Genera el sello digital del CFDI
3. Inserta el número de certificado emisor

### Paso 3: Timbrar con PAC

```bash
# API: POST /api/cfdi/:cfdiId/stamp
curl -X POST http://localhost:3000/api/cfdi/[CFDI_ID]/stamp \
  -H "Authorization: Bearer [TOKEN]"
```

El PAC:
1. Valida el CFDI contra el SAT
2. Genera el UUID (folio fiscal)
3. Agrega el Timbre Fiscal Digital
4. Retorna el XML timbrado

### Paso 4: Descargar XML/PDF

```bash
# Descargar XML
GET /api/cfdi/by-detail/:payrollDetailId/xml

# Descargar PDF (si está implementado)
GET /api/cfdi/by-detail/:payrollDetailId/pdf
```

---

## Proveedores PAC Soportados

### FINKOK (Recomendado para pruebas)

1. Registro: https://www.finkok.com/
2. Sandbox gratuito para desarrollo
3. Documentación: https://wiki.finkok.com/

```env
PAC_PROVIDER=FINKOK
PAC_URL=https://demo-facturacion.finkok.com/servicios/soap/stamp
PAC_USER=usuario@ejemplo.com
PAC_PASSWORD=contraseña
```

### SW Sapien

1. Registro: https://sw.com.mx/
2. Sandbox disponible
3. API REST moderna

```env
PAC_PROVIDER=SW_SAPIEN
PAC_URL=https://services.test.sw.com.mx
PAC_USER=usuario
PAC_PASSWORD=contraseña
```

---

## Modo Desarrollo (Sin PAC Real)

Por defecto, el sistema está en **modo simulación**:

- Genera XMLs válidos estructuralmente
- Simula el timbrado con UUIDs de prueba
- No conecta con ningún PAC real

Para activar modo simulación, deja vacías las variables del PAC o usa:

```env
PAC_URL=https://api.pac-ejemplo.com
```

---

## Verificar CFDI

### En el SAT

Una vez timbrado en producción:
https://verificacfdi.facturaelectronica.sat.gob.mx/

### Datos necesarios:
- UUID (Folio Fiscal)
- RFC Emisor
- RFC Receptor
- Total

---

## Seguridad

**IMPORTANTE:**
- NUNCA commitear archivos `.cer` o `.key` al repositorio
- Agregar al `.gitignore`:
  ```
  *.cer
  *.key
  .env.certificados
  ```
- En producción, usar variables de entorno seguras
- Los certificados de producción son únicos por empresa

---

## Troubleshooting

### Error: "Certificado no válido"
- Verifica que el certificado no haya expirado
- Usa certificados CSD, no FIEL

### Error: "Contraseña incorrecta"
- La contraseña de pruebas es: `12345678`
- En producción, usa la contraseña de tu CSD

### Error: "RFC no coincide"
- El RFC del certificado debe coincidir con el RFC de la empresa emisora

### Error: "PAC no disponible"
- Verifica las credenciales del PAC
- Verifica la URL del servicio (sandbox vs producción)
