# Duck Whiteboard

Whiteboard com visual **feito à mão** para desenhar diagramas de **system design**
(banco de dados, servidor, cloud, filas, load balancer, etc.) — um projeto pessoal
de estudo, construído para **treinar arquitetura de sistemas** esboçando na tela.

Serve tanto para desenhar quanto como exercício de engenharia (o próprio motor é um mini estudo de arquitetura).

## Recursos

- **Motor de desenho próprio** — SVG + rough.js (traço à mão) + perfect-freehand
  (caneta), com `seed` fixo por elemento para o traço nunca "tremer" ao mover/redimensionar.
- **Ferramentas** na lateral esquerda: seleção, mão (pan), caneta, retângulo, elipse,
  losango, linha, seta, texto e borracha.
- **Texto handwritten** com a fonte Kalam; a cor muda ao vivo enquanto você digita.
- **Formas de arquitetura** (stencils): SQL/NoSQL, servidor, nuvem, load balancer,
  CDN, firewall, API/serviço, microsserviço, fila, cache, gateway, usuário, mobile,
  storage e container — inseridas como grupos editáveis.
- **Seleção completa**: mover, redimensionar (8 alças), rotacionar, marquee, **agrupar/
  desagrupar** e **ordenar camadas** (frente/trás).
- **Borracha** com dois modos — apagar o objeto inteiro ou só a parte tocada — com
  tamanho ajustável e círculo-guia seguindo o cursor.
- **Tema claro/escuro**, **pan/zoom**, **undo/redo** e **autosave** local (`localStorage`).
- **Export** PNG/SVG/`.duck` e **idiomas** pt/en/es.
- **Presença** (placeholder) — avatar no topo, pronto para virar colaboração em tempo real.

## Stack

- Vite 8 + React 19 + TypeScript
- Motor próprio: **rough.js** + **perfect-freehand** + **Zustand** + **nanoid**
- shadcn/ui (Radix + Tailwind CSS v4)
- TanStack Router (rotas `/` e `/settings`)
- i18next + react-i18next

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção (tsc + vite build)
npm run preview  # pré-visualizar o build
npm run lint     # oxlint
```

## Estrutura

- `src/components/board/` — `Board` (SVG + controlador de pointer/teclado), `Toolbar`,
  `SelectionOverlay`, `SelectionActions` (agrupar/camadas), `TextEditor`, `PresenceBar`,
  `FloatingControls`.
- `src/components/` — `ColorControl` (painel de propriedades/borracha), `StencilPanel`,
  `AppMenu`, `DuckLogo`, `ThemeToggle`.
- `src/lib/engine/` — o motor de desenho (ver acima).
- `src/lib/stencils/` — definições das formas e inserção.
- `src/lib/{persistence,export,theme}.ts` — autosave, export/import e tema.
- `src/routes/` — `BoardPage` e `SettingsPage`.
- `src/i18n/` — configuração e traduções (pt/en/es).

## Deploy

Docker + Caddy, com três modos (standalone HTTP, HTTPS próprio ou atrás de um Traefik).
Detalhes em [`docker/README.md`](docker/README.md); o proxy central da família `duck-*`
vive no projeto `duck-enterprise-server`.
