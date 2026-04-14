/**
 * firecrawl_batch_scrape — 複数URLを一括スクレイピング
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  startBatchScrape,
  getBatchScrapeStatus,
  FirecrawlError,
} from "@/lib/firecrawl/client";

const CHARACTER_LIMIT = 80000;

const InputSchema = {
  action: z
    .enum(["start", "status"])
    .default("start")
    .describe("'start' で新規バッチ開始、'status' で既存バッチの結果取得"),
  urls: z
    .array(z.string().url())
    .min(1)
    .max(1000)
    .optional()
    .describe("action='start' の場合: スクレイピング対象のURL配列"),
  batch_id: z
    .string()
    .optional()
    .describe("action='status' の場合: バッチジョブID"),
  formats: z
    .array(z.enum(["markdown", "html", "rawHtml", "links"]))
    .default(["markdown"])
    .describe("取得フォーマット"),
  onlyMainContent: z
    .boolean()
    .default(true)
    .describe("true の場合、メインコンテンツのみ抽出"),
};

export function registerBatchScrape(server: McpServer): void {
  server.registerTool(
    "firecrawl_batch_scrape",
    {
      title: "複数URLを一括スクレイピング",
      description: `複数URLを並列でスクレイピングするバッチジョブを管理する。

action="start": 新規バッチジョブを開始。urls にURL配列を渡す。
action="status": batch_id を指定して結果を取得。

一度に大量のページを取得したい場合（例: コンビニ各社の栄養情報ページ）に最適。
バッチは非同期実行され、firecrawl_batch_scrape(action="status") で結果を確認する。

Returns (start):
  id: バッチジョブID
Returns (status):
  status: "scraping" | "completed" | "failed"
  data: 各ページのスクレイピング結果配列`,
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
        if (params.action === "status") {
          if (!params.batch_id) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "action='status' の場合は batch_id が必須です。",
                },
              ],
              isError: true,
            };
          }

          const result = await getBatchScrapeStatus(params.batch_id);

          const lines: string[] = [
            `## バッチスクレイプ: ${params.batch_id}`,
            ``,
            `- ステータス: **${result.status}**`,
            `- 進捗: ${result.completed ?? 0} / ${result.total ?? "?"} ページ`,
            ``,
          ];

          if (
            result.status === "completed" &&
            result.data &&
            result.data.length > 0
          ) {
            lines.push(`---`, ``);
            let totalChars = lines.join("\n").length;

            for (const page of result.data) {
              const title =
                page.metadata?.title ||
                page.metadata?.sourceURL ||
                "Untitled";
              const url = page.metadata?.sourceURL || "";
              const content =
                page.markdown || page.html || "(コンテンツなし)";

              const block = [
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

              if (totalChars + block.length > CHARACTER_LIMIT) {
                lines.push(
                  `\n⚠️ 出力サイズ上限のため残りのページは省略されました。`
                );
                break;
              }
              lines.push(block);
              totalChars += block.length;
            }
          }

          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
          };
        }

        // action === "start"
        if (!params.urls || params.urls.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "action='start' の場合は urls（URL配列）が必須です。",
              },
            ],
            isError: true,
          };
        }

        const result = await startBatchScrape({
          urls: params.urls,
          formats: params.formats,
          onlyMainContent: params.onlyMainContent,
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `バッチスクレイプ開始失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `バッチスクレイプジョブを開始しました。`,
                ``,
                `- バッチID: ${result.id}`,
                `- URL数: ${params.urls.length}`,
                ``,
                `結果は firecrawl_batch_scrape(action="status", batch_id="${result.id}") で確認してください。`,
              ].join("\n"),
            },
          ],
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
