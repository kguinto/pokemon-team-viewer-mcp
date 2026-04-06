// PS item ID: lowercase, alphanumeric only — matches PS's toID()
function itemPSId(item: string): string {
  return item.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function showdownSpriteId(species: string): string {
  return species
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\.$/, "");
}

// Module-level cache: loaded once from PS item data on first use
let itemSpriteNumCache: Record<string, number> | null = null;

async function loadItemSpriteNums(): Promise<Record<string, number>> {
  if (itemSpriteNumCache) return itemSpriteNumCache;
  try {
    const res = await fetch("https://play.pokemonshowdown.com/data/items.js", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return (itemSpriteNumCache = {});
    const text = await res.text();
    const result: Record<string, number> = {};
    for (const m of text.matchAll(/(\w+):\{[^}]*spritenum:(\d+)/g)) {
      result[m[1]] = parseInt(m[2], 10);
    }
    itemSpriteNumCache = result;
  } catch {
    itemSpriteNumCache = {};
  }
  return itemSpriteNumCache;
}

export async function fetchItemSpriteNum(item: string): Promise<number | undefined> {
  const nums = await loadItemSpriteNums();
  return nums[itemPSId(item)];
}
