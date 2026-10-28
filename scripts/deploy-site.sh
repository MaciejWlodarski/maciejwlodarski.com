#!/usr/bin/env bash
set -euo pipefail
umask 077

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
site_dir=/var/www/maciejwlodarski.com
backup_root=/var/backups/maciejwlodarski.com

if [[ $(git -C "$repo_dir" rev-parse --show-toplevel) != "$repo_dir" ]]; then
  echo "Run this script from a checkout of maciejwlodarski.com." >&2
  exit 1
fi
cd "$repo_dir"

# The wrapper locks before pulling. Reuse its inherited descriptor, or acquire
# the same lock here when this script is run directly on the server.
lock_file=$(git rev-parse --git-path deploy-site.lock)
case ${1:-} in
  --lock-held)
    if [[ ! /proc/self/fd/9 -ef "$lock_file" ]]; then
      echo "Expected the deployment lock on descriptor 9." >&2
      exit 1
    fi
    ;;
  "") exec 9>"$lock_file" ;;
  *) echo "Unknown argument: $1" >&2; exit 2 ;;
esac
if ! flock -n 9; then
  echo "Another deployment is running." >&2
  exit 1
fi
revision=$(git rev-parse HEAD)
if ! sudo -n true; then
  echo "Passwordless sudo is required for deployment." >&2
  exit 1
fi

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/maciejwlodarski-build.XXXXXXXX")
backup_dir=
restore=0
cleanup() {
  local status=$?
  trap - EXIT
  if (( restore )); then
    echo "Deployment failed; restoring previous files from $backup_dir." >&2
    if ! sudo -n rsync -a --delete -- "$backup_dir/" "$site_dir/"; then
      echo "Automatic restore failed. The backup remains at $backup_dir." >&2
    fi
  fi
  rm -rf -- "$work_dir"
  exit "$status"
}
trap cleanup EXIT

git archive "$revision" web | tar -x -C "$work_dir"
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "$work_dir/web:/app" \
  -w /app \
  node:24-alpine \
  sh -c 'npm ci --no-audit --no-fund && npm run typecheck && npm run build'

output_dir=$work_dir/web/dist/client
for page in index.html en/index.html 404.html en/404.html; do
  if [[ ! -s "$output_dir/$page" ]]; then
    echo "Build is missing $page; the live site was not changed." >&2
    exit 1
  fi
done

if ! sudo -n test -d "$site_dir" || sudo -n test -L "$site_dir"; then
  echo "Expected an existing non-symlink directory at $site_dir; stopping." >&2
  exit 1
fi

# Keep a dated server-side snapshot; do not delete it automatically. Backups are
# outside the web root and independent of the build working directory.
sudo -n install -d -m 0750 "$backup_root"
backup_dir=$(sudo -n mktemp -d "$backup_root/before-$(date -u +%Y%m%dT%H%M%SZ).XXXXXXXX")
sudo -n rsync -a -- "$site_dir/" "$backup_dir/"

# A failed build never reaches this point. rsync stages updated files before
# replacing them; if publication fails, the exit handler restores the snapshot.
# Keep ACME challenge files if they exist in the web root.
restore=1
sudo -n rsync -a --delay-updates --delete-delay --exclude='/.well-known/' \
  --chown=root:root --chmod=D755,F644 -- "$output_dir/" "$site_dir/"
restore=0
echo "Deployed $revision. Backup: $backup_dir"
