/**
 * firecrawl_crawl_status — クロールジョブの進捗・結果取得 / キャンセル
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCrawlStatus, cancelCrawl, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  crawl_id: z
    .string()
    .min(1)
    .describe("firecrawl_crawl で返されたクロールジョブID"),
  action: z
    .enum(["status", "cancel"])
    .default("status")
    .describe("'status' で進捗確認、'cancel' でジョブをキャンセル"),
};

export function registerCrawlStatus(server: McpServer): void {
  server.registerTool(
    "firecrawl_crawl_status",
    {
      title: "クロールジョブの進捗・結果を取得",
      description: `firecrawl_crawl で開始したクロールジョブの進捗と結果を取得する。
ジョブが完了していれば、クロールされた全ページのデータが返る。

action="cancel" でジョブを途中キャンセルすることも可能。

Returns:
  status: "scraping" | "completed" | "failed" | "cancelled"
  completed: 完了ページ数
  total: 全ページ数
  data: スクレイピング済みページの配列(完了時)`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        // ── キャンセル ──
        if (params.action === "cancel") {
          const result = await cancelCrawl(params.crawl_id);
          if (result.success) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `クロールジョブ ${params.crawl_id} をキャンセルしました。`,
                },
              ],
            };
          }
          const reason = result.reason || "ジョブIDを確認してください。";
          return {
            content: [
              {
                type: "text" as const,
                text: `キャンセル失敗: ${reason}`,
              },
            ],
            isError: true,
          };
        }

        // ── ステータス確認 ──
        const result = await getCrawlStatus(params.crawl_id);

        if (!result.success && !result.status) {
          return {
            content: [
              {
                type: "text" as const,
                text: `ステータス取得失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        const lines: string[] = [
          `## クロールジョブ: ${params.crawl_id}`,
          ``,
          `- ステータス: **${result.status}**`,
          `- 進捗: ${result.completed ?? "?"} / ${result.total ?? "?"} ページ`,
        ];

        if (result.expiresAt) {
          lines.push(`- データ有効期限: ${result.expiresAt}`);
        }

        if (result.next) {
          lines.push(``);
          lines.push(`次のページ: ${result.next}`);
        }

        if (
          result.status === "completed" &&
          result.data &&
          result.data.length > 0
        ) {
          lines.push(``);
          lines.push(`---`);
          lines.push(``);
          lines.push(
            `## 取得結果（${result.data.length}ページ）`
          );
          lines.push(``);

          for (const page of result.data) {
            const title =
              page.metadata?.title || page.metadata?.sourceURL || "Untitled";
            const sourceUrl = page.metadata?.sourceURL || "";
            lines.push(`### ${title}`);
            if (sourceUrl) {
              lines.push(`> ${sourceUrl}`);
            }
            if (page.markdown) {
              lines.push(page.markdown.slice(0, 1000));
            }
            lines.push(`---`);
          }
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
