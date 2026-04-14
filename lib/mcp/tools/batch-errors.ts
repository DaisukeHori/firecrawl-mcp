/**
 * firecrawl_batch_errors — バッチスクレイプのエラー詳細を取得
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBatchScrapeErrors, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  batch_id: z
    .string()
    .min(1)
    .describe("バッチジョブID"),
};

export function registerBatchErrors(server: McpServer): void {
  server.registerTool(
    "firecrawl_batch_errors",
    {
      title: "バッチスクレイプのエラー一覧を取得",
      description: `バッチスクレイプジョブでスクレイピングに失敗したURLのエラー詳細を取得する。

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
        const result = await getBatchScrapeErrors(params.batch_id);

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
                text: `バッチジョブ ${params.batch_id} にエラーはありませんでした。`,
              },
            ],
          };
        }

        const lines: string[] = [
          `## バッチエラー: ${params.batch_id}`,
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
