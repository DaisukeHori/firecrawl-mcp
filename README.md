# 🔥 Firecrawl MCP Server

セルフホスト [Firecrawl](https://github.com/mendableai/firecrawl) を MCP (Model Context Protocol) 経由で Claude から利用するためのサーバー。

Next.js + Vercel にデプロイし、Claude.ai / Claude Desktop / Claude Code から MCP コネクタとして接続する。

## アーキテクチャ

```
Claude.ai ──MCP──▶ Vercel (firecrawl-mcp)
                        │
                        ▼
               Firecrawl (self-hosted)
               firecrawl.appserver.tokyo
```

## ツール一覧 (5)

| ツール | 説明 |
|---|---|
| `firecrawl_scrape` | 単一URLをスクレイピングしMarkdown/HTML等で返す |
| `firecrawl_crawl` | サイト全体のクロールジョブを開始 |
| `firecrawl_crawl_status` | クロールジョブの進捗と結果を取得 |
| `firecrawl_map` | サイトの全URLを一覧取得 |
| `firecrawl_batch_scrape` | 複数URLを並列で一括スクレイピング |

## セットアップ

### 1. 環境変数

```bash
# Firecrawl インスタンス
FIRECRAWL_API_URL=https://firecrawl.appserver.tokyo
FIRECRAWL_API_KEY=fc-test

# MCP サーバー認証
MCP_API_KEY=your-secret-key
```

### 2. Vercel デプロイ

```bash
vercel --prod
```

### 3. Claude.ai コネクタ登録

Claude.ai の設定 → MCP コネクタ → 追加:

```
https://firecrawl-mcp.vercel.app/api/mcp?key=YOUR_MCP_API_KEY
```

## 開発

```bash
npm install
npm run dev
```

## ライセンス

MIT
