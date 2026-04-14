/**
 * firecrawl_search — Webを検索してページ内容まで一括取得
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { search, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  query: z
    .string()
    .min(1)
    .describe("検索クエリ（例: 'Firecrawl MCP server setup'）"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("取得する検索結果の最大件数（デフォルト5）"),
  scrapeContent: z
    .boolean()
    .default(false)
    .describe("true の場合、各検索結果のページ内容（Markdown）も取得する"),
};

export function registerSearch(server: McpServer): void {
  server.registerTool(
    "firecrawl_search",
    {
      title: "Web検索",
      description: `Webを検索し、結果のURL・タイトル・説明を取得する。
scrapeContent=true にすると各ページのMarkdownも一緒に返す。

主な用途:
- 最新情報・ニュースの検索
- 競合サイトの内容調査
- 特定トピックのURL収集

Returns:
  data[]: 検索結果の配列
    - url: ページURL
    - title: ページタイトル
    - description: 概要
    - markdown: ページ本文（scrapeContent=true 時のみ）`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await search({
          query: params.query,
          limit: params.limit,
          ...(params.scrapeContent
            ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }
            : {}),
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `検索失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        const items = result.data ?? [];
        if (items.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "検索結果が見つかりませんでした。" },
            ],
          };
        }

        const lines: string[] = [
          `## 検索結果: "${params.query}"`,
          ``,
          `件数: ${items.length}件`,
          ``,
        ];

        for (const [i, item] of items.entries()) {
          lines.push(`### ${i + 1}. ${item.title || "(タイトルなし)"}`);
          lines.push(`URL: ${item.url}`);
          if (item.description) {
            lines.push(`概要: ${item.description}`);
          }
          if (item.markdown) {
            lines.push(``, `**ページ内容:**`, ``, item.markdown);
          }
          lines.push(``);
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (error) {
        const msg =
          error instanceof FirecrawlError
            ? `Firecrawl API エラー (${error.status}): ${error.message}`
            : `エラー: ${error instanceof Error ? error.message : String(error)}`;
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: true,
        };
      }
    }
  );
}
