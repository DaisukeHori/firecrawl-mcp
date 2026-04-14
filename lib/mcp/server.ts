/**
 * MCP サーバー初期化
 * 全ツールを一括登録する（5 tools）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerScrape } from "./tools/scrape";
import { registerCrawl } from "./tools/crawl";
import { registerCrawlStatus } from "./tools/crawl-status";
import { registerMap } from "./tools/map";
import { registerBatchScrape } from "./tools/batch-scrape";

export function registerAllTools(server: McpServer): void {
  // ── Scrape ──
  registerScrape(server);

  // ── Crawl ──
  registerCrawl(server);
  registerCrawlStatus(server);

  // ── Map ──
  registerMap(server);

  // ── Batch Scrape ──
  registerBatchScrape(server);
}
