# 🔥 Firecrawl MCP Server

**セルフホスト Firecrawl を Claude から MCP で操作する。**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Ffirecrawl-mcp&env=FIRECRAWL_API_URL%2CFIRECRAWL_API_KEY%2CMCP_API_KEY&envDescription=FIRECRAWL_API_URL%3A+Firecrawl+URL+%7C+FIRECRAWL_API_KEY%3A+API+Key+%7C+MCP_API_KEY%3A+MCP+auth+key&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Ffirecrawl-mcp%23%E7%92%B0%E5%A2%83%E5%A4%89%E6%95%B0&project-name=firecrawl-mcp&repository-name=firecrawl-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tools](https://img.shields.io/badge/MCP_Tools-11-orange)]()

> **LP:** [daisukehori.github.io/firecrawl-mcp](https://daisukehori.github.io/firecrawl-mcp/)

セルフホストの [Firecrawl](https://github.com/mendableai/firecrawl) を MCP (Model Context Protocol) 経由で Claude.ai / Claude Desktop / Claude Code から直接操作できます。

Web検索・単一/バッチスクレイピング・サイトクロール・サイトマップ取得・LLM構造化抽出の11ツールを搭載。

## アーキテクチャ

```
Claude.ai ──MCP──▶ Vercel (firecrawl-mcp)
                        │
                        ▼
               Firecrawl (self-hosted)
               your-firecrawl.example.com
```

Vercel上のNext.jsアプリがMCPプロトコルを処理し、セルフホストFirecrawlのAPIに中継します。サーバーはステートレスで、データの保存やログ出力は行いません。

## ツール一覧（11ツール）

### スクレイピング

| ツール | 説明 |
|:--|:--|
| `firecrawl_scrape` | 単一URLをスクレイピング。Markdown/HTML/リンク/スクリーンショット対応 |
| `firecrawl_batch_scrape` | 複数URLを並列スクレイピング（start/status） |
| `firecrawl_batch_cancel` | 実行中のバッチジョブをキャンセル |
| `firecrawl_batch_errors` | バッチジョブのエラー詳細を取得 |

### クロール

| ツール | 説明 |
|:--|:--|
| `firecrawl_crawl` | サイト全体のクロールジョブを開始 |
| `firecrawl_crawl_status` | クロールの進捗・結果取得 / キャンセル |
| `firecrawl_crawl_errors` | クロールジョブのエラー詳細を取得 |
| `firecrawl_crawl_active` | 実行中のクロールジョブ一覧 |

### 検索・マッピング・抽出

| ツール | 説明 |
|:--|:--|
| `firecrawl_search` | Web検索。結果のMarkdown取得も可能 |
| `firecrawl_map` | サイトの全URL一覧を取得（sitemap + リンク探索） |
| `firecrawl_extract` | LLMでページから構造化データ（JSON）を抽出 |

## クイックスタート（3ステップ）

### ステップ1: セルフホスト Firecrawl を用意

[Firecrawl セルフホストガイド](https://docs.firecrawl.dev/contributing/self-host) に従ってFirecrawlを起動します。

```bash
git clone https://github.com/mendableai/firecrawl.git
cd firecrawl
docker compose up -d
```

デフォルトで `http://localhost:3002` で起動します。

### ステップ2: MCP サーバーをデプロイ

#### ワンクリックデプロイ（推奨）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Ffirecrawl-mcp&env=FIRECRAWL_API_URL%2CFIRECRAWL_API_KEY%2CMCP_API_KEY&envDescription=FIRECRAWL_API_URL%3A+Firecrawl+URL+%7C+FIRECRAWL_API_KEY%3A+API+Key+%7C+MCP_API_KEY%3A+MCP+auth+key&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Ffirecrawl-mcp%23%E7%92%B0%E5%A2%83%E5%A4%89%E6%95%B0&project-name=firecrawl-mcp&repository-name=firecrawl-mcp)

#### 手動デプロイ

```bash
git clone https://github.com/DaisukeHori/firecrawl-mcp.git
cd firecrawl-mcp
cp .env.example .env.local
# .env.local を編集
npm install
npm run dev
```

### ステップ3: Claude から接続

**Claude.ai（Web）:**
Settings → MCP → Add:
- URL: `https://your-firecrawl-mcp.vercel.app/api/mcp`
- Header名: `x-api-key`　値: `あなたのMCP_API_KEY`

**Claude Desktop / Cursor / VS Code / Windsurf:**
```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-firecrawl-mcp.vercel.app/api/mcp"],
      "env": {
        "HEADER_x-api-key": "あなたのMCP_API_KEY"
      }
    }
  }
}
```

**Claude Code:**
```bash
claude mcp add --transport http firecrawl https://your-firecrawl-mcp.vercel.app/api/mcp \
  --header "x-api-key: あなたのMCP_API_KEY"
```

## 環境変数

| 変数 | 必須 | 説明 |
|:--|:--|:--|
| `FIRECRAWL_API_URL` | ✅ | セルフホスト Firecrawl の URL（例: `https://firecrawl.example.com`） |
| `FIRECRAWL_API_KEY` | △ | Firecrawl API キー（セルフホストで認証不要なら空可） |
| `MCP_API_KEY` | ✅ | MCP サーバーへのアクセスを制限する認証キー |

## 使用例

```
ユーザー: 「docs.firecrawl.dev の全ページをMarkdownで取得して」

AI: まずサイトマップを確認します。
    [firecrawl_map] → 47ページ検出
    
    クロールジョブを開始します。
    [firecrawl_crawl] → ジョブID: abc-123
    
    ... ステータス確認中 ...
    
    ✅ 47ページ全て取得完了しました。
```

```
ユーザー: 「この3つのURLから商品名と価格を抽出して」

AI: [firecrawl_extract]
    ✅ 構造化データ:
    {"name": "Product A", "price": 2980}
    {"name": "Product B", "price": 4980}
    {"name": "Product C", "price": 7980}
```

## 🔒 セキュリティ

- 通信は全て **HTTPS（TLS暗号化）** で保護
- サーバーは **ステートレス**。Firecrawl URLやAPIキーはVercel環境変数に保存され、リクエスト中にのみ使用
- サーバーにデータベースなし。Firecrawl APIへのプロキシとして動作するだけ
- ソースコードは **全て公開**
- `MCP_API_KEY` で不正アクセスを防止

## FAQ

**Q: Firecrawlクラウド版でも使える？**
→ はい。`FIRECRAWL_API_URL=https://api.firecrawl.dev` に設定し、`FIRECRAWL_API_KEY` にクラウドのAPIキーを入れてください。

**Q: extract ツールが動かない**
→ セルフホスト版では `OPENAI_API_KEY` 等のLLM設定がFirecrawl側に必要です。[セルフホストガイド](https://docs.firecrawl.dev/contributing/self-host)を確認してください。

**Q: バッチスクレイプ/クロールのステータスが `scraping` のまま**
→ セルフホスト版ではステータス遷移に数秒のラグがあります。2〜3回ポーリングすると `completed` になります。これは[既知の動作](https://github.com/mendableai/firecrawl/issues/3210)です。

**Q: Firecrawlのどのバージョンが必要？**
→ v1 API（`/v1/`エンドポイント）対応版。Docker Composeで最新版を使えば問題ありません。

**Q: HubSpot MA MCPとの違いは？**
→ HubSpot MA MCPはHubSpot CRM/MA操作用（128ツール）。Firecrawl MCPはWebスクレイピング/クロール用（11ツール）。用途が異なるため併用できます。

## 技術スタック

Next.js 15 / TypeScript / MCP SDK / Vercel / Zod

## ライセンス

[MIT License](LICENSE)
