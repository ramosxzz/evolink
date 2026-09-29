#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/../.." && pwd)"

# Endereço do servidor e caminho da chave ficam fora do git.
if [[ -f "$script_dir/deploy.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$script_dir/deploy.env"
  set +a
fi

remote_host="${EVOLINK_REMOTE_HOST:?Defina EVOLINK_REMOTE_HOST em .deploy/hostinger/deploy.env (veja deploy.env.example)}"
remote_dir="${EVOLINK_REMOTE_DIR:-/opt/evolink}"
ssh_key="${EVOLINK_SSH_KEY:-$HOME/.ssh/evolink_hostinger_ed25519}"
known_hosts="${EVOLINK_KNOWN_HOSTS:-$HOME/.ssh/known_hosts}"
public_url="${EVOLINK_PUBLIC_URL:-https://evolink.solairew.com.br}"

if [[ ! -f "$ssh_key" ]]; then
  echo "Chave SSH não encontrada: $ssh_key" >&2
  exit 1
fi

ssh_opts="-F /dev/null -i $ssh_key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$known_hosts"

cd "$project_dir"

echo "Enviando o projeto para $remote_host:$remote_dir..."
# Sem --delete: o .env do servidor e arquivos gerados lá são preservados.
rsync -az \
  --exclude .git \
  --exclude node_modules \
  --exclude .next \
  --exclude .open-next \
  --exclude .wrangler \
  --exclude '.env*' \
  --exclude '*.tsbuildinfo' \
  --exclude supabase/.temp \
  --exclude .deploy \
  --exclude docs \
  -e "ssh $ssh_opts" \
  ./ "$remote_host:$remote_dir/"

echo "Reconstruindo o container de produção..."
# shellcheck disable=SC2086
ssh $ssh_opts "$remote_host" "REMOTE_DIR='$remote_dir' bash -s" <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"
docker compose -f compose.production.yml up -d --build evolink

health=""
for _ in $(seq 1 40); do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' evolink-app 2>/dev/null || true)"
  printf 'Estado do app: %s\n' "${health:-iniciando}"
  [[ "$health" == "healthy" ]] && break
  sleep 3
done

if [[ "$health" != "healthy" ]]; then
  docker logs --tail 120 evolink-app
  exit 1
fi

docker compose -f compose.production.yml ps
REMOTE

echo "Validando o domínio público..."
status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$public_url/login")"
if [[ "$status" != "200" ]]; then
  echo "O domínio respondeu HTTP $status" >&2
  exit 1
fi

echo "Evolink publicado e saudável em $public_url"
