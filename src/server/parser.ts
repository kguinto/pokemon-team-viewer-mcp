import type { PokemonSet, StatBlock } from "../types.js";

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
  for (const part of line.split("/").map((s) => s.trim())) {
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

  const atIdx = rest.indexOf(" @ ");
  if (atIdx !== -1) {
    item = rest.slice(atIdx + 3).trim();
    rest = rest.slice(0, atIdx).trim();
  }

  const genderMatch = rest.match(/\s+\((M|F)\)$/);
  if (genderMatch) {
    gender = genderMatch[1];
    rest = rest.slice(0, rest.length - genderMatch[0].length).trim();
  }

  const parenMatch = rest.match(/^(.+?)\s+\(([^)]+)\)$/);
  if (parenMatch) {
    return { nickname: parenMatch[1].trim(), species: parenMatch[2].trim(), item, gender };
  }

  return { species: rest.trim(), item, gender };
}

export function parseShowdownTeam(text: string): Omit<PokemonSet, "types" | "spriteUrl" | "itemSpriteNum">[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((s) => s.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trimEnd());
      const first = parseFirstLine(lines[0]);
      const set: Omit<PokemonSet, "types" | "spriteUrl" | "itemSpriteNum"> = {
        species: first.species,
        nickname: first.nickname,
        item: first.item,
        gender: first.gender,
        evs: {},
        ivs: {},
        moves: [],
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith("- ")) { set.moves.push(line.slice(2).trim()); continue; }
        if (line.startsWith("Ability: ")) { set.ability = line.slice(9).trim(); continue; }
        if (line.startsWith("Level: ")) { set.level = parseInt(line.slice(7).trim(), 10); continue; }
        if (line.startsWith("Shiny: ")) { set.shiny = line.slice(7).trim().toLowerCase() === "yes"; continue; }
        if (line.startsWith("EVs: ")) { set.evs = parseStats(line.slice(5).trim()); continue; }
        if (line.startsWith("IVs: ")) { set.ivs = parseStats(line.slice(5).trim()); continue; }
        const natureMatch = line.match(/^(\w+)\s+Nature$/);
        if (natureMatch && NATURES.has(natureMatch[1])) { set.nature = natureMatch[1]; continue; }
      }

      return set;
    });
}
