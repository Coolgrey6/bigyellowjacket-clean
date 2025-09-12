#!/bin/bash

# Big Yellow Jacket Deployment Script for DreamHost
# This script prepares and deploys the application to DreamHost

echo "🚀 Starting Big Yellow Jacket deployment to DreamHost..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DREAMHOST_USER="dh_i8shjm"
DREAMHOST_HOST="bigyellowjacket.com"
DREAMHOST_PATH="/home/your_usdh_i8shjm
ername/bigyellowjacket"
FRONTEND_DOMAIN="bigyellowjacket.com"
BACKEND_DOMAIN="api.bigyellowjacket.com"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  DreamHost User: $DREAMHOST_USER"
echo "  DreamHost Host: $DREAMHOST_HOST"
echo "  Deployment Path: $DREAMHOST_PATH"
echo "  Frontend Domain: $FRONTEND_DOMAIN"
echo "  Backend Domain: $BACKEND_DOMAIN"
echo ""

# Step 1: Build Frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
cd frontend/bigyellowjacket-ui
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Step 2: Prepare backend
echo -e "${YELLOW}🐍 Preparing backend...${NC}"
cd ../../server

# Create production requirements
echo "Creating production requirements..."
cat > requirements-prod.txt << EOF
asyncio==3.4.3
aiohttp==3.12.14
aiofiles==24.1.0
psutil==7.0.0
websockets==15.0.1
cryptography==45.0.5
pydantic==2.11.7
rich==14.0.0
colorama==0.4.6
python-dateutil==2.9.0.post0
gunicorn==21.2.0
EOF

# Create production configuration
echo "Creating production configuration..."
cat > config/settings-prod.py << EOF
from pathlib import Path
from dataclasses import dataclass

@dataclass
class ServerConfig:
    HOST: str = "0.0.0.0"
    PORT: int = 8766
    SERVER_HOST = "0.0.0.0"
    SERVER_PORT = 8766
    DEBUG: bool = False
    SSL_ENABLED: bool = True
    MAX_CONNECTIONS: int = 1000
    SCAN_INTERVAL: float = 2.0
    WORKERS: int = 4
    PING_INTERVAL: int = 30
    PING_TIMEOUT: int = 120
    MAX_MESSAGE_SIZE: int = 2**23

@dataclass
class MonitoringConfig:
    ENABLE_CONSOLE: bool = False
    ENABLE_LOGGING: bool = True
    LOG_LEVEL: str = "INFO"
    SAVE_CONNECTIONS: bool = True
    SAVE_METRICS: bool = True
    METRICS_INTERVAL: float = 5.0

@dataclass
class LoggingConfig:
    LEVEL: str = "INFO"
    FORMAT: str = "%(asctime)s [%(levelname)s] %(message)s"
    FILE: str = "logs/bigyellowjacket.log"
    MAX_SIZE: int = 10 * 1024 * 1024
    BACKUP_COUNT: int = 5
    ACCESS_LOG: str = "logs/access.log"

@dataclass
class SecurityConfig:
    CERT_FILE: str = "certs/server.crt"
    KEY_FILE: str = "certs/server.key"
    BLOCKED_IPS_FILE: str = "data/blocked_ips.txt"
    KNOWN_MALICIOUS_PORTS: set = None
    SSL_PROTOCOL: str = "TLS"
    MIN_TLS_VERSION: str = "TLSv1.2"
    CIPHER_STRING: str = "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
    DHPARAM_FILE: str = "certs/dhparam.pem"
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 1000
    RATE_LIMIT_WINDOW: int = 60
    AUTH_REQUIRED: bool = False
    TOKEN_EXPIRY: int = 3600
    THREAT_INTEL_UPDATE_INTERVAL: int = 3600
    THREAT_INTEL_SOURCES: list = None
    ALERT_THRESHOLD: int = 3

    def __post_init__(self):
        self.KNOWN_MALICIOUS_PORTS = {23, 445, 135, 3389, 21, 1433}
        self.THREAT_INTEL_SOURCES = [
            "data/threat_intel/database.json",
            "data/threat_intel/malicious_ips.txt",
            "data/threat_intel/threat_patterns.json"
        ]

