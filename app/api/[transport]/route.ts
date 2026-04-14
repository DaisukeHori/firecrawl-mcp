/**
 * MCP エンドポイント
 *
 * /api/mcp  → Streamable HTTP (メイン)
 * /api/sse  → SSE (後方互換)
 *
 * 認証:
 *   MCP_API_KEY 環境変数が設定されている場合:
 *     1. Authorization: Bearer <MCP_API_KEY>
 *     2. URL クエリ ?key=<MCP_API_KEY>
 *   MCP_API_KEY が未設定の場合: 認証なし（開発用）
 */

import { createMcpHandler } from "mcp-handler";
import { registerAllTools } from "@/lib/mcp/server";

const mcpHandler = createMcpHandler(
  (server) => {
    registerAllTools(server);
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

/**
 * Bearer Token を Authorization ヘッダーから抽出する
 */
function extractBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || undefined;
}

/**
 * URL クエリパラメータからキーを抽出する
 */
function extractQueryParam(
  request: Request,
  param: string
): string | undefined {
  try {
    const url = new URL(request.url);
    return url.searchParams.get(param) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * MCP_API_KEY による認証チェック
 */
function verifyApiKey(apiKey: string | undefined): Response | null {
  const expectedKey = process.env.MCP_API_KEY;

  // MCP_API_KEY 未設定なら認証スキップ（開発用）
  if (!expectedKey) {
    return null;
  }

  if (!apiKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "認証エラー: 有効な API キーを Authorization: Bearer <KEY> または ?key=<KEY> で指定してください。",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return null; // 認証OK
}

/**
 * メインハンドラー
 */
async function handler(request: Request): Promise<Response> {
  const apiKey =
    extractBearerToken(request) || extractQueryParam(request, "key");
  const errorResponse = verifyApiKey(apiKey);
  if (errorResponse) return errorResponse;

  return mcpHandler(request);
}

export { handler as GET, handler as POST };
