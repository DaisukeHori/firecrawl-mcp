/**
 * firecrawl_batch_cancel — バッチスクレイプジョブをキャンセル
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cancelBatchScrape, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  batch_id: z
    .string()
    .min(1)
    .describe("キャンセルするバッチジョブID"),
};

export function registerBatchCancel(server: McpServer): void {
  server.registerTool(
    "firecrawl_batch_cancel",
    {
      title: "バッチスクレイプをキャンセル",
      description: `実行中のバッチスクレイプジョブをキャンセルする。
大量URLを誤って投入した場合などに使用する。

Returns:
  success: キャンセルが成功したかどうか`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await cancelBatchScrape(params.batch_id);
        return {
          content: [
            {
              type: "text" as const,
              text: result.success
                ? `バッチジョブ ${params.batch_id} をキャンセルしました。`
                : `キャンセル失敗。ジョブIDを確認してください。`,
            },
          ],
          isError: !result.success,
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
