/**
 * firecrawl_extract — 複数URLから構造化データを抽出（LLM使用）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extract, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  urls: z
    .array(z.string().url())
    .min(1)
    .max(10)
    .describe("抽出対象のURL配列（最大10件）"),
  prompt: z
    .string()
    .optional()
    .describe(
      "抽出内容を自然言語で指示（例: 'Extract product name, price, and availability'）"
    ),
  schema: z
    .record(z.unknown())
    .optional()
    .describe(
      "抽出結果のJSONスキーマ（例: {type:'object', properties:{name:{type:'string'}}}）"
    ),
  enableWebSearch: z
    .boolean()
    .default(false)
    .describe("true の場合、Web検索で情報を補完する"),
  showSources: z
    .boolean()
    .default(true)
    .describe("true の場合、各フィールドのソースURLを返す"),
};

export function registerExtract(server: McpServer): void {
  server.registerTool(
    "firecrawl_extract",
    {
      title: "URLから構造化データを抽出（LLM）",
      description: `指定URLのページをLLMで解析し、構造化データ（JSON）として抽出する。
prompt か schema（または両方）を指定することで、欲しいフィールドを自然言語または
JSONスキーマで定義できる。

主な用途:
- 複数の商品ページから価格・在庫・仕様を一括抽出
- ニュース記事から見出し・日付・著者を構造化
- 企業サイトから連絡先・所在地を取得

注意: LLMを使用するため、セルフホスト版では OPENAI_API_KEY 等の設定が必要。

Returns:
  data: 抽出されたJSON形式のデータ
  sources: 各フィールドのソースURL（showSources=true 時）`,
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
        const result = await extract({
          urls: params.urls,
          prompt: params.prompt,
          schema: params.schema,
          enableWebSearch: params.enableWebSearch,
          showSources: params.showSources,
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `抽出失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        const lines: string[] = [
          `## 抽出結果`,
          ``,
          `対象URL: ${params.urls.join(", ")}`,
          ``,
          `### 抽出データ`,
          `\`\`\`json`,
          JSON.stringify(result.data, null, 2),
          `\`\`\``,
        ];

        if (result.sources && Object.keys(result.sources).length > 0) {
          lines.push(``, `### ソース`, ``);
          for (const [field, urls] of Object.entries(result.sources)) {
            lines.push(`**${field}**: ${(urls as string[]).join(", ")}`);
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
