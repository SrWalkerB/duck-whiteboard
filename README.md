# Duck Whiteboard

Whiteboard estilo Excalidraw com formas de arquitetura de sistemas (banco de dados,
servidor, cloud, filas, etc.), tema claro/escuro, import/export e interface multi-idioma.

Construído sobre a biblioteca oficial [`@excalidraw/excalidraw`](https://github.com/excalidraw/excalidraw)
— desenho à mão livre, texto handwritten, seleção e o editor completo — com uma casca
própria em Vite + React + TypeScript.

## Recursos

- **Desenho à mão livre e texto handwritten** (via Excalidraw).
- **Painel de formas de arquitetura** (stencils): banco de dados (SQL/NoSQL), servidor,
  nuvem, load balancer, API/serviço, microsserviço, fila, cache, usuário, storage e
  container. Cada forma é inserida como um grupo editável de primitivas.
- **Tema claro/escuro**, sincronizado entre a UI própria e o editor.
- **Autosave** local (`localStorage`) — o quadro volta ao recarregar.
- **Import/Export**: arquivo `.excalidraw`, e exportação de imagem **PNG** e **SVG**.
- **Idiomas**: Português (padrão), Inglês e Espanhol — traduz a UI própria e o editor.

## Stack

- Vite + React 19 + TypeScript
- `@excalidraw/excalidraw` (motor de desenho)
- shadcn/ui (Radix + Tailwind CSS v4)
- TanStack Router (rotas `/` e `/settings`)
- i18next + react-i18next

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção (tsc + vite build)
npm run preview  # pré-visualizar o build
```

## Estrutura

- `src/components/Whiteboard.tsx` — monta o `<Excalidraw />` (tema, idioma, autosave).
- `src/components/StencilPanel.tsx` — painel lateral de formas de arquitetura.
- `src/components/AppMenu.tsx` — menu de export/import e acesso às configurações.
- `src/lib/stencils/` — definições das formas (`definitions.ts`) e inserção (`insert.ts`).
- `src/lib/persistence.ts` — autosave/load no `localStorage`.
- `src/lib/export.ts` — export PNG/SVG/`.excalidraw` e import.
- `src/lib/theme.tsx` — contexto de tema claro/escuro.
- `src/i18n/` — configuração e traduções (pt/en/es).
- `src/routes/` — páginas do quadro e de configurações.
