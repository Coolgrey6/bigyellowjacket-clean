#!/bin/bash
set -euo pipefail

echo "🔥 DEPLOYING BIG YELLOW JACKET (Frontend) TO bigyellowjacket.com"
echo "==============================================================="

# Build frontend locally
echo "Building frontend..."
pushd frontend/bigyellowjacket-ui >/dev/null
npm run build
popd >/dev/null

# Package ONLY the built frontend artifacts
echo "Packaging built assets..."
rm -f frontend_dist.tar.gz
tar -czf frontend_dist.tar.gz -C frontend/bigyellowjacket-ui/dist .

echo "Uploading to DreamHost web root..."
scp frontend_dist.tar.gz dh_i8shjm@pdx1-shared-a4-08.dreamhost.com:/home/dh_i8shjm/bigyellowjacket.com/

echo "Updating site atomically on server..."
ssh dh_i8shjm@pdx1-shared-a4-08.dreamhost.com << 'EOF'
set -euo pipefail
cd /home/dh_i8shjm/bigyellowjacket.com

# Backup existing site
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p _backups/$TS
shopt -s nullglob
mv index.html assets _backups/$TS/ 2>/dev/null || true
shopt -u nullglob

# Deploy new assets
tar -xzf frontend_dist.tar.gz -C .
rm -f frontend_dist.tar.gz

echo "✅ Frontend updated at https://bigyellowjacket.com"
EOF

echo
echo "🎉 DEPLOYMENT COMPLETE (Frontend)"
echo "🌐 Visit: https://bigyellowjacket.com"
echo "ℹ️ Note: Backend/WebSocket services are managed separately."
