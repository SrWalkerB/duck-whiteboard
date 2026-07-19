#!/usr/bin/env bash
# Deploy do Duckboard. Builda a imagem e (re)sobe o container no modo escolhido.
#
# Uso:
#   ./deploy.sh            # modo http (standalone, porta HTTP_PORT)
#   ./deploy.sh http
#   ./deploy.sh tls        # HTTPS próprio (Caddy + Let's Encrypt, precisa APP_DOMAIN)
#   ./deploy.sh traefik    # atrás de um Traefik existente (precisa APP_DOMAIN)
set -euo pipefail

cd "$(dirname "$0")"
MODE="${1:-http}"

# docker compose (v2) ou docker-compose (v1).
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "Erro: Docker Compose não encontrado. Instale o Docker." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Erro: falta o .env. Rode: cp .env.example .env e ajuste." >&2
  exit 1
fi

# Seleciona os arquivos de compose conforme o modo.
case "$MODE" in
  http)    FILES=(-f docker-compose.yml) ;;
  tls)     FILES=(-f docker-compose.yml -f docker-compose.tls.yml) ;;
  traefik) FILES=(-f docker-compose.yml -f docker-compose.traefik.yml) ;;
  *) echo "Modo inválido: $MODE (use: http | tls | traefik)" >&2; exit 1 ;;
esac

# No modo traefik, garante a rede externa compartilhada.
if [ "$MODE" = "traefik" ]; then
  set -a; . ./.env; set +a
  NET="${PROXY_NETWORK:-proxy}"
  if ! docker network inspect "$NET" >/dev/null 2>&1; then
    echo "==> Criando a rede '$NET' (ligue o Traefik a ela também)."
    docker network create "$NET"
  fi
fi

echo "==> Deploy no modo '$MODE'..."
$DC "${FILES[@]}" up -d --build

docker image prune -f >/dev/null 2>&1 || true

echo "==> Status:"
$DC "${FILES[@]}" ps
echo "==> Logs:  $DC ${FILES[*]} logs -f"
