-- CreateTable: Catálogo de PACs Autorizados
CREATE TABLE "pac_providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "sandbox_stamp_url" TEXT,
    "sandbox_cancel_url" TEXT,
    "production_stamp_url" TEXT,
    "production_cancel_url" TEXT,
    "integration_type" TEXT NOT NULL DEFAULT 'SOAP',
    "documentation_url" TEXT,
    "required_fields" JSONB NOT NULL DEFAULT '["user", "password"]',
    "supports_stamping" BOOLEAN NOT NULL DEFAULT true,
    "supports_cancellation" BOOLEAN NOT NULL DEFAULT true,
    "supports_query_status" BOOLEAN NOT NULL DEFAULT false,
    "supports_recovery" BOOLEAN NOT NULL DEFAULT false,
    "is_official" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_implemented" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "logo_url" TEXT,
    "website_url" TEXT,
    "support_email" TEXT,
    "support_phone" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pac_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Configuración de PAC por empresa
CREATE TABLE "company_pac_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "pac_provider_id" TEXT NOT NULL,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "last_tested_at" TIMESTAMP(3),
    "test_status" TEXT,
    "test_message" TEXT,
    "configured_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pac_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pac_providers_code_key" ON "pac_providers"("code");

-- CreateIndex
CREATE INDEX "company_pac_configs_company_id_idx" ON "company_pac_configs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_pac_configs_company_id_pac_provider_id_key" ON "company_pac_configs"("company_id", "pac_provider_id");

-- AddForeignKey
ALTER TABLE "company_pac_configs" ADD CONSTRAINT "company_pac_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_pac_configs" ADD CONSTRAINT "company_pac_configs_pac_provider_id_fkey" FOREIGN KEY ("pac_provider_id") REFERENCES "pac_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- INSERTAR CATÁLOGO DE PACs AUTORIZADOS SAT
-- Lista actualizada al 30/12/2025
-- ============================================

-- PAC de desarrollo/sandbox interno
INSERT INTO "pac_providers" ("id", "code", "name", "legal_name", "integration_type", "is_official", "is_implemented", "is_featured", "sort_order", "notes", "updated_at")
VALUES (
    gen_random_uuid(),
    'SANDBOX',
    'Sandbox (Desarrollo)',
    'Modo de desarrollo interno',
    'INTERNAL',
    false,
    true,
    true,
    1,
    'PAC simulado para desarrollo y pruebas. No genera CFDIs válidos ante el SAT.',
    CURRENT_TIMESTAMP
);

-- PACs con implementación conocida (FINKOK y SW)
INSERT INTO "pac_providers" ("id", "code", "name", "legal_name", "sandbox_stamp_url", "production_stamp_url", "sandbox_cancel_url", "production_cancel_url", "integration_type", "documentation_url", "is_official", "is_implemented", "is_featured", "sort_order", "website_url", "updated_at")
VALUES (
    gen_random_uuid(),
    'FINKOK',
    'Finkok',
    'Pegaso Tecnología, S.A. de C.V.',
    'https://demo-facturacion.finkok.com/servicios/soap/stamp',
    'https://facturacion.finkok.com/servicios/soap/stamp',
    'https://demo-facturacion.finkok.com/servicios/soap/cancel',
    'https://facturacion.finkok.com/servicios/soap/cancel',
    'SOAP',
    'https://wiki.finkok.com/',
    true,
    true,
    true,
    2,
    'https://www.finkok.com',
    CURRENT_TIMESTAMP
);

INSERT INTO "pac_providers" ("id", "code", "name", "legal_name", "sandbox_stamp_url", "production_stamp_url", "sandbox_cancel_url", "production_cancel_url", "integration_type", "documentation_url", "is_official", "is_implemented", "is_featured", "sort_order", "website_url", "updated_at")
VALUES (
    gen_random_uuid(),
    'SW_SAPIEN',
    'SW sapien',
    'Solución Integral de Facturación Electrónica e Informática SIFEI, S.A. de C.V.',
    'https://services.test.sw.com.mx/cfdi33/stamp/v4',
    'https://services.sw.com.mx/cfdi33/stamp/v4',
    'https://services.test.sw.com.mx/cfdi33/cancel',
    'https://services.sw.com.mx/cfdi33/cancel',
    'REST',
    'https://developers.sw.com.mx/',
    true,
    true,
    true,
    3,
    'https://sw.com.mx',
    CURRENT_TIMESTAMP
);