class Config:
    BASE_DIR = Path(__file__).parent.parent
    SERVER = ServerConfig()
    MONITORING = MonitoringConfig()
    LOGGING = LoggingConfig()
    SECURITY = SecurityConfig()

    @classmethod
    def create_directories(cls):
        directories = [
            "logs", "data", "data/alerts", "data/exports", "data/exports/backup",
            "data/reports", "data/traffic", "data/threat_intel", "certs", "data/stats"
        ]
        for directory in directories:
            Path(cls.BASE_DIR / directory).mkdir(parents=True, exist_ok=True)
EOF

echo -e "${GREEN}✅ Backend prepared successfully${NC}"

# Step 3: Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
cd ..
tar -czf bigyellowjacket-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='dist' \
    .

echo -e "${GREEN}✅ Deployment package created: bigyellowjacket-deploy.tar.gz${NC}"

# Step 4: Create deployment instructions
echo -e "${YELLOW}📝 Creating deployment instructions...${NC}"
cat > DREAMHOST_DEPLOYMENT.md << EOF
# Big Yellow Jacket - DreamHost Deployment Guide

## Prerequisites
- DreamHost account with SSH access
- Python 3.9+ installed on DreamHost
- Node.js 18+ installed on DreamHost
- SSL certificate for your domain

## Deployment Steps

### 1. Upload Files
\`\`\`bash
# Upload the deployment package
scp bigyellowjacket-deploy.tar.gz $DREAMHOST_USER@$DREAMHOST_HOST:$DREAMHOST_PATH/

# SSH into your DreamHost server
ssh $DREAMHOST_USER@$DREAMHOST_HOST

# Extract the files
cd $DREAMHOST_PATH
tar -xzf bigyellowjacket-deploy.tar.gz
\`\`\`

### 2. Set Up Backend
\`\`\`bash
cd $DREAMHOST_PATH/server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements-prod.txt

# Set up SSL certificates
mkdir -p certs
# Copy your SSL certificates to certs/server.crt and certs/server.key

# Create necessary directories
python3 -c "from config.settings_prod import Config; Config.create_directories()"

# Test the backend
python3 run.py
\`\`\`

### 3. Set Up Frontend
\`\`\`bash
cd $DREAMHOST_PATH/frontend/bigyellowjacket-ui

# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in the dist/ directory
\`\`\`

### 4. Configure Web Server
Create a virtual host configuration for your domain pointing to the dist/ directory.

### 5. Set Up Process Management
Use PM2 or similar to manage the backend process:
\`\`\`bash
# Install PM2
npm install -g pm2

# Start the backend
cd $DREAMHOST_PATH/server
pm2 start run.py --name bigyellowjacket-backend --interpreter python3

# Save PM2 configuration
pm2 save
pm2 startup
\`\`\`

## Environment Variables
Set these in your DreamHost environment:
- VITE_WS_URL=wss://$BACKEND_DOMAIN:8766
- NODE_ENV=production

## SSL Configuration
Ensure your SSL certificates are properly configured for both the frontend and backend domains.

## Monitoring
- Backend logs: $DREAMHOST_PATH/server/logs/
- PM2 status: pm2 status
- PM2 logs: pm2 logs bigyellowjacket-backend
EOF

echo -e "${GREEN}✅ Deployment instructions created: DREAMHOST_DEPLOYMENT.md${NC}"

echo -e "${BLUE}🎉 Deployment preparation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review and update the configuration in deploy.sh"
echo "2. Run: ./deploy.sh"
echo "3. Follow the instructions in DREAMHOST_DEPLOYMENT.md"
echo ""
echo -e "${GREEN}Your Big Yellow Jacket application is ready for DreamHost deployment!${NC}"
