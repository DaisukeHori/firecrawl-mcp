# CLAUDE.md - MCP サーバー自動修復ガイド

## プロジェクト概要
このリポジトリは MCP (Model Context Protocol) サーバーであり、Vercel にデプロイされている。
Streamable HTTP トランスポートを使用し、Claude.ai から直接接続して利用される。

## 技術スタック
- **言語**: TypeScript
- **ランタイム**: Node.js 22+
- **デプロイ**: Vercel (Serverless Functions)
- **トランスポート**: Streamable HTTP (`/api/mcp` エンドポイント)
- **認証**: `x-api-key` ヘッダーによる API キー認証

## コード規約
- TypeScript strict mode 必須
- ESM (`"type": "module"`)
- エラーメッセージは英語、コメントは日本語可
- すべてのツールに明確な `description` を付与
- ツール名は `snake_case` で `リソース_アクション` 形式（例: `contact_search`, `dns_create_record`）

## Issue 対応フロー（mcp-doctor からの自動起票 Issue）

### 1. Issue の分析
- Issue 本文のチェンジログ URL を確認
- 上流 API の変更内容を特定
- 影響を受けるツール（関数）を列挙

### 2. ブランチ作成
- ブランチ名: `fix/api-update-YYYY-MM-DD` または `fix/health-{server-name}-YYYY-MM-DD`
- main ブランチから作成

### 3. コード修正
- 上流 API の変更に合わせてリクエスト/レスポンスのスキーマを更新
- 非推奨になった API エンドポイントを新しいものに置換
- 新しい API が追加された場合は対応するツールを追加
- 削除された API があればツールを削除し、README を更新

### 4. テスト
- `npm run build` が成功することを確認
- TypeScript の型エラーがないことを確認
- 可能であればドライランテスト（副作用のないツールの呼び出し）

### 5. PR 作成
- PRタイトル: `fix: [API名] API変更対応` または `fix: health check failure`
- PR本文に変更内容のサマリーを記載
- 対応する Issue を `Closes #XX` で紐付け
- ラベル: `mcp-doctor`

## ディレクトリ構造
```
src/
├── index.ts          # Vercel エントリポイント（/api/mcp）
├── tools/            # ツール定義（1ファイル1ツールまたは機能グループ）
├── types/            # 型定義
└── utils/            # ユーティリティ（認証、エラーハンドリング等）
```

## 重要な注意事項
- **認証情報をコードにハードコードしない**
- Vercel の環境変数で管理されるシークレットには触れない
- `package.json` の依存関係を変更した場合は `npm install` → `package-lock.json` もコミット
- README.md のツール数やツール一覧も更新する
