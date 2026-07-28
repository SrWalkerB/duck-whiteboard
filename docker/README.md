# Deploy

Duckboard tem uma SPA Vite servida por Caddy e, para salas colaborativas, uma API
NestJS, worker, PostgreSQL, Redis e RabbitMQ. O Caddy encaminha `/api` e
`/socket.io` internamente para a API, mantendo HTTP e WebSocket no mesmo domínio.

Três modos, escolhidos pelo `deploy.sh`:

| Modo      | Comando               | O que faz                                                        |
| --------- | --------------------- | ---------------------------------------------------------------- |
| `http`    | `./deploy.sh`         | Standalone HTTP na `HTTP_PORT` (padrão 8080). Local ou atrás de proxy externo (Cloudflare, nginx…). |
| `tls`     | `./deploy.sh tls`     | Standalone HTTPS: o próprio Caddy emite o cert (Let's Encrypt) para `APP_DOMAIN`. |
| `traefik` | `./deploy.sh traefik` | Sem publicar porta; entra na rede do Traefik e usa labels (Traefik faz roteamento + TLS). |

## Início rápido

```bash
cd docker
cp .env.example .env
# ajuste o .env conforme o modo (veja os comentários no arquivo)
./deploy.sh            # http (padrão)
```

Abra `http://SEU_SERVIDOR:8080`.

## Serviços colaborativos

O `deploy.sh` inclui `docker-compose.collaboration.yml` por padrão. Portanto,
qualquer deploy publicado sobe também PostgreSQL, Redis, RabbitMQ, a API NestJS e
o worker de snapshots. Para desligar isso deliberadamente (quadro local apenas),
defina `COLLABORATION_ENABLED=false` no `.env`.

Em desenvolvimento, suba a infraestrutura e rode o Vite separado:

```bash
cd docker
docker compose -f docker-compose.collaboration.yml up -d --build
cd ..
npm run dev
```

Para subir manualmente a mesma composição de produção:

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.collaboration.yml up -d --build
```

Antes do primeiro deploy, defina `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD` e
`CORS_ORIGIN` no `docker/.env`. Em produção, `CORS_ORIGIN` deve ser o domínio
público HTTPS do quadro. As portas da API e do painel RabbitMQ ficam restritas a
`127.0.0.1`; usuários acessam o sistema apenas pelo Caddy. Antes do primeiro uso
local fora do Docker, copie `apps/api/.env.example` para `apps/api/.env`. Execute a migration com
`npm run prisma:migrate --workspace @duckboard/api`.

## Modo tls (HTTPS próprio, sem proxy)

Para um servidor dedicado ao Duckboard, com domínio próprio:

```bash
# .env:
#   HTTP_PORT=80
#   APP_DOMAIN=board.seudominio.com
./deploy.sh tls
```

Requer o domínio apontando pro servidor (registro A) e as portas **80 e 443**
abertas. O certificado é emitido e renovado sozinho.

## Modo traefik (atrás de um Traefik existente)

Este é o modo usado com o **[`duck-enterprise-server`](../../duck-enterprise-server)**
— o proxy central (Traefik único) que serve todos os apps `duck-*`. Os padrões
do `.env` (`proxy` / `websecure` / `le`) já casam com ele.

```bash
# .env:
#   APP_DOMAIN=board.seudominio.com
#   PROXY_NETWORK=proxy          # a rede onde o Traefik vive
#   TRAEFIK_ENTRYPOINT=websecure # entrypoint HTTPS do Traefik
#   CERT_RESOLVER=le             # certresolver do Traefik
./deploy.sh traefik
```

O `deploy.sh` cria a rede `PROXY_NETWORK` se faltar — garanta que o **Traefik
também está nela**. As labels já vão no container; o Traefik descobre sozinho.

## Atrás de um Caddy que você já tem

Se o seu proxy é Caddy (em vez de Traefik), rode o Duckboard no modo `http` **sem
publicar porta** (edite o compose ou ligue-o à rede do seu Caddy) e adicione ao
Caddyfile dele:

```caddy
board.seudominio.com {
	reverse_proxy duckboard:80
}
```

## Atualizar

```bash
cd docker && git pull && ./deploy.sh [modo]
```

## Configuração (`.env`)

| Variável             | Padrão              | Modo     | O que é                                  |
| -------------------- | ------------------- | -------- | ---------------------------------------- |
| `HTTP_PORT`          | `8080`              | http/tls | Porta HTTP publicada no host.            |
| `SITE_ADDRESS`       | `:80`               | http     | O que o Caddy interno escuta.            |
| `APP_DOMAIN`         | —                   | tls/traefik | Domínio do app.                       |
| `HTTPS_PORT`         | `443`               | tls      | Porta HTTPS publicada no host.           |
| `PROXY_NETWORK`      | `proxy`             | traefik  | Rede Docker do Traefik.                  |
| `TRAEFIK_ENTRYPOINT` | `websecure`         | traefik  | Entrypoint HTTPS do Traefik.             |
| `CERT_RESOLVER`      | `le`                | traefik  | Certresolver do Traefik.                 |
| `IMAGE`              | `duck-whiteboard:latest` | todos | Nome/tag da imagem.                  |
| `CONTAINER_NAME`     | `duckboard`         | todos    | Nome do container.                       |
| `COLLABORATION_ENABLED` | `true`            | todos    | Sobe API, worker e infraestrutura de salas. |
| `POSTGRES_PASSWORD` / `RABBITMQ_PASSWORD` | — | todos | Senhas obrigatórias dos serviços internos. |
| `CORS_ORIGIN`        | localhost Vite      | todos    | Domínio permitido para API e WebSocket.   |

## Comandos úteis

```bash
docker compose logs -f   # logs
docker compose ps        # status
docker compose down      # parar
```
