/**
 * MCP サーバー初期化
 * 全ツールを一括登録する（11 tools）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerScrape } from "./tools/scrape";
import { registerCrawl } from "./tools/crawl";
import { registerCrawlStatus } from "./tools/crawl-status";
import { registerCrawlErrors } from "./tools/crawl-errors";
import { registerCrawlActive } from "./tools/crawl-active";
import { registerMap } from "./tools/map";
import { registerBatchScrape } from "./tools/batch-scrape";
import { registerBatchCancel } from "./tools/batch-cancel";
import { registerBatchErrors } from "./tools/batch-errors";
import { registerSearch } from "./tools/search";
import { registerExtract } from "./tools/extract";

export function registerAllTools(server: McpServer): void {
  // ── Scrape ──
  registerScrape(server);

  // ── Crawl ──
  registerCrawl(server);
  registerCrawlStatus(server);
  registerCrawlErrors(server);
  registerCrawlActive(server);

  // ── Map ──
  registerMap(server);

  // ── Batch Scrape ──
  registerBatchScrape(server);
  registerBatchCancel(server);
  registerBatchErrors(server);

  // ── Search ──
  registerSearch(server);

  // ── Extract ──
  registerExtract(server);
}
