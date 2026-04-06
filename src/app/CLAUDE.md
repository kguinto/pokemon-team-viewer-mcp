# src/app

React UI for the MCP App. Bundled by Vite into a single-file HTML document (`dist/mcp-app.html`) served as an MCP resource. Runs in an iframe inside the host — no server, no same-origin.

## Files

- **`App.tsx`** — Root component. Manages MCP lifecycle via `useApp` and drives top-level state.
- **`constants.ts`** — `TYPE_COLORS`, `NATURE_EFFECTS`, `STAT_LABELS` — shared lookup tables used by multiple components.
- **`components/TeamGrid.tsx`** — Responsive CSS grid wrapper; renders one `PokemonCard` per team member.
- **`components/PokemonCard.tsx`** — Full card for a single Pokémon: sprite, name, types, item, ability, nature, EVs/IVs, moves.
- **`components/EVDisplay.tsx`** — Stat chip row. Shows EVs and/or IVs for any stat that isn't at its default value (0 EVs / 31 IVs). Nature-boosted stat is green, lowered stat is red.
- **`components/TypeBadge.tsx`** — Pill badge with canonical type colour from `TYPE_COLORS`.

## App lifecycle (`App.tsx`)

Uses the `useApp` hook from `@modelcontextprotocol/ext-apps/react`. Handlers are registered in `onAppCreated`:

- `ontoolinput` — resets state to show a loading indicator while the tool is running
- `ontoolresult` — extracts `result._meta.teamData` and sets it into React state; falls back to displaying `result.content[0].text` on error
- `onerror` — surfaces connection/transport errors

Team data flows in via `_meta.teamData` (a `TeamData` object), not through the standard MCP `content` array.

## Styling

All layout and colour uses inline styles. Host-provided CSS variables are used for theming:

| Variable | Used for |
|---|---|
| `--color-background-card` | Card background |
| `--color-background-subtle` | Chip / badge background |
| `--color-border` | Card border |
| `--color-text-primary` | Main text |
| `--color-text-secondary` | Labels, metadata |
| `--border-radius-lg` | Card corner radius |

Fallbacks for these variables are defined in `src/global.css`.

## Item sprite rendering (`PokemonCard.tsx`)

Item icons come from the PS sprite sheet, not individual images. A `PokemonSet` carries `itemSpriteNum` (resolved server-side); the card renders a 24×24 div with:

```
background: url(https://play.pokemonshowdown.com/sprites/itemicons-sheet.png?v1)
            no-repeat -(spriteNum % 16 * 24)px -(floor(spriteNum / 16) * 24)px
```

This domain must be in the CSP `resourceDomains` list — configured in `src/server.ts`'s resource read callback.

## Network / CSP

All external assets (sprites, item sheet) are loaded from `https://play.pokemonshowdown.com`. The iframe has no same-origin server, so every external domain needs to be declared. The CSP is set on the `contents[]` objects returned by the resource read callback in `src/server.ts`, not on the `registerAppResource` config argument.
