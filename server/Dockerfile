# Backend Dockerfile - Node.js + Python + Slither
FROM node:18-bullseye

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Slither and solc-select
RUN pip3 install --no-cache-dir slither-analyzer solc-select

# Install Solidity compiler versions
RUN solc-select install 0.8.19 && solc-select use 0.8.19
RUN solc-select install 0.8.9
RUN solc-select install 0.8.21

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p temp blockchain/contracts/fetched blockchain/scripts blockchain/artifacts

# Set permissions
RUN chmod -R 755 /app

# Set Docker environment flag
ENV DOCKER_ENV=true
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/ping', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]