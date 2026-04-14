/**
 * firecrawl_crawl_status — クロールジョブの進捗・結果を取得
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCrawlStatus, cancelCrawl, FirecrawlError } from "@/lib/firecrawl/client";

const CHARACTER_LIMIT = 80000;

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
      title: "クロールジョブの状態確認",
      description: `firecrawl_crawl で開始したクロールジョブの進捗と結果を取得する。
ジョブが完了していれば、クロールされた全ページのデータが返る。

action="cancel" でジョブを途中キャンセルすることも可能。

Returns:
  status: "scraping" | "completed" | "failed" | "cancelled"
  completed: 完了ページ数
  total: 全ページ数
  data: スクレイピング済みページの配列（完了時）`,
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
        if (params.action === "cancel") {
          const result = await cancelCrawl(params.crawl_id);
          return {
            content: [
              {
                type: "text" as const,
                text: result.success
                  ? `クロールジョブ ${params.crawl_id} をキャンセルしました。`
                  : `キャンセル失敗。ジョブIDを確認してください。`,
              },
            ],
          };
        }

        const result = await getCrawlStatus(params.crawl_id);

        if (!result.success) {
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
          `- 進捗: ${result.completed ?? 0} / ${result.total ?? "?"} ページ`,
        ];

        if (result.expiresAt) {
          lines.push(`- データ有効期限: ${result.expiresAt}`);
        }

        // 完了時はデータを返す
        if (result.status === "completed" && result.data && result.data.length > 0) {
          lines.push(``, `---`, ``, `## 取得結果（${result.data.length}ページ）`, ``);

          let totalChars = lines.join("\n").length;

          for (const page of result.data) {
            const title = page.metadata?.title || page.metadata?.sourceURL || "Untitled";
            const url = page.metadata?.sourceURL || "";
            const content = page.markdown || page.html || "(コンテンツなし)";

            const pageBlock = [
              `### ${title}`,
              url ? `> ${url}` : "",
              ``,
              content,
              ``,
              `---`,
              ``,
            ]
              .filter(Boolean)
              .join("\n");

            if (totalChars + pageBlock.length > CHARACTER_LIMIT) {
              lines.push(
                `\n⚠️ 出力が ${CHARACTER_LIMIT} 文字を超えたため、残り ${result.data.length - lines.filter((l) => l.startsWith("### ")).length} ページは省略されました。`
              );
              break;
            }

            lines.push(pageBlock);
            totalChars += pageBlock.length;
          }
        }

        if (result.next) {
          lines.push(`\n次のページ: ${result.next}`);
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
