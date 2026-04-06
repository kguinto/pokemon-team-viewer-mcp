# src/server

Server-side modules that run inside the MCP tool handler. These are Node.js files compiled by esbuild — no browser APIs.

## Files

- **`parser.ts`** — Parses Pokémon Showdown export text into `PokemonSet` objects (minus `types`, `spriteUrl`, `itemSpriteNum`, which are filled in by `server.ts` after enrichment).
- **`pokeapi.ts`** — Fetches types from PokéAPI with two-stage fallback logic.
- **`sprites.ts`** — Constructs Showdown sprite URLs and resolves item spritenums from the PS item data.

## Parser (`parser.ts`)

`parseShowdownTeam(text)` splits on blank lines, then parses each block line by line. The first line is handled by `parseFirstLine`, which extracts optional nickname `(Species)`, held item `@ Item`, and gender `(M)`/`(F)`.

Stats (`EVs:` / `IVs:`) use `parseStats`, which splits on `/` and maps abbreviations (`HP`, `Atk`, `Def`, `SpA`, `SpD`, `Spe`) to `StatBlock` keys. Nature is detected by matching `<Word> Nature` against a hardcoded set of all 25 natures.

## PokéAPI (`pokeapi.ts`)

`fetchTypes(speciesId)` handles two failure modes:

1. **Form-name mismatches** — Showdown uses `ogerpon-wellspring`; PokéAPI requires `ogerpon-wellspring-mask`. Strategy: build a candidate list of the exact name plus progressively shorter hyphen-stripped variants, try each until a hit.

2. **No bare species entry** — `/pokemon/landorus` 404s. Fall back to `/pokemon-species/landorus` → find `is_default` variety → fetch that form's types. Affects Landorus, Tornadus, Thundurus, Deoxys, Giratina, Urshifu, and others.

`speciesIdForPokeAPI(species)` normalises the Showdown species name to the PokéAPI slug format: lowercase, dots/apostrophes/accented chars stripped/transliterated, spaces to hyphens.

## Sprites (`sprites.ts`)

### Pokémon sprites

`showdownSpriteId(species)` converts a species name to the PS CDN slug (lowercase, no spaces, no special chars except hyphens). Sprite URLs are constructed in `server.ts`:

```
https://play.pokemonshowdown.com/sprites/gen5/{id}.png
https://play.pokemonshowdown.com/sprites/gen5-shiny/{id}.png   (shiny)
```

### Item sprites

PS does **not** serve individual item PNGs for most items. Items come from a single sprite sheet (`itemicons-sheet.png`) indexed by `spritenum`.

`fetchItemSpriteNum(item)` converts the item name to a PS item ID (`itemPSId`: lowercase, alphanumeric only — matches PS's `toID()`), then looks it up in a module-level cache loaded once from `https://play.pokemonshowdown.com/data/items.js`.

The cache is populated by regex `(\w+):\{[^}]*spritenum:(\d+)` over the raw JS source. The client renders a 24×24 div using:

```
background-position: -(spriteNum % 16 * 24)px -(floor(spriteNum / 16) * 24)px
```
