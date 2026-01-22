#!/bin/bash

# ============================================
# Script para inicializar n8n con workflows
# ============================================

set -e

echo "🔧 Inicializando n8n con workflows predefinidos..."

# Colores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

# Esperar a que n8n esté listo
echo "Esperando a que n8n esté disponible..."
until curl -s http://localhost:5678/healthz > /dev/null 2>&1; do
  echo "  n8n no está listo, esperando..."
  sleep 3
done

echo -e "${GREEN}✓ n8n está disponible${NC}"

# Importar workflows usando la API de n8n
echo ""
echo "📂 Importando workflows..."

# Obtener token de autenticación (Basic Auth)
AUTH_HEADER="Authorization: Basic $(echo -n 'admin:admin123' | base64)"

# Verificar si ya existe el workflow
EXISTING=$(curl -s -H "$AUTH_HEADER" http://localhost:5678/api/v1/workflows 2>/dev/null | grep -c "HR Chatbot" || true)

if [ "$EXISTING" -gt 0 ]; then
  echo "  Workflow 'HR Chatbot' ya existe, omitiendo..."
else
  # Importar el workflow del chatbot
  if [ -f "n8n-workflows/chatbot-rrhh.json" ]; then
    echo "  Importando chatbot-rrhh.json..."
    curl -s -X POST \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d @n8n-workflows/chatbot-rrhh.json \
      http://localhost:5678/api/v1/workflows > /dev/null 2>&1 && \
      echo -e "  ${GREEN}✓ Workflow importado${NC}" || \
      echo "  ⚠ Error importando workflow (puede requerir importación manual)"
  fi
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}     ✅ n8n INICIALIZADO${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}📍 Acceso a n8n:${NC}"
echo "   URL:      http://localhost:5678"
echo "   Usuario:  admin"
echo "   Password: admin123"
echo ""
echo -e "${CYAN}📋 Pasos siguientes:${NC}"
echo "   1. Abre http://localhost:5678"
echo "   2. Ve a Settings > Credentials"
echo "   3. Agrega credencial de Anthropic (Claude API)"
echo "   4. Activa el workflow 'HR Chatbot'"
echo ""
