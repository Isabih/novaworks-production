#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/install-novaworks.sh"
  exit 1
fi

APP_DIR="${APP_DIR:-/var/www/novaworks}"
APP_USER="${APP_USER:-novaworks}"
DB_NAME="${DB_NAME:-novaworks}"
DB_USER="${DB_USER:-novaworks}"
DB_PASSWORD="${DB_PASSWORD:-}"
IT_EMAIL="${IT_EMAIL:-it@novaworks.rw}"
IT_NAME="${IT_NAME:-NOVAWORKS IT}"
IT_PASSWORD="${IT_PASSWORD:-}"

if [[ -z "$DB_PASSWORD" ]]; then
  DB_PASSWORD="$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-24)"
fi
if [[ -z "$IT_PASSWORD" ]]; then
  IT_PASSWORD="Nova!$(openssl rand -hex 6)A9"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl ca-certificates gnupg nginx mysql-server openssl build-essential

if ! command -v node >/dev/null 2>&1 || [[ $(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0) -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$APP_DIR"
cp -a . "$APP_DIR"/
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

sed "s/^CREATE DATABASE IF NOT EXISTS novaworks/CREATE DATABASE IF NOT EXISTS ${DB_NAME}/; s/^USE novaworks;/USE ${DB_NAME};/" "$APP_DIR/mysql/schema.sql" | mysql

sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm install && npm run build"
DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" IT_EMAIL="$IT_EMAIL" IT_NAME="$IT_NAME" IT_PASSWORD="$IT_PASSWORD" sudo -E -u "$APP_USER" node "$APP_DIR/scripts/create-it-user.mjs"

if [[ ! -f "$APP_DIR/.env.production" ]]; then
  cp "$APP_DIR/.env.mysql.example" "$APP_DIR/.env.production"
  sed -i "s/^DB_NAME=.*/DB_NAME=${DB_NAME}/; s/^DB_USER=.*/DB_USER=${DB_USER}/; s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" "$APP_DIR/.env.production"
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env.production"
  chmod 600 "$APP_DIR/.env.production"
fi

cat >/etc/systemd/system/novaworks.service <<UNIT
[Unit]
Description=Novaworks TanStack Start
After=network.target mysql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

cat >/etc/nginx/sites-available/novaworks <<'NGINX'
server {
  listen 80;
  server_name _;
  client_max_body_size 25M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX
ln -sf /etc/nginx/sites-available/novaworks /etc/nginx/sites-enabled/novaworks
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now mysql nginx
systemctl daemon-reload
systemctl enable --now novaworks

cat <<OUT
Novaworks base dependencies and MySQL schema installed.
Database: ${DB_NAME}
DB user: ${DB_USER}
Generated DB password: ${DB_PASSWORD}
Environment file: ${APP_DIR}/.env.production

Initial IT login: ${IT_EMAIL}
Initial IT password: ${IT_PASSWORD}
Change this password after the first login.

IMPORTANT: Edit .env.production and add NIDA, SMS, R2, Resend and AI credentials.
Then restart with: sudo systemctl restart novaworks
OUT
