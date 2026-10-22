# VTuber案件管理システム

VTuber案件の運用（STEP03〜STEP08）を**人間承認付きで半自動化**するWebアプリです。
AI生成物は絶対に自動確定せず、すべての重要な文書は人間が承認してから使用する設計です。

---

## 📋 機能一覧

| 機能 | 内容 |
|------|------|
| 案件管理 | 案件の作成・編集・一覧・詳細表示、複数タレント・グループ案件対応 |
| AI案件入力 | 文字起こしや添付資料から読み取れた案件情報をフォームへ自動反映 |
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
| `OPENAI_API_KEY` | 案件作成フォームの資料解析に使用するOpenAI APIキー | `sk-...` |
| `OPENAI_PROJECT_ANALYSIS_MODEL` | 資料解析モデル（任意、既定値：`gpt-5-mini`） | `gpt-5-mini` |

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

## ☁️ Renderデプロイ手順（Web Service）

Renderへのデプロイは **PostgreSQL → Web Service** の順で作成します。

---

### STEP 1：PostgreSQLデータベースを作成する

1. [Render Dashboard](https://dashboard.render.com) を開く
2. 右上の **New +** → **PostgreSQL** をクリック
3. 以下を入力：

   | 項目 | 値 |
   |------|-----|
   | Name | `vtuber-ops-db`（任意） |
   | Database | `vtuber_ops` |
   | User | 任意 |
   | Region | Singapore（またはお好みの地域） |
   | Plan | Free |

4. **Create Database** をクリック
5. 作成完了後、**Connections** セクションの **Internal Database URL** をコピーしておく
   ```
   postgresql://vtuber_ops_user:xxxx@dpg-xxxx-a/vtuber_ops
   ```
   > ⚠️ **Internal URL**（`dpg-` から始まるもの）を使うこと。External URLは課金対象になる場合あり。

---

### STEP 2：Web Serviceを作成する

1. Render Dashboard → **New +** → **Web Service** をクリック
2. **Connect a repository** でGitHubのリポジトリを選択
3. 以下の設定を入力：

   | 項目 | 値 |
   |------|-----|
   | Name | `vtuber-ops`（任意） |
   | Region | STEP 1と同じ地域 |
   | Branch | `main` |
   | Runtime | **Node** |
   | Build Command | 下記参照 |
   | Start Command | 下記参照 |
   | Plan | Free |

   **Build Command**（コピーして貼り付け）：
   ```
   npm install && npx prisma generate && npx prisma migrate deploy && npm run build
   ```

   **Start Command**（コピーして貼り付け）：
   ```
   npm run start
   ```

---

### STEP 3：環境変数を設定する

Web Service作成画面の **Environment Variables** セクションに以下を追加：

| Key | Value |
|-----|-------|
| `DATABASE_URL` | STEP 1でコピーした **Internal Database URL** |
| `NEXTAUTH_SECRET` | ランダム文字列（下記コマンドで生成） |
| `NEXTAUTH_URL` | デプロイ後のURL（例：`https://vtuber-ops.onrender.com`）※後から更新可 |
| `OPENAI_API_KEY` | OpenAI APIキー（案件資料のAI解析を使う場合は必須） |
| `NODE_ENV` | `production` |

`NEXTAUTH_SECRET` の生成方法（ローカルで実行）：
```bash
openssl rand -base64 32
# 出力例: K7x9mZ2pQ8vLnR4sT1uW6yB3cA5eH0jD...
```

---

### STEP 4：デプロイ実行

1. **Create Web Service** をクリック
2. 自動的にビルドが開始される（初回は5〜10分かかる）
3. ログに `✓ Ready` が表示されたら完了
4. 発行されたURL（例: `https://vtuber-ops.onrender.com`）にアクセスして確認

---

### STEP 5：NEXTAUTH_URLを本番URLに更新する

デプロイ後、実際のURLが確定したら：

1. Web Service → **Environment** タブ
2. `NEXTAUTH_URL` の値を実際のURLに更新
   ```
   https://vtuber-ops.onrender.com
   ```
3. **Save Changes** → 自動再デプロイ

---

### よくあるエラーと対処法

| エラー | 原因 | 対処 |
|--------|------|------|
| `prisma generate` 失敗 | `postinstall` スクリプトの実行エラー | Build Commandに `npx prisma generate` を含めていることを確認 |
| `P3005` マイグレーションエラー | DBとスキーマの不一致 | `npx prisma migrate deploy` がBuild Commandに含まれているか確認 |
| `ECONNREFUSED` DB接続失敗 | DATABASE_URLが未設定または間違い | Internal URLを使っているか確認（ExternalではなくInternal） |
| 502 Bad Gateway | アプリ起動失敗 | Render Dashboardのログを確認 |
| Freeプランのスリープ | 15分無操作でスリープ | 初回アクセスに30〜60秒かかる（仕様） |

---

### シードデータを本番DBに投入する（任意）

Render Shellから実行：

1. Web Service → **Shell** タブ
2. 以下を実行：
   ```bash
   npm run db:seed
   ```

---

## 🔮 今後の拡張予定

| 機能 | 説明 |
|------|------|
| AI文書生成のOpenAI API連携 | `lib/ai/generate.ts` のモックを実APIへ差し替え |
| 追加のログイン方式 | Google以外のIdP（必要な場合） |
| Google Drive連携 | レポートのGoogleドキュメント出力 |
| Google Sheets連携 | 数値データの自動取り込み |
| YouTube Analytics API | 動画指標の自動収集 |
| X API連携 | 投稿インサイトの自動取得 |
| Discord通知 | 承認依頼・完了通知 |
| PDFレポート出力 | クライアント提出用PDF生成 |
| Google Docs出力 | レポートのGoogle Docs連携 |
| 権限設定画面 | 利用者・ロールを管理する専用UI |

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


## Googleログインとアクセス制御

全業務APIと業務画面はログイン必須です。Googleで検証済みのメールアドレスが既存の`User.email`と一致する利用者だけログインできます。Googleログインによる利用者の自動作成・最初の利用者の管理者化・共通初期パスワードはありません。セッション発行後も各リクエストでDBの利用者と現ロールを確認し、削除・降格を即時反映します。

運用開始前に管理者が以下を設定してください（この修正では外部設定・本番DB操作は行いません）。

1. GoogleのWebアプリ用OAuth clientを用意し、コールバックURLを`https://<実ホスト>/api/auth/callback/google`に登録。ローカルは`http://localhost:3001/api/auth/callback/google`です。
2. `AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、十分にランダムな`AUTH_SECRET`（既存の`NEXTAUTH_SECRET`も互換）と実際の公開originの`AUTH_URL`を秘密管理に設定。IdPのclient secretや署名鍵をソースへ書かないでください。設定欠落時はログインできず、匿名アクセスを許可するfallbackはありません。
3. 既存の安全なDB管理経路で、実際にログインするメールを`User`へ事前登録しロールを割り当てます。最初の管理者もこの手順で用意します。既存のseedサンプルを実利用者の代用にしないでください。
4. 既存メールに大文字小文字だけ違う重複がないことを確認。利用停止時は該当Userを削除または必要なロールへ変更します（無効化フラグは現schemaにありません）。

| 操作 | admin | director | reviewer | viewer |
|---|---|---|---|---|
| 社内共有案件・顧客・利用者の閲覧 | 可 | 可 | 可 | 可 |
| 案件作成・業務編集・AI生成・数値/チェック更新 | 可 | 担当案件のみ（新規は自分が担当） | 不可 | 不可 |
| 文書/レポートの承認・差し戻し | 可 | 担当案件のみ | 可 | 不可 |
| 利用者の追加・ロール付与 | 可 | 不可 | 不可 | 不可 |

この権限表は既存schemaの4ロールを保守的に具体化したものです。案件の閲覧は社内共有を維持し、directorの変更は`Project.directorId`で制限します。既存の担当未設定案件はdirectorから変更できないため、運用開始前に管理者が適切な担当者を割り当ててください。権限のない操作はAPIが403、匿名APIは401を返します。画面の新規案件作成はadmin/directorに限ります。変更リクエストでは同一Originを検証するため、自動化クライアントも利用者認証と正しいOriginが必要です。

承認者・差し戻し者・チェック担当者はログイン本人のDB ID/名前を記録し、本文の氏名指定やその名前によるUser自動作成は行いません。通常の文書/レポート編集APIから`approved`を設定して専用承認を迂回することも拒否します。

### 隔離した検証

`npm ci --ignore-scripts`、`npx prisma generate`、`npm test`、`npx tsc --noEmit`で確認できます。テストはダミーの認証利用者とDB mockを用い、外部OAuth/DBへ通信しません。匿名の全業務API、権限不足、CSRF、担当外、氏名偽装、承認状態の直接変更、Googleのverified email/登録済み条件、削除/降格後セッションを検証します。実際のGoogle OAuthログインと本番DBを用いる業務操作は、管理者設定後に別途確認が必要です。

既存のレポート承認処理には、`Approval.documentId`の必須FKへreport IDを指定するschema不整合があり、実DBでの正規レポート承認成功はこの修正では保証しません。schema変更は今回行わず、更新と承認記録を同じtransactionへまとめ、FK等で失敗した場合は承認状態だけが残らないようにしています。文書承認の本人固定はmockを用いて検証します。

ロールバックはこの修正のコード/環境変数変更を対象として管理し、DBの破壊的変更はありません。公開環境で旧匿名APIへ戻すことは避け、必要なら上流でアクセス制限してから切り戻してください。