-- Lista completa de PACs autorizados SAT (ordenados alfabéticamente por nombre comercial)
INSERT INTO "pac_providers" ("id", "code", "name", "legal_name", "is_official", "is_implemented", "sort_order", "updated_at")
VALUES
    (gen_random_uuid(), 'DIGIBOX', 'Digibox', 'Digibox, S.A. de C.V.', true, false, 10, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'AKVAL', 'AKVAL', 'AKVAL Servicios de Facturación Electrónica, S.A. de C.V.', true, false, 11, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FACTURAGEPP', 'Facturagepp', 'Servicios Administrativos Suma, S. de R.L. de C.V.', true, false, 12, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'EDICOM', 'Edicom', 'Edicomunicaciones México, S.A. de C.V.', true, false, 13, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'DIVERZA', 'Diverza', 'Soluciones de Negocio FNX, S.A. de C.V.', true, false, 14, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TRALIX', 'Tralix', 'Tralix México, S. de R.L. de C.V.', true, false, 15, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'ATEB', 'ATEB', 'ATEB Servicios, S.A. de C.V.', true, false, 16, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SOLUPAC', 'SOLUPAC', 'Teléfonos de México, S.A.B. de C.V.', true, false, 17, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CONTPAQI', 'CONTPAQi', 'Másfacturación, S. de R.L. de C.V.', true, false, 18, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SOLUCION_FACTIBLE', 'Solución Factible', 'SFERP, S.C.', true, false, 19, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'KONESH', 'Konesh Soluciones', 'Aurorian, S.A. de C.V.', true, false, 20, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'INTERFACTURA', 'INTERFACTURA', 'Interfactura, S.A.P.I. de C.V.', true, false, 21, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'MASFACTURA', 'Masfactura', 'Masteredí, S.A. de C.V.', true, false, 22, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COMERCIO_DIGITAL', 'Comercio Digital', 'Sistemas de Comercio Digital, S. de R.L. de C.V.', true, false, 23, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'EMITE', 'Emite - Soluciones Fiscales Digitales', 'Emite Facturación, S.A. de C.V.', true, false, 24, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'INVOICEONE', 'InvoiceOne', 'Sistemas de Emisión Digital, S.A. de C.V.', true, false, 25, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'DIGITAL_FACTURA', 'Digital Factura', 'Impresos de Caber, S.A. de C.V.', true, false, 26, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SIFEI', 'Sifei', 'Solución Integral de Facturación Electrónica e Informática SIFEI, S.A. de C.V.', true, false, 27, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'NT_LINK', 'NT Link Comunicaciones', 'NT Link Comunicaciones, S.A. de C.V.', true, false, 28, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FACTURA_FACILMENTE', 'Factura Fácilmente.com', 'Factura Fácilmente de México, S.A. de C.V.', true, false, 29, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CERTUS_FACTURE_HOY', 'CertusFactureHoy.com', 'Certus Aplicaciones Digitales, S.A. de C.V.', true, false, 30, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FACTUREYA', 'FactureYa', 'Servicios Tecnológicos Avanzados en Facturación, S.A. de C.V.', true, false, 31, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'MISC_FOLIOS', 'MISC- FOLIOS (EDX-PAC)', 'Servicios Tecnológicos, S.A.P.I. de C.V.', true, false, 32, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'B1SOFT', 'B1SOFT Latinoamérica', 'Servicios Tecnológicos B1 Soft, S.A. de C.V.', true, false, 33, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'ESTELA', 'ESTELA', 'Servicio y Soporte en Tecnología Informática, S.A. de C.V.', true, false, 34, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SOVOS', 'Sovos', 'Advantage Security, S. de R.L. de C.V.', true, false, 35, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FACTURIZATE', 'Facturizate - EDC Invoice', 'Carvajal Tecnología y Servicios, S.A. de C.V.', true, false, 36, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'MYSUITE', 'MYSuite', 'Mysuite Services, S.A. de C.V.', true, false, 37, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FORMAS_DIGITALES', 'Formas Digitales', 'Formas Continuas de Guadalajara, S.A. de C.V.', true, false, 38, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'QUADRUM', 'Quadrum', 'Centro de Validación Digital CVDSA, S.A. de C.V.', true, false, 39, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'STOFACTURA', 'STOFactura', 'Servicios, Tecnología y Organización, S.A. de C.V.', true, false, 40, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'EDIFACTMX', 'EdiFactMx', 'EDIFACTMX, S.A. de C.V.', true, false, 41, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'ECODEX', 'E CODEX', 'Desarrollo Corporativo de Negocios en Tecnología de la Información, S.A. de C.V.', true, false, 42, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FACTURADOR_ELECTRONICO', 'Facturadorelectronico.com', 'Dot Net Desarrollo de Sistemas, S.A. de C.V.', true, false, 43, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TSYS', 'TSYS', 'Total System Services de México, S.A. de C.V.', true, false, 44, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CECOBAN', 'CECOBAN', 'Cecoban, S.A. de C.V.', true, false, 45, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SIIGO_ASPEL', 'Siigo Aspel', 'Total Solutions Provider, S.A. de C.V.', true, false, 46, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CERTIFAC', 'Certifac', 'CER - Consultoría y Respuesta Estratégica, S.A. de C.V.', true, false, 47, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LUNA_SOFT', 'Luna Soft', 'Luna Soft, S.A. de C.V.', true, false, 48, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FABRICA_JABON', 'Fábrica de Jabón la Corona', 'FAbrica de Jabón La Corona, S.A. de C.V.', true, false, 49, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PRODIGIA', 'PRODIGIA', 'Prodigia Procesos Digitales Administrativos, S.A. de C.V.', true, false, 50, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PRODITMA', 'PRODITMA', 'PRODITMA, S.A. de C.V.', true, false, 51, CURRENT_TIMESTAMP),
    (gen_random_uuid(), '4G_FACTOR', '4G FACTOR SA DE CV', '4G Factor, S.A. de C.V.', true, false, 52, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'FACTRONICA', 'Factrónica', 'Factrónica, S. de R.L. de C.V.', true, false, 53, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'DETECNO', 'DETECNO', 'DETECNO, S.A. de C.V.', true, false, 54, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'EXPIDETUFACTURA', 'ExpidetuFactura', 'CPA Control de Comprobantes Digitales, S. de R.L. de C.V.', true, false, 55, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'DIGIFACT', 'DigiFact (Teledesic)', 'Teledesic Broadband Networks, S.A. de C.V.', true, false, 56, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'E_FACTURA', 'e-factura.net', 'Sociedad de Explotación de Redes Electrónicas y Servs. de México, S.A. de C.V.', true, false, 57, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIMBOX', 'Timbox', 'IT &SW Development Solutions de México, S. de R.L. de C.V.', true, false, 58, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TURBOPAC', 'TurboPac', 'Qrea-t Solutions, S.A. de C.V.', true, false, 59, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CERTIFICACION_CFDI', 'Certificación CFDI', 'Certificación CFDI, S.A.P.I. de C.V.', true, false, 60, CURRENT_TIMESTAMP);
