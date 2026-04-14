/**
 * firecrawl_crawl_errors — クロールジョブのエラー詳細を取得
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCrawlErrors, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  crawl_id: z
    .string()
    .min(1)
    .describe("firecrawl_crawl で返されたクロールジョブID"),
};

export function registerCrawlErrors(server: McpServer): void {
  server.registerTool(
    "firecrawl_crawl_errors",
    {
      title: "クロールエラー一覧を取得",
      description: `クロールジョブでスクレイピングに失敗したURLのエラー詳細を取得する。
クロール完了後に失敗ページを確認したい場合に使う。

Returns:
  errors[]: エラー一覧
    - url: 失敗したURL
    - error: エラー内容
    - timestamp: 発生時刻`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await getCrawlErrors(params.crawl_id);

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `エラー取得失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        const errors = result.errors ?? [];

        if (errors.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `クロールジョブ ${params.crawl_id} にエラーはありませんでした。`,
              },
            ],
          };
        }

        const lines: string[] = [
          `## クロールエラー: ${params.crawl_id}`,
          ``,
          `エラー数: ${errors.length}件`,
          ``,
        ];

        for (const err of errors) {
          lines.push(`### ${err.url}`);
          lines.push(`- エラー: ${err.error}`);
          lines.push(`- 時刻: ${err.timestamp}`);
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
