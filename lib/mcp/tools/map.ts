/**
 * firecrawl_map — Webサイトの全URLを一覧取得
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mapSite, FirecrawlError } from "@/lib/firecrawl/client";

const InputSchema = {
  url: z
    .string()
    .url("有効なURLを指定してください")
    .describe("マッピング対象のサイトURL"),
  search: z
    .string()
    .optional()
    .describe("URL一覧をフィルタリングするキーワード（例: 'blog'）"),
  ignoreSitemap: z
    .boolean()
    .default(false)
    .describe("true の場合、sitemap.xml を無視してリンク探索のみで検出"),
  includeSubdomains: z
    .boolean()
    .default(false)
    .describe("true の場合、サブドメインのURLも含める"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(1000)
    .describe("取得するURL数の上限"),
};

export function registerMap(server: McpServer): void {
  server.registerTool(
    "firecrawl_map",
    {
      title: "サイトURLマッピング",
      description: `指定サイトのアクセス可能な全URLを一覧で返す。
sitemap.xml + リンク探索で網羅的にURLを検出する。

クロール前にサイト構造を把握したい場合や、
特定パス（例: /blog/）のURL一覧が欲しい場合に使う。
実際のページ内容は取得しない（URLリストのみ）。

Returns:
  success: boolean
  links: URL文字列の配列`,
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
        const result = await mapSite({
          url: params.url,
          search: params.search,
          ignoreSitemap: params.ignoreSitemap,
          includeSubdomains: params.includeSubdomains,
          limit: params.limit,
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `マッピング失敗: ${result.error || "不明なエラー"}`,
              },
            ],
            isError: true,
          };
        }

        const links = result.links || [];

        const lines: string[] = [
          `## サイトマップ: ${params.url}`,
          ``,
          `検出URL数: **${links.length}**`,
          ``,
        ];

        if (links.length > 0) {
          for (const link of links) {
            lines.push(`- ${link}`);
          }
        } else {
          lines.push("URLが見つかりませんでした。");
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
