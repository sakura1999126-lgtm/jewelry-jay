# R2 へのアップロード手順

## 1. R2 API トークンを作成

1. Cloudflare ダッシュボードで **R2** を開く
2. 右側の **「Manage R2 API Tokens」** をクリック
3. **「Create API token」** をクリック
4. **Token name**: 例 `jewelry-jay-upload`
5. **Permissions**: **Object Read & Write** を選択
6. **Specify bucket(s)** で **jewelry-jay** を選択（または All buckets）
7. **「Create API Token」** をクリック
8. 表示された **Access Key ID** と **Secret Access Key** をコピー（Secret はこのあと再表示されません）

## 2. .env にキーを書く

プロジェクトのルート（jewelry-jay フォルダ）に `.env` を作成し、次の2行を追加（値はあなたのキーに置き換え）:

```
R2_ACCESS_KEY_ID=ここにAccess Key IDを貼る
R2_SECRET_ACCESS_KEY=ここにSecret Access Keyを貼る
```

## 3. アップロードを実行

```bash
cd /Users/sakurairintaro/jewelry-jay
npm install
node scripts/upload-to-r2.js
```

成功すると「アップロード完了」が表示されます（ロゴ・動画 + ネックレス／ブレスレット／ピアスの商品画像。商品画像は `products/` に保存され、`products.json` から R2 の URL で参照されます）。

## 4. R2 で公開URLを有効にする

1. Cloudflare ダッシュボード → **R2** → バケット **jewelry-jay** をクリック
2. **「Settings」** タブを開く
3. **「Public access」** の **「Allow Access」** をクリック
4. **「R2.dev subdomain」** を有効にし、表示された URL（例: `https://pub-xxxx.r2.dev`）をコピー

この URL が画像・動画のベースURLになります。**画像が表示されない場合は、ここで「Allow Access」と「R2.dev subdomain」が有効か必ず確認してください。**

## 5. サイトを R2 の URL で表示する

1. 上記でコピーした **R2 の公開 URL**（例: `https://pub-abc123xyz.r2.dev`）を用意する
2. プロジェクト内で次の文字列を **すべて** 置き換える:
   - 検索: `https://pub-YOUR_R2_PUBLIC_ID.r2.dev`
   - 置換: あなたの R2 公開 URL（末尾にスラッシュなし）
3. 対象ファイル: `index.html`（3箇所）, `checkout.html`（1箇所）
4. 変更をコミットして GitHub にプッシュ → Render が自動で再デプロイし、画像・動画は R2 から配信されます

（任意）リポジトリを軽くする: `public/videos/` や `images/` の大容量ファイルを削除し、`.gitignore` に `public/videos/*.mp4` と `images/*.png` を追加してもよいです。
