import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

// --- Types ---

export interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface PokemonSet {
  nickname?: string;
  species: string;
  item?: string;
  ability?: string;
  level?: number;
  shiny?: boolean;
  gender?: string;
  evs: Partial<StatBlock>;
  ivs: Partial<StatBlock>;
  nature?: string;
  moves: string[];
  types: string[];
  spriteUrl: string;
  itemSpriteUrl?: string;
}

export interface TeamData {
  pokemon: PokemonSet[];
}

// --- Showdown Parser ---

const STAT_KEYS: Record<string, keyof StatBlock> = {
  HP: "hp",
  Atk: "atk",
  Def: "def",
  SpA: "spa",
  SpD: "spd",
  Spe: "spe",
};

function parseStats(line: string): Partial<StatBlock> {
  const result: Partial<StatBlock> = {};
  const parts = line.split("/").map((s) => s.trim());
  for (const part of parts) {
    const m = part.match(/^(\d+)\s+(\S+)$/);
    if (m) {
      const key = STAT_KEYS[m[2]];
      if (key) result[key] = parseInt(m[1], 10);
    }
  }
  return result;
}

const NATURES = new Set([
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
]);

function parseFirstLine(line: string): { nickname?: string; species: string; item?: string; gender?: string } {
  let rest = line.trim();
  let item: string | undefined;
  let gender: string | undefined;

  // Extract item
  const atIdx = rest.indexOf(" @ ");
  if (atIdx !== -1) {
    item = rest.slice(atIdx + 3).trim();
    rest = rest.slice(0, atIdx).trim();
  }

  // Extract gender marker (M) or (F) at end — only if it's exactly (M) or (F)
  const genderMatch = rest.match(/\s+\((M|F)\)$/);
  if (genderMatch) {
    gender = genderMatch[1];
    rest = rest.slice(0, rest.length - genderMatch[0].length).trim();
  }

  // Extract species from parens: "Nickname (Species)"
  const parenMatch = rest.match(/^(.+?)\s+\(([^)]+)\)$/);
  if (parenMatch) {
    return { nickname: parenMatch[1].trim(), species: parenMatch[2].trim(), item, gender };
  }

  return { species: rest.trim(), item, gender };
}

function parseShowdownTeam(text: string): Omit<PokemonSet, "types" | "spriteUrl" | "itemSpriteUrl">[] {
  const sets = text.trim().split(/\n\s*\n/).filter((s) => s.trim().length > 0);
  return sets.map((block) => {
    const lines = block.split("\n").map((l) => l.trimEnd());
    const firstLine = parseFirstLine(lines[0]);

    const set: Omit<PokemonSet, "types" | "spriteUrl" | "itemSpriteUrl"> = {
      species: firstLine.species,
      nickname: firstLine.nickname,
      item: firstLine.item,
      gender: firstLine.gender,
      evs: {},
      ivs: {},
      moves: [],
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith("- ")) {
        set.moves.push(line.slice(2).trim());
        continue;
      }
      if (line.startsWith("Ability: ")) {
        set.ability = line.slice(9).trim();
        continue;
      }
      if (line.startsWith("Level: ")) {
        set.level = parseInt(line.slice(7).trim(), 10);
        continue;
      }
      if (line.startsWith("Shiny: ")) {
        set.shiny = line.slice(7).trim().toLowerCase() === "yes";
        continue;
      }
      if (line.startsWith("EVs: ")) {
        set.evs = parseStats(line.slice(5).trim());
        continue;
      }
      if (line.startsWith("IVs: ")) {
        set.ivs = parseStats(line.slice(5).trim());
        continue;
      }
      const natureMatch = line.match(/^(\w+)\s+Nature$/);
      if (natureMatch && NATURES.has(natureMatch[1])) {
        set.nature = natureMatch[1];
        continue;
      }
    }

    return set;
  });
}

// --- PokeAPI helpers ---

