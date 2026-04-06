# Pokemon Team Viewer

An [MCP App](https://github.com/modelcontextprotocol/ext-apps) that renders a Pokémon team from [Pokémon Showdown](https://pokemonshowdown.com/) export format. Paste a team export into Claude and ask it to display the team — you'll get a card grid with sprites, types, moves, EVs, and more.

## Overview

Each Pokémon card shows:
- **Gen 5 sprite** (shiny variant when `Shiny: Yes`)
- **Type badges** with canonical type colors
- **Held item** with icon sprite
- **Ability**, **nature**, **level**, **gender**
- **EVs/IVs** with nature modifier coloring (green = boosted stat, red = lowered)
- **Move list**

The UI adapts to the host's light/dark mode and scales responsively to fit however many Pokémon are in the team (up to 6).

## Architecture

An MCP App has two linked parts registered on the same MCP server: a **tool** the LLM calls, and a **resource** that serves the UI HTML. When the host receives the tool result, it fetches the resource and renders it in an iframe.

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
                │  MCP (HTTP or stdio)
┌───────────────▼─────────────────────────────────────────────┐
│  MCP Server  (main.ts → server.ts)                          │
│                                                             │
│  Tool: view-pokemon-team                                    │
│    ├── Parses Showdown export text                          │
│    ├── Fetches types from PokéAPI for each Pokémon          │
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
  parseShowdownTeam()          (server.ts)
  ├── parseFirstLine()         → species, nickname, item, gender
  ├── "Ability: …"             → ability
  ├── "EVs: …" / "IVs: …"     → parseStats() → StatBlock
  ├── "X Nature"               → nature
  └── "- Move"                 → moves[]
       │
       ▼
  Parallel enrichment (Promise.all)
  ├── fetchTypes(species)      → GET pokeapi.co/api/v2/pokemon/{id}
  ├── spriteUrl                → play.pokemonshowdown.com/sprites/gen5[‑shiny]/{id}.png
  └── itemSpriteUrl            → play.pokemonshowdown.com/sprites/itemicons/{id}.png
       │
       ▼
  CallToolResult
  ├── content[0].text          → plain-text summary (for non-UI hosts)
  └── _meta.teamData           → full TeamData for the UI
```

### File structure

```
pokemon-team-viewer/
├── main.ts              Entry point — starts HTTP or stdio MCP server
├── server.ts            Tool + resource registration, Showdown parser, PokeAPI fetch
├── mcp-app.html         HTML entry point for Vite (references src/mcp-app.tsx)
├── src/
│   ├── mcp-app.tsx      React UI — PokemonCard, TypeBadge, EVDisplay, TeamGrid
│   ├── global.css       Host CSS variable fallbacks, base reset
│   └── vite-env.d.ts    Vite type reference
├── vite.config.ts       Builds mcp-app.html → dist/mcp-app.html (single-file bundle)
├── tsconfig.json        Client-side TypeScript (bundler mode, JSX)
└── tsconfig.server.json Server-side TypeScript (NodeNext, emitDeclarationOnly)
```

The Vite build uses [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) to inline all JS and CSS into `dist/mcp-app.html`, which is what the MCP resource serves.

## Installation

**Requirements:** Node.js 18+, npm

```bash
git clone https://github.com/kguinto/pokemon-team-viewer.git
cd pokemon-team-viewer
npm install
```

## Development

Start the server with file watching (rebuilds UI on change, restarts server on change):

```bash
npm run dev
```

The MCP server listens at `http://localhost:3001/mcp`.

To run with stdio transport instead (for hosts that use process-based MCP):

```bash
npm run serve:stdio
```

### Connecting to the server

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pokemon-team-viewer": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

**basic-host** (local browser testing without Claude Desktop):

```bash
# In a separate terminal, from the cloned ext-apps repo:
cd /tmp/mcp-ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm run start
# Open http://localhost:8080
```

## Testing

### Manual test

1. Start the server: `npm run dev`
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

**Expected result:** A card grid appears with sprites, type badges, item icons, and move lists for each Pokémon.

### Parser edge cases to verify

| Input format | Expected behavior |
|---|---|
| `Nickname (Species) @ Item` | Nickname shown, species shown smaller below |
| `Species` (no item, no nickname) | Just species name, no item row |
| `Shiny: Yes` | Shiny sprite variant loaded |
| `(M)` / `(F)` gender marker | ♂ / ♀ symbol next to name |
| Non-100 `Level:` | Level badge shown in type row |
| IVs less than 31 | IV values shown alongside EVs |
| Species with special chars (Mr. Mime, Farfetch'd, Flabébé) | Types still fetched correctly from PokéAPI |

### Build

```bash
npm run build   # type-check + vite build + tsc for server types
```

Output is in `dist/mcp-app.html` (bundled UI) and `dist/server.d.ts` (type declarations).
