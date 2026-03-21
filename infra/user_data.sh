#!/bin/bash
set -euxo pipefail

# Log everything for debugging
exec > /var/log/user-data.log 2>&1

echo "=== Creating 2GB swap (t2.micro has only 1GB RAM) ==="
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

echo "=== Installing Docker ==="
dnf update -y
dnf install -y docker git
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

echo "=== Installing Docker Compose ==="
COMPOSE_VER=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
curl -L "https://github.com/docker/compose/releases/download/$${COMPOSE_VER}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

echo "=== Cloning repository ==="
cd /home/ec2-user
git clone ${REPO_URL} app
cd app

echo "=== Creating production env file ==="
cat > .env << ENVEOF
JWT_SECRET=${JWT_SECRET}
POSTGRES_PASSWORD=${DB_PASSWORD}
ENVEOF
chown ec2-user:ec2-user .env

echo "=== Creating production compose override ==="
cat > docker-compose.prod.yml << COMPEOF
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: runner
    command: ["node", "apps/web/server.js"]
    ports:
      - "80:3000"
    volumes: []
    environment:
      - NODE_ENV=production
      - INTERNAL_API_URL=http://api:8000
    depends_on:
      api:
        condition: service_healthy

  api:
    build:
      context: ./apps/api
      target: runner
    expose:
      - "8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://fintrack:${DB_PASSWORD}@db:5432/fintrack
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fintrack
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: fintrack
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fintrack -d fintrack"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
COMPEOF
chown ec2-user:ec2-user docker-compose.prod.yml

echo "=== Building and starting services ==="
docker-compose -f docker-compose.prod.yml up -d --build

echo "=== Done ==="
