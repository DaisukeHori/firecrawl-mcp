/**
 * firecrawl_crawl_active — 現在実行中のクロールジョブ一覧を取得
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getActiveCrawls, FirecrawlError } from "@/lib/firecrawl/client";

export function registerCrawlActive(server: McpServer): void {
  server.registerTool(
    "firecrawl_crawl_active",
    {
      title: "実行中のクロール一覧を取得",
      description: `現在サーバーで実行中のクロールジョブを一覧表示する。
ジョブIDを忘れた場合や、実行状況を一覧で確認したい場合に使う。

Returns:
  crawls[]: 実行中ジョブの配列
    - id: ジョブID
    - url: クロール対象のルートURL
    - status: 現在のステータス`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const result = await getActiveCrawls();

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `取得失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        const crawls = result.crawls ?? [];

        if (crawls.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "現在実行中のクロールジョブはありません。" },
            ],
          };
        }

        const lines: string[] = [
          `## 実行中のクロールジョブ`,
          ``,
          `件数: ${crawls.length}件`,
          ``,
        ];

        for (const crawl of crawls) {
          lines.push(`### ${crawl.id}`);
          lines.push(`- URL: ${crawl.url}`);
          lines.push(`- ステータス: ${crawl.status}`);
          if (crawl.createdAt) {
            lines.push(`- 開始時刻: ${crawl.createdAt}`);
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
