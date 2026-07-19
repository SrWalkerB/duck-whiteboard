# Deploy

Duckboard é uma SPA estática (Vite). O `Dockerfile` faz o build e um **Caddy
interno** serve os arquivos (fallback de SPA, gzip e cache de assets). O container
é **proxy-agnóstico**: rode sozinho ou atrás de qualquer proxy.

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

```bash
# .env:
#   APP_DOMAIN=board.seudominio.com
#   PROXY_NETWORK=proxy          # a rede onde o seu Traefik vive
#   TRAEFIK_ENTRYPOINT=websecure # entrypoint HTTPS do seu Traefik
#   CERT_RESOLVER=le             # certresolver configurado no seu Traefik
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

## Comandos úteis

```bash
docker compose logs -f   # logs
docker compose ps        # status
docker compose down      # parar
```
