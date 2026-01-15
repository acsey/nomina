# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install --legacy-peer-deps

# Copiar código fuente
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Build de la aplicación
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install required packages:
# - netcat-openbsd: for TCP connection checks in entrypoint
# - wget: for healthcheck
# - curl: alternative for healthcheck and debugging
RUN apk add --no-cache netcat-openbsd wget curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy build artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Copy and configure entrypoint (to /app for consistency)
COPY --chown=nestjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create storage directory with proper permissions
RUN mkdir -p /app/storage && chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose API port
EXPOSE 3000

# Health check using wget (installed above)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Entrypoint with absolute path
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command (backend API)
CMD ["node", "dist/main.js"]