function speciesIdForPokeAPI(species: string): string {
  return species
    .toLowerCase()
    .replace(/\./g, "")       // Mr. Mime -> mr mime
    .replace(/'/g, "")        // Farfetch'd -> farfetchd
    .replace(/é/g, "e")       // Flabébé -> flabebe
    .replace(/[^a-z0-9\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");    // spaces to hyphens
}

function showdownSpriteId(species: string): string {
  return species
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\.$/, "");
}

function itemSpriteId(item: string): string {
  return item
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

async function pokeAPIGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function fetchTypes(speciesId: string): Promise<string[]> {
  // Build candidate list: exact name, then strip trailing hyphen segments one at a time.
  // Handles cases like Showdown's "ogerpon-wellspring" vs PokéAPI's "ogerpon-wellspring-mask".
  const candidates: string[] = [speciesId];
  const parts = speciesId.split("-");
  for (let i = parts.length - 1; i >= 1; i--) {
    candidates.push(parts.slice(0, i).join("-"));
  }

  for (const id of candidates) {
    // 1. Try the direct /pokemon endpoint.
    const pokemon = await pokeAPIGet<{ types: { type: { name: string } }[] }>(`pokemon/${id}`);
    if (pokemon) return pokemon.types.map((t) => t.type.name);

    // 2. Many Pokémon (Landorus, Tornadus, Deoxys, Giratina, etc.) have no entry at /pokemon/{base}
    //    and require a form suffix (e.g. "landorus-incarnate"). The /pokemon-species endpoint
    //    exposes the default variety name, so use that as a fallback.
    const species = await pokeAPIGet<{ varieties: { is_default: boolean; pokemon: { name: string } }[] }>(`pokemon-species/${id}`);
    if (species) {
      const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon.name;
      if (defaultVariety && defaultVariety !== id) {
        const form = await pokeAPIGet<{ types: { type: { name: string } }[] }>(`pokemon/${defaultVariety}`);
        if (form) return form.types.map((t) => t.type.name);
      }
    }
  }
  return [];
}

// --- Server factory ---

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Pokemon Team Viewer",
    version: "1.0.0",
  });

  const resourceUri = "ui://view-pokemon-team/mcp-app.html";

  registerAppTool(
    server,
    "view-pokemon-team",
    {
      title: "View Pokemon Team",
      description:
        "Renders a Pokemon team from Pokémon Showdown export format. " +
        "Paste the team text (one or more sets separated by blank lines) to display a visual team sheet.",
      inputSchema: {
        team: z.string().describe("Pokemon team in Showdown export format"),
      },
      _meta: { ui: { resourceUri } },
    },
    async ({ team }): Promise<CallToolResult> => {
      const parsed = parseShowdownTeam(team);

      const enriched: PokemonSet[] = await Promise.all(
        parsed.map(async (set) => {
          const pokeId = speciesIdForPokeAPI(set.species);
          const types = await fetchTypes(pokeId);
          const spriteBase = set.shiny
            ? "https://play.pokemonshowdown.com/sprites/gen5-shiny"
            : "https://play.pokemonshowdown.com/sprites/gen5";
          const spriteId = showdownSpriteId(set.species);
          const spriteUrl = `${spriteBase}/${spriteId}.png`;
          const itemSpriteUrl = set.item
            ? `https://play.pokemonshowdown.com/sprites/itemicons/${itemSpriteId(set.item)}.png`
            : undefined;

          return { ...set, types, spriteUrl, itemSpriteUrl };
        }),
      );

      const teamData: TeamData = { pokemon: enriched };

      // Summary for non-UI hosts
      const summary = enriched
        .map((p) => `${p.nickname ? `${p.nickname} (${p.species})` : p.species}${p.item ? ` @ ${p.item}` : ""}`)
        .join(", ");

      return {
        content: [{ type: "text", text: `Team: ${summary}` }],
        _meta: { teamData },
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  resourceDomains: ["https://play.pokemonshowdown.com"],
                },
              },
            },
          },
        ],
      };
    },
  );

  return server;
}
