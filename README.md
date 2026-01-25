# ジュエリーECサイト

HipHopBlingを参考にした、背景動画付きのジュエリーECサイトです。Stripe決済統合の準備が整っています。

## 機能

- 背景動画の自動再生
- サイドバーによる商品カテゴリフィルタリング（ピアス、ネックレス、ブレスレット）
- 商品一覧表示
- カート機能（ローカルストレージ保存）
- 決済ページ（Stripe統合用プレースホルダー）
- レスポンシブデザイン

## GitHub と Render への接続

このプロジェクト（jewelry-jay）を GitHub と Render に繋げる手順：

1. **GITHUB_SETUP.md** … リポジトリ `jewelry-jay` の作成と `git remote` の切り替え
2. **RENDER_DEPLOY.md** … Render での Web サービス作成とデプロイ

## セットアップ（ローカル）

1. プロジェクトディレクトリに移動
```bash
cd jewelry-jay
```

2. サーバーを起動
```bash
npm start
```

3. ブラウザでアクセス
```
http://localhost:3006
```

## ファイル構成

- `index.html` - メインページ
- `checkout.html` - 決済ページ
- `server.js` - Node.jsサーバー（ポート3006）
- `styles.css` - スタイルシート
- `script.js` - クライアントサイドJavaScript
- `products.json` - 商品データ（Stripe連携用構造）
- `package.json` - プロジェクト設定

## 背景動画の設定

背景動画ファイルを `background-video.mp4` としてプロジェクトルートに配置してください。

動画が読み込めない場合は、CSSのフォールバック背景が表示されます。

## APIエンドポイント

- `GET /api/products` - 商品一覧取得
- `GET /api/products/:id` - 商品詳細取得
- `POST /api/checkout` - 決済セッション作成（Stripe統合用）

## Stripe統合について

現在、決済機能はプレースホルダーとして実装されています。Stripe統合を実装する際は以下の手順を参考にしてください：

1. Stripeアカウントの作成とAPIキーの取得
2. `server.js`の`/api/checkout`エンドポイントにStripe Checkout Session作成処理を追加
3. `checkout.html`にStripe.js SDKを読み込み
4. カートデータをStripe Checkout Sessionに変換

商品データは既にStripe Product/Price形式に準拠した構造になっています。

## 商品データの編集

`products.json`を編集することで商品を追加・編集できます。各商品には以下の情報が必要です：

- `id`: 商品ID（Stripe Product ID用）
- `name`: 商品名
- `category`: カテゴリ（earrings, necklace, bracelet）
- `price`: 価格（数値）
- `currency`: 通貨（JPY）
- `image`: 画像URL
- `description`: 商品説明
- `stock`: 在庫数（オプション）

## ライセンス

MIT

