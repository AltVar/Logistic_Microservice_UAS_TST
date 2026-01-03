# =====================================================
#  TST LOGISTICS SERVICE - Dockerfile
#  Lightweight image for STB deployment (RAM < 40MB)
# =====================================================

# Use Alpine-based Node.js for minimal footprint
FROM node:alpine

# Set working directory
WORKDIR /app

# Copy application files
COPY server.js .
COPY data/ ./data/

# Expose the service port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3030/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run the server
CMD ["node", "server.js"]
