# Pokemon Team Viewer MCP

## Commands

```bash
npm run build        # type-check + vite bundle + tsc server types → dist/
npm run dev          # watch mode: rebuilds UI + restarts server on changes
npm run serve:stdio  # run server in stdio mode (used by Claude Desktop)
```

After any change to `server.ts` or `src/`, run `npm run build` before testing in Claude Desktop (the stdio server is launched from `dist/` or source via `tsx`, but the UI bundle in `dist/mcp-app.html` must be rebuilt).

## Architecture

Two-part MCP App: a **tool** the model calls, and a **resource** that serves the bundled HTML UI. Both are registered in `server.ts`. The host links them via `_meta.ui.resourceUri` on the tool registration.

```
server.ts
├── registerAppTool("view-pokemon-team")   ← model calls this with team text
│     _meta.ui.resourceUri → "ui://view-pokemon-team/mcp-app.html"
└── registerAppResource("ui://...")        ← host fetches this, renders in iframe
      serves dist/mcp-app.html
```

The tool handler parses the Showdown text, enriches it with types + sprite info, and returns `TeamData` in `_meta.teamData`. The UI receives this via `app.ontoolresult`.

## Key non-obvious things

### CSP
The CSP config goes in the `contents[]` objects returned by the resource read callback — **not** in `registerAppResource()`'s config arg. Use `resourceDomains` (not `"img-src"`):

```typescript
contents: [{ uri, mimeType, text: html, _meta: { ui: { csp: { resourceDomains: ["https://play.pokemonshowdown.com"] } } } }]
```

### Item sprites
PS does **not** serve item icons as individual PNGs for most items. They come from a single sprite sheet (`itemicons-sheet.png`) indexed by `spritenum` from `play.pokemonshowdown.com/data/items.js`. The server fetches and caches this map on first use; the client renders a 24×24 div with `background-position: -(spriteNum % 16 * 24)px -(floor(spriteNum / 16) * 24)px`.

PS item IDs are lowercase alphanumeric with no separators — `item.toLowerCase().replace(/[^a-z0-9]/g, "")` — e.g. "Assault Vest" → `"assaultvest"`.

### PokéAPI type lookups
Two failure modes require fallbacks:
1. **Form-name mismatches** (Showdown's `ogerpon-wellspring` ≠ PokéAPI's `ogerpon-wellspring-mask`): retry by stripping the last hyphen segment until a `/pokemon/{id}` hit is found.
2. **No bare-species entry** (Landorus, Tornadus, Deoxys, Giratina, Urshifu, etc.): `/pokemon/landorus` 404s; fall back to `/pokemon-species/landorus` → get default variety name → fetch that.

### Claude Desktop config
The server runs as a stdio subprocess. The entry point must be an **absolute path** — relative paths resolve against `/`, not the project dir:

```json
{
  "mcpServers": {
    "pokemon-team-viewer-mcp": {
      "command": "/Users/kirk/code/pokemon-team-viewer-mcp/node_modules/.bin/tsx",
      "args": ["/Users/kirk/code/pokemon-team-viewer-mcp/main.ts", "--stdio"]
    }
  }
}
```
