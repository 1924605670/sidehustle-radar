#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-ubuntu}"
APP_ROOT="${APP_ROOT:-/opt/sidehustle-radar}"
REPO_DIR="${REPO_DIR:-$APP_ROOT/repo}"
REPO_URL="${REPO_URL:-https://github.com/1924605670/sidehustle-radar.git}"
BRANCH="${BRANCH:-main}"
DB_PATH="${DB_PATH:-/var/lib/sidehustle-radar/sidehustle-radar.sqlite3}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-enabled/api2.hometodo.top.conf}"
API_PREFIX="${API_PREFIX:-/sidehustle-radar-api}"
API_PORT="${API_PORT:-18110}"
GIT_PROXY="${GIT_PROXY:-http://127.0.0.1:7890}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root, e.g. sudo bash deploy/install_server.sh" >&2
  exit 1
fi

install -d -o "$APP_USER" -g "$APP_USER" "$APP_ROOT" "$(dirname "$DB_PATH")" /var/log/sidehustle-radar

if [ ! -d "$REPO_DIR/.git" ]; then
  sudo -H -u "$APP_USER" env HTTPS_PROXY="$GIT_PROXY" HTTP_PROXY="$GIT_PROXY" https_proxy="$GIT_PROXY" http_proxy="$GIT_PROXY" git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

sudo -H -u "$APP_USER" env HTTPS_PROXY="$GIT_PROXY" HTTP_PROXY="$GIT_PROXY" https_proxy="$GIT_PROXY" http_proxy="$GIT_PROXY" git -C "$REPO_DIR" remote set-url origin "$REPO_URL" || true
if sudo -H -u "$APP_USER" env HTTPS_PROXY="$GIT_PROXY" HTTP_PROXY="$GIT_PROXY" https_proxy="$GIT_PROXY" http_proxy="$GIT_PROXY" git -C "$REPO_DIR" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1 && sudo -H -u "$APP_USER" env HTTPS_PROXY="$GIT_PROXY" HTTP_PROXY="$GIT_PROXY" https_proxy="$GIT_PROXY" http_proxy="$GIT_PROXY" git -C "$REPO_DIR" fetch origin "$BRANCH"; then
  sudo -H -u "$APP_USER" env HTTPS_PROXY="$GIT_PROXY" HTTP_PROXY="$GIT_PROXY" https_proxy="$GIT_PROXY" http_proxy="$GIT_PROXY" git -C "$REPO_DIR" merge --ff-only "origin/$BRANCH" || true
else
  echo "Remote branch $BRANCH is not available yet; installing current local checkout."
fi

chmod +x "$REPO_DIR/deploy/pull_deploy.sh"
cp "$REPO_DIR/deploy/sidehustle-radar-api.service" /etc/systemd/system/sidehustle-radar-api.service
cp "$REPO_DIR/deploy/sidehustle-radar-deploy.service" /etc/systemd/system/sidehustle-radar-deploy.service
cp "$REPO_DIR/deploy/sidehustle-radar-deploy.timer" /etc/systemd/system/sidehustle-radar-deploy.timer

if ! grep -q "SideHustle Radar API" "$NGINX_CONF"; then
  install -d /etc/nginx/backup-disabled
  cp "$NGINX_CONF" "/etc/nginx/backup-disabled/$(basename "$NGINX_CONF").bak.$(date +%Y%m%d%H%M%S)"
  python3 - "$NGINX_CONF" "$API_PREFIX" "$API_PORT" <<'PY'
import sys
from pathlib import Path

conf_path = Path(sys.argv[1])
api_prefix = sys.argv[2].rstrip("/")
api_port = sys.argv[3]
text = conf_path.read_text(encoding="utf-8")
snippet = f"""

    # SideHustle Radar API (isolated)
    location = {api_prefix} {{
        return 301 {api_prefix}/;
    }}

    location {api_prefix}/ {{
        proxy_pass http://127.0.0.1:{api_port}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix {api_prefix};
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_buffering off;
    }}
"""
marker = "    # SSL 配置"
if marker not in text:
    raise SystemExit(f"marker not found in {conf_path}")
text = text.replace(marker, snippet + "\n" + marker)
conf_path.write_text(text, encoding="utf-8")
PY
fi

systemctl daemon-reload
sudo -H -u "$APP_USER" env PYTHONPATH="$REPO_DIR" python3 "$REPO_DIR/server/seed_db.py" --db "$DB_PATH" --data-dir "$REPO_DIR/data"
systemctl enable --now sidehustle-radar-api.service
systemctl enable --now sidehustle-radar-deploy.timer
nginx -t
systemctl reload nginx
systemctl status sidehustle-radar-api.service --no-pager
