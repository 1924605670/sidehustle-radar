#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-ubuntu}"
APP_ROOT="${APP_ROOT:-/opt/sidehustle-radar}"
REPO_DIR="${REPO_DIR:-$APP_ROOT/repo}"
REPO_URL="${REPO_URL:-https://github.com/1924605670/sidehustle-radar.git}"
BRANCH="${BRANCH:-main}"
DB_PATH="${DB_PATH:-/var/lib/sidehustle-radar/sidehustle-radar.sqlite3}"
LOCK_FILE="/tmp/sidehustle-radar-deploy.lock"

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

log() {
  printf '[sidehustle-radar deploy] %s\n' "$*"
}

as_app_user() {
  sudo -H -u "$APP_USER" "$@"
}

install -d -o "$APP_USER" -g "$APP_USER" "$APP_ROOT" "$(dirname "$DB_PATH")"

if [ ! -d "$REPO_DIR/.git" ]; then
  log "cloning $REPO_URL"
  as_app_user git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

as_app_user git -C "$REPO_DIR" remote set-url origin "$REPO_URL" || true
old_sha="$(as_app_user git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || true)"
if ! as_app_user git -C "$REPO_DIR" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  log "remote branch $BRANCH is not available yet; skipping"
  exit 0
fi
as_app_user git -C "$REPO_DIR" fetch origin "$BRANCH"
new_sha="$(as_app_user git -C "$REPO_DIR" rev-parse "origin/$BRANCH")"

if [ "$old_sha" = "$new_sha" ] && systemctl is-active --quiet sidehustle-radar-api.service; then
  log "already up to date at $new_sha"
  exit 0
fi

log "updating from ${old_sha:-none} to $new_sha"
if [ "$old_sha" != "$new_sha" ]; then
  as_app_user git -C "$REPO_DIR" merge --ff-only "origin/$BRANCH"
fi

log "validating data and tests"
as_app_user env PYTHONPATH="$REPO_DIR" python3 "$REPO_DIR/server/seed_db.py" --check --data-dir "$REPO_DIR/data"
as_app_user env PYTHONPATH="$REPO_DIR" python3 -m unittest discover -s "$REPO_DIR/server/tests"

log "seeding sqlite database"
as_app_user env PYTHONPATH="$REPO_DIR" python3 "$REPO_DIR/server/seed_db.py" --db "$DB_PATH" --data-dir "$REPO_DIR/data"

log "restarting sidehustle-radar-api.service"
systemctl restart sidehustle-radar-api.service
log "done"
