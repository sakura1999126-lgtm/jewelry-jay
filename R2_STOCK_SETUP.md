# R2在庫管理設定ガイド

## 概要

`products.json`をCloudflare R2に保存することで、デプロイ後も在庫が保持されます。

## 必要な環境変数（Renderに設定）

以下の4つの環境変数をRenderのダッシュボードで設定してください：

### 1. R2_ACCESS_KEY_ID（必須）
- Cloudflare R2のアクセスキーID

### 2. R2_SECRET_ACCESS_KEY（必須）
- Cloudflare R2のシークレットアクセスキー

### 3. R2_BUCKET（オプション）
- R2バケット名
- デフォルト: `jewelry-jay`
- 既に使用しているバケット名があれば、その名前を設定

### 4. R2_ACCOUNT_ID（オプション）
- CloudflareアカウントID
- デフォルト: `6b5659759b32352c1271481b370a3e4d`
- 既に使用しているアカウントIDがあれば、そのIDを設定

## R2認証情報の取得方法

### ステップ1: Cloudflareダッシュボードにログイン
1. https://dash.cloudflare.com にアクセス
2. ログイン

### ステップ2: R2にアクセス
1. 左メニューから「R2」をクリック
2. 既存のバケット（`jewelry-jay`など）を選択、または新規作成

### ステップ3: APIトークンを作成
1. R2ダッシュボードの右上「Manage R2 API Tokens」をクリック
2. 「Create API token」をクリック
3. 以下の設定：
   - **Token name**: `jewelry-jay-stock-management`（任意の名前）
   - **Permissions**: `Object Read & Write` を選択
   - **TTL**: 無期限（または適切な期間）
   - **Bucket**: 使用するバケットを選択（例: `jewelry-jay`）
4. 「Create API Token」をクリック
5. **重要**: 表示された `Access Key ID` と `Secret Access Key` をコピー（後で確認できません）

### ステップ4: アカウントIDを確認
1. Cloudflareダッシュボードの右側サイドバー下部に表示されている「Account ID」をコピー
2. または、任意のページのURLに含まれるアカウントIDを確認

## Renderでの環境変数設定

1. Renderダッシュボード → 該当サービス（`jewelry-jay`）を選択
2. 左メニュー「Environment」をクリック
3. 「Add Environment Variable」をクリック
4. 以下の4つを追加：

```
Key: R2_ACCESS_KEY_ID
Value: [ステップ3で取得したAccess Key ID]
```

```
Key: R2_SECRET_ACCESS_KEY
Value: [ステップ3で取得したSecret Access Key]
```

```
Key: R2_BUCKET
Value: jewelry-jay
```

```
Key: R2_ACCOUNT_ID
Value: [ステップ4で取得したAccount ID]
```

5. 「Save Changes」をクリック（自動で再デプロイされます）

## 動作確認

### デプロイ後のログを確認

Renderのログで以下のメッセージが表示されれば成功：

```
R2 client initialized successfully
✅ products.jsonをR2から復元しました
```

または（初回の場合）：

```
R2 client initialized successfully
✅ products.jsonをテンプレートから作成しました
✅ products.jsonをR2に保存しました
```

### 在庫の保持確認

1. テスト購入を実行して在庫を減らす（例: 24 → 23）
2. Renderで再デプロイを実行
3. 再度在庫を確認 → **23のまま保持されている**ことを確認

## トラブルシューティング

### RenderでデプロイしてもR2が見れない・在庫が反映されない
- **原因**: Renderの「Environment」にR2の環境変数が入っていないためです。Gitに`.env`や`products.json`は含まれないので、**デプロイだけではR2には接続されません。**
- **対処**:
  1. Renderダッシュボード → 該当サービス（jewelry-jay）→ 左メニュー **「Environment」**
  2. **「Add Environment Variable」** で以下を追加（値はCloudflareで取得したもの）:
     - `R2_ACCESS_KEY_ID` = Access Key ID
     - `R2_SECRET_ACCESS_KEY` = Secret Access Key
  3. **「Save Changes」** をクリック（自動で再デプロイされます）
  4. 再デプロイ後、ログに `R2 client initialized successfully` と `products.jsonをR2から復元しました` が出ているか確認
- **確認用URL**: 本番の `https://あなたのドメイン/api/r2-status` にアクセスし、`r2Configured: true` になっていればR2は有効です。

### エラー: "R2 not configured"
- 環境変数が正しく設定されているか確認
- 環境変数の名前が正確か確認（大文字小文字に注意）

### エラー: "Failed to initialize R2 client"
- `R2_ACCESS_KEY_ID` と `R2_SECRET_ACCESS_KEY` が正しいか確認
- Cloudflare R2のAPIトークンが有効か確認

### エラー: "NoSuchKey" または "Access Denied"
- R2バケット名が正しいか確認
- APIトークンの権限が `Object Read & Write` になっているか確認
- バケットが存在するか確認

### 在庫がリセットされる
- R2への保存が成功しているかログで確認
- `✅ products.jsonをR2に保存しました` というメッセージが出ているか確認
- R2バケットに `products.json` が存在するか確認

## 注意事項

- R2のAPIトークンは機密情報です。GitHubにコミットしないでください
- 環境変数はRenderのダッシュボードでのみ設定してください
- デプロイ後、初回はテンプレートから作成されますが、2回目以降はR2から復元されます
