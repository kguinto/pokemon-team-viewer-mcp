import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { parseShowdownTeam } from "./server/parser.js";
import { fetchTypes, speciesIdForPokeAPI } from "./server/pokeapi.js";
import { fetchItemSpriteNum, showdownSpriteId } from "./server/sprites.js";
import type { PokemonSet, TeamData } from "./types.js";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "../dist")  // running from src/ in dev
  : import.meta.dirname;                         // running from dist/ when compiled

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
          const types = await fetchTypes(speciesIdForPokeAPI(set.species));
          const spriteBase = set.shiny
            ? "https://play.pokemonshowdown.com/sprites/gen5-shiny"
            : "https://play.pokemonshowdown.com/sprites/gen5";
          const spriteUrl = `${spriteBase}/${showdownSpriteId(set.species)}.png`;
          const itemSpriteNum = set.item ? await fetchItemSpriteNum(set.item) : undefined;
          return { ...set, types, spriteUrl, itemSpriteNum };
        }),
      );

      const teamData: TeamData = { pokemon: enriched };
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
        contents: [{
          uri: resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: { ui: { csp: { resourceDomains: ["https://play.pokemonshowdown.com"] } } },
        }],
      };
    },
  );

  return server;
}
