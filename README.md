# Pokemon Team Viewer MCP

An [MCP App](https://github.com/modelcontextprotocol/ext-apps) that renders a Pokémon team from [Pokémon Showdown](https://pokemonshowdown.com/) export format. Paste a team export into Claude and ask it to display the team — you'll get a card grid with sprites, types, moves, EVs, and more.

<img width="1625" height="1504" alt="Screenshot 2026-04-06 at 2 01 25 PM" src="https://github.com/user-attachments/assets/547b9f07-9bf8-462f-b661-456a1098fabb" />

## Overview

Each Pokémon card shows:
- **Gen 5 sprite** (shiny variant when `Shiny: Yes`)
- **Type badges** with canonical type colors
- **Held item** with icon sprite
- **Ability**, **nature**, **level**, **gender**
- **EVs/IVs** with nature modifier coloring (green = boosted stat, red = lowered)
- **Move list**

The UI adapts to the host's light/dark mode and scales responsively to fit the team.

## Architecture

An MCP App has two linked parts on the same MCP server: a **tool** the LLM calls, and a **resource** that serves the UI HTML. When the host receives the tool result, it fetches the resource and renders it in an iframe.

```
┌─────────────────────────────────────────────────────────────┐
│  MCP Host (e.g. Claude Desktop)                             │
│                                                             │
│  1. LLM calls tool "view-pokemon-team" with team text       │
│  2. Host reads _meta.ui.resourceUri from tool response      │
│  3. Host fetches resource → renders HTML in iframe          │
│  4. Iframe receives tool result via postMessage             │
│  5. React UI displays the team card grid                    │
└───────────────┬─────────────────────────────────────────────┘
                │  MCP (stdio)
┌───────────────▼─────────────────────────────────────────────┐
│  MCP Server  (src/main.ts → src/server.ts)                  │
│                                                             │
│  Tool: view-pokemon-team                                    │
│    ├── Parses Showdown export text                          │
│    ├── Fetches types from PokéAPI for each Pokémon          │
│    ├── Resolves item spritenums from PS item data           │
│    └── Returns TeamData in _meta + text summary             │
│                                                             │
│  Resource: ui://view-pokemon-team/mcp-app.html              │
│    └── Serves bundled single-file HTML app (dist/)          │
└─────────────────────────────────────────────────────────────┘
```

### Data flow within the tool

```
Raw Showdown text
       │
       ▼
  parseShowdownTeam()          (src/server/parser.ts)
  ├── parseFirstLine()         → species, nickname, item, gender
  ├── "Ability: …"             → ability
  ├── "EVs: …" / "IVs: …"     → parseStats() → StatBlock
  ├── "X Nature"               → nature
  └── "- Move"                 → moves[]
       │
       ▼
  Parallel enrichment (Promise.all)
  ├── fetchTypes(species)      → GET pokeapi.co/api/v2/pokemon/{id}  (src/server/pokeapi.ts)
  │     with two-stage fallback for form-name mismatches + bare-species 404s
  ├── spriteUrl                → play.pokemonshowdown.com/sprites/gen5[‑shiny]/{id}.png
  └── itemSpriteNum            → spritenum from PS items.js, cached after first fetch
       │                          (src/server/sprites.ts)
       ▼
  CallToolResult
  ├── content[0].text          → plain-text summary (for non-UI hosts)
  └── _meta.teamData           → full TeamData for the UI
```

### File structure

```
src/
├── types.ts                    shared: StatBlock, PokemonSet, TeamData
├── main.ts                     entry point — HTTP or stdio MCP server
├── server.ts                   registerAppTool + registerAppResource
├── server/
│   ├── parser.ts               Showdown export format parser
│   ├── pokeapi.ts              PokéAPI type fetching with fallback logic
│   └── sprites.ts              sprite URL construction + item spritenum cache
├── app/
│   ├── App.tsx                 root React component + MCP lifecycle
│   ├── constants.ts            TYPE_COLORS, NATURE_EFFECTS, STAT_LABELS
│   └── components/
│       ├── TypeBadge.tsx
│       ├── EVDisplay.tsx
│       ├── PokemonCard.tsx
│       └── TeamGrid.tsx
├── mcp-app.tsx                 entry point for Vite (renders <App />)
├── global.css                  host CSS variable fallbacks, base reset
└── vite-env.d.ts
mcp-app.html                    HTML shell for Vite
vite.config.ts                  builds mcp-app.html → dist/mcp-app.html (single-file)
```

The Vite build uses [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) to inline all JS and CSS into `dist/mcp-app.html`. esbuild compiles `src/main.ts` → `dist/main.js` for the server.

## Installation

**Requirements:** Node.js 18+, npm

```bash
git clone https://github.com/kguinto/pokemon-team-viewer-mcp.git
cd pokemon-team-viewer-mcp
npm install
npm run build
```

## Development

Start the server with file watching (rebuilds UI and restarts server on changes):

```bash
npm run dev
```

The MCP server listens at `http://localhost:3001/mcp`.

To run the compiled server in stdio mode:

```bash
npm run build && npm run serve:stdio
```

### Connecting to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pokemon-team-viewer": {
      "command": "node",
      "args": ["/path/to/pokemon-team-viewer-mcp/dist/main.js", "--stdio"]
    }
  }
}
```

Run `npm run build` first, then restart Claude Desktop.

### Connecting via basic-host (local browser testing)

```bash
# Terminal 1
npm run dev

# Terminal 2 — from the cloned ext-apps repo
cd /tmp/mcp-ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm run start
# Open http://localhost:8080
```

## Testing

### Manual test

1. `npm run build && npm run serve` (or `npm run dev`)
2. Connect a host (Claude Desktop or basic-host)
3. Invoke `view-pokemon-team` with a Showdown export, e.g.:

```
Garchomp @ Choice Scarf
Ability: Rough Skin
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Outrage
- Stone Edge

Clefable @ Life Orb
Ability: Magic Guard
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
IVs: 0 Atk
- Moonblast
- Thunderbolt
- Flamethrower
- Soft-Boiled
```

**Expected result:** A card grid with sprites, type badges, item icons, and move lists for each Pokémon.

### Parser edge cases to verify

| Input format | Expected behavior |
|---|---|
| `Nickname (Species) @ Item` | Nickname shown, species shown smaller below |
| `Species` (no item, no nickname) | Just species name, no item row |
| `Shiny: Yes` | Shiny sprite variant loaded |
| `(M)` / `(F)` gender marker | ♂ / ♀ symbol next to name |
| Non-100 `Level:` | Level badge shown in type row |
| IVs less than 31 | IV values shown alongside EVs |
| Alternate-form Pokémon (Landorus-Therian, Ogerpon-Wellspring) | Types load correctly via PokéAPI fallback |
| Special-char species (Mr. Mime, Farfetch'd, Flabébé) | Types still fetched correctly |
