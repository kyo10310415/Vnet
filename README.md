# VTuber案件管理システム

VTuber案件の運用（STEP03〜STEP08）を**人間承認付きで半自動化**するWebアプリです。
AI生成物は絶対に自動確定せず、すべての重要な文書は人間が承認してから使用する設計です。

---

## 📋 機能一覧

| 機能 | 内容 |
|------|------|
| 案件管理 | 案件の作成・編集・一覧・詳細表示 |
| AI下書き生成 | 配信台本・NGリスト・タレント説明文など7種類をAI生成 |
| 承認フロー | 承認・差し戻し・バージョン管理 |
| チェックリスト | 配信前/中/後/レポート前のチェック管理 |
| 数値入力 | YouTube/X各種指標の登録・CSVインポート |
| レポート生成 | 案件情報・数値から下書き自動生成、承認後のみ納品可能 |
| ダッシュボード | 進行中案件数・承認待ち件数・納品可能件数を一覧表示 |
| アクティビティログ | すべての操作履歴を記録 |

---

## ⚠️ 重要：承認ルール

以下はすべて**人間承認必須**です：

- 配信台本
- NGリスト
- タレント向け説明文
- X告知投稿文
- 配信前チェックリスト
- レポート本文
- クライアント提出前の最終確認

承認されていないものは画面上で **「下書き」「承認待ち」「差し戻し」** と明確に表示されます。
**レポートは承認前「納品不可」、承認後のみ「納品可能」** と表示されます。

---

## 🛠️ 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 16.x | Webフレームワーク（App Router） |
| TypeScript | 5.x | 型安全な開発 |
| PostgreSQL | 15+ | データベース |
| Prisma | 7.x | ORM |
| Tailwind CSS | 4.x | スタイリング |
| Render | - | デプロイ・DB |

---

## 🚀 ローカルセットアップ

### 前提条件

- Node.js 18+
- PostgreSQL 15+（またはDockerでの起動）

### 手順

```bash
# 1. リポジトリのクローン
git clone https://github.com/your-username/vtuber-ops.git
cd vtuber-ops

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定
cp .env.example .env
# .envファイルを編集してDATABASE_URLを設定

# 4. データベースのセットアップ
npx prisma migrate dev --name init

# 5. シードデータの投入（任意）
npm run db:seed

# 6. 開発サーバー起動
npm run dev
```

---

## 🔑 環境変数

| 変数名 | 説明 | 例 |
|--------|------|----|
| `DATABASE_URL` | PostgreSQL接続URL | `postgresql://user:pass@localhost:5432/vtuber_ops` |
| `NEXTAUTH_SECRET` | NextAuth.js用シークレット | `openssl rand -base64 32` で生成 |
| `NEXTAUTH_URL` | アプリのベースURL | `http://localhost:3001` |
| `OPENAI_API_KEY` | OpenAI API（将来用） | `sk-...` |

---

## 🗄️ DBマイグレーション

```bash
# 開発環境（新しいマイグレーション作成）
npx prisma migrate dev --name <migration-name>

# 本番環境（マイグレーション適用）
npx prisma migrate deploy

# DBスキーマを直接プッシュ（開発時のみ）
npx prisma db push

# Prisma Studio（GUIクライアント）
npm run db:studio
```

---

## 💻 開発サーバー起動

```bash
# 開発サーバー（ポート3001）
npm run dev

# ビルド
npm run build

# 本番起動
npm run start
```

---

## 📦 GitHubへのpush手順

```bash
# GitHubでリポジトリを作成後
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/vtuber-ops.git
git push -u origin main
```

---

## ☁️ Renderデプロイ手順

### 方法1：render.yaml（推奨）

1. GitHubリポジトリにpush
2. [Render Dashboard](https://dashboard.render.com) → **New > Blueprint**
3. リポジトリを選択して `render.yaml` を自動認識
4. **NEXTAUTH_URL** に発行されたRender URLを設定
5. デプロイ実行

### 方法2：手動設定

1. Render Dashboard → **New > Web Service**
2. GitHubリポジトリを接続
3. 以下を設定：
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `npm run start`
4. 環境変数を設定：
   - `DATABASE_URL`: Render PostgreSQLの接続URL
   - `NEXTAUTH_SECRET`: `openssl rand -base64 32` で生成
   - `NEXTAUTH_URL`: RenderのURL（例: `https://vtuber-ops.onrender.com`）
   - `NODE_ENV`: `production`

### Render PostgreSQL接続手順

1. Render Dashboard → **New > PostgreSQL**
2. データベース名: `vtuber-ops-db`
3. **Internal Database URL** をコピー
4. Web Serviceの環境変数 `DATABASE_URL` に貼り付け

---

## 🔮 今後の拡張予定

| 機能 | 説明 |
|------|------|
| OpenAI API連携 | `lib/ai/generate.ts` のモックをGPT-4に差し替え |
| ログイン機能 | NextAuth.jsによる認証（Google・GitHub等） |
| Google Drive連携 | レポートのGoogleドキュメント出力 |
| Google Sheets連携 | 数値データの自動取り込み |
| YouTube Analytics API | 動画指標の自動収集 |
| X API連携 | 投稿インサイトの自動取得 |
| Discord通知 | 承認依頼・完了通知 |
| PDFレポート出力 | クライアント提出用PDF生成 |
| Google Docs出力 | レポートのGoogle Docs連携 |
| 権限認証 | admin/director/reviewer/viewer ロール実装 |

---

## 📂 プロジェクト構成

```
vtuber-ops/
├── prisma/
│   ├── schema.prisma      # DBスキーマ定義
│   ├── seed.ts            # シードデータ
│   └── migrations/        # マイグレーションファイル
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # ダッシュボード
│   │   ├── projects/      # 案件管理
│   │   ├── approvals/     # 承認待ち一覧
│   │   ├── activities/    # アクティビティログ
│   │   └── api/           # APIルート
│   ├── components/        # UIコンポーネント
│   │   ├── layout/        # レイアウト
│   │   ├── ui/            # 共通UI
│   │   ├── projects/      # 案件関連
│   │   ├── documents/     # ドキュメント関連
│   │   ├── checklist/     # チェックリスト
│   │   ├── metrics/       # 数値入力
│   │   └── reports/       # レポート
│   └── lib/
│       ├── ai/generate.ts  # AI生成モック（OpenAI差し替え可能）
│       ├── prisma.ts       # Prismaクライアント
│       ├── activity.ts     # アクティビティログ
│       └── constants.ts    # 定数・ラベル
├── .env.example
├── render.yaml
└── README.md
```
