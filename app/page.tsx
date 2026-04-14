export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>🔥 Firecrawl MCP Server</h1>
      <p>
        セルフホスト Firecrawl を MCP (Model Context Protocol) 経由で利用するためのサーバーです。
      </p>
      <h2>エンドポイント</h2>
      <ul>
        <li>
          <code>/api/mcp</code> — Streamable HTTP (メイン)
        </li>
        <li>
          <code>/api/sse</code> — SSE (後方互換)
        </li>
      </ul>
      <h2>利用可能なツール (5)</h2>
      <ul>
        <li><strong>firecrawl_scrape</strong> — 単一URLをスクレイピング</li>
        <li><strong>firecrawl_crawl</strong> — サイト全体をクロール</li>
        <li><strong>firecrawl_crawl_status</strong> — クロールジョブの進捗確認</li>
        <li><strong>firecrawl_map</strong> — サイトのURL一覧を取得</li>
        <li><strong>firecrawl_batch_scrape</strong> — 複数URLを一括スクレイピング</li>
      </ul>
      <h2>接続方法</h2>
      <p>
        Claude.ai のコネクタ設定で以下のURLを登録:
      </p>
      <pre>
        https://firecrawl-mcp.vercel.app/api/mcp?key=YOUR_MCP_API_KEY
      </pre>
    </main>
  );
}
