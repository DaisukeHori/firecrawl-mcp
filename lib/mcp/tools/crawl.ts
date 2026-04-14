/**
 * firecrawl_crawl — Webサイト全体をクロールするジョブを開始する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startCrawl, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  url: z
    .string()
    .url("有効なURLを指定してください")
    .describe("クロール開始URLl"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(50)
    .describe("クロールするページ数の上限。デフォルト50"),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("リンクの最大深度。指定しないとサイト全体"),
  includePaths: z
    .array(z.string())
    .optional()
    .describe("含めるパスパターン（glob形式、例: ['/blog/*', '/docs/*']）"),
  excludePaths: z
    .array(z.string())
    .optional()
    .describe("除外するパスパターン（glob形式、例: ['/admin/*']）"),
  allowBackwardLinks: z
    .boolean()
    .default(false)
    .describe("true の場合、親ディレクトリへのリンクも辿る"),
  allowExternalLinks: z
    .boolean()
    .default(false)
    .describe("true の場合、外部ドメインへのリンクも辿る"),
  ignoreSitemap: z
    .boolean()
    .default(false)
    .describe("true の場合、sitemap.xml を無視する"),
  formats: z
    .array(z.enum(["markdown", "html", "rawHtml", "links"]))
    .default(["markdown"])
    .describe("各ページの取得フォーマット"),
  onlyMainContent: z
    .boolean()
    .default(true)
    .describe("true の場合、メインコンテンツのみ抽出"),
};

export function registerCrawl(server: McpServer): void {
  server.registerTool(
    "firecrawl_crawl",
    {
      title: "Webサイトをクロール",
      description: `指定URLを起点にWebサイト全体をクロールするジョブを開始する。

クロールは非同期で実行される。このツールはジョブIDを返すので、
firecrawl_crawl_status でジョブの進捗と結果を確認すること。

主な用途:
- ドキュメントサイト全体をMarkdownで取得
- サイト内の全ページを網羅的にスクレイピング
- 特定パスのみに絞ったクロール

Returns:
  success: boolean
  id: クロールジョブID（firecrawl_crawl_status に渡す）`,
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
        const result = await startCrawl({
          url: params.url,
          limit: params.limit,
          maxDepth: params.maxDepth,
          includePaths: params.includePaths,
          excludePaths: params.excludePaths,
          allowBackwardLinks: params.allowBackwardLinks,
          allowExternalLinks: params.allowExternalLinks,
          ignoreSitemap: params.ignoreSitemap,
          scrapeOptions: {
            formats: params.formats,
            onlyMainContent: params.onlyMainContent,
          },
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `クロール開始失敗: ${result.error || "不明なエラー"}`,
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
                `クロールジョブを開始しました。`,
                ``,
                `- ジョブID: ${result.id}`,
                `- 対象URL: ${params.url}`,
                `- ページ上限: ${params.limit}`,
                ``,
                `進捗と結果は firecrawl_crawl_status(crawl_id="${result.id}") で確認してください。`,
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
