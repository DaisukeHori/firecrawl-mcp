/**
 * firecrawl_scrape — 単一URLをスクレイピングしてMarkdown/HTML等で返す
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { scrape, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  url: z
    .string()
    .url("有効なURLを指定してください")
    .describe("スクレイピング対象のURL"),
  formats: z
    .array(
      z.enum([
        "markdown",
        "html",
        "rawHtml",
        "links",
        "screenshot",
        "screenshot@fullPage",
      ])
    )
    .default(["markdown"])
    .describe(
      "取得するフォーマット。デフォルトは markdown。複数指定可能"
    ),
  onlyMainContent: z
    .boolean()
    .default(true)
    .describe("true の場合、メインコンテンツのみ抽出（ナビ・フッター除外）"),
  includeTags: z
    .array(z.string())
    .optional()
    .describe("含めるHTMLタグ（例: ['article', 'main']）"),
  excludeTags: z
    .array(z.string())
    .optional()
    .describe("除外するHTMLタグ（例: ['nav', 'footer', 'aside']）"),
  waitFor: z
    .number()
    .int()
    .min(0)
    .max(30000)
    .optional()
    .describe("JS描画の待機時間（ミリ秒）。SPA等で必要な場合に指定"),
  timeout: z
    .number()
    .int()
    .min(1000)
    .max(60000)
    .optional()
    .describe("リクエストタイムアウト（ミリ秒）。デフォルト30000"),
  mobile: z
    .boolean()
    .optional()
    .describe("true の場合、モバイルビューポートでレンダリング"),
  headers: z
    .record(z.string())
    .optional()
    .describe("カスタムHTTPヘッダー（例: { 'Accept-Language': 'ja' }）"),
};

export function registerScrape(server: McpServer): void {
  server.registerTool(
    "firecrawl_scrape",
    {
      title: "Webページをスクレイピング",
      description: `指定URLのWebページをスクレイピングし、Markdown・HTML・リンク一覧・スクリーンショット等で返す。

JSレンダリング済みのコンテンツを取得するため、SPAやCSR（クライアントサイドレンダリング）のページにも対応。
onlyMainContent=true（デフォルト）でナビ・フッター・サイドバーを自動除外し、本文のみを返す。

主な用途:
- Webページの内容をMarkdownで取得してLLMに渡す
- 栄養情報やニュース記事などの定期スクレイピング
- ページのリンク一覧を取得

Returns:
  success: boolean
  data.markdown: Markdown形式のページ内容
  data.html: HTML形式
  data.links: ページ内のリンク一覧
  data.metadata: タイトル・説明・言語等のメタデータ`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await scrape({
          url: params.url,
          formats: params.formats,
          onlyMainContent: params.onlyMainContent,
          includeTags: params.includeTags,
          excludeTags: params.excludeTags,
          waitFor: params.waitFor,
          timeout: params.timeout,
          mobile: params.mobile,
          headers: params.headers,
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `スクレイピング失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        // Markdown があればそれをメイン、なければ JSON で返す
        const data = result.data;
        if (data?.markdown) {
          const meta = data.metadata;
          const header = meta
            ? `# ${meta.title || params.url}\n\n> Source: ${meta.sourceURL || params.url}\n> Status: ${meta.statusCode || "N/A"}\n\n---\n\n`
            : "";
          return {
            content: [
              { type: "text" as const, text: header + data.markdown },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.data, null, 2),
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
