# Render デプロイガイド（jewelry-jay）

## Render とは

- **無料プラン**: 永久無料（スリープあり）
- **Node.js 対応**: server.js がそのまま動作
- **自動デプロイ**: GitHub にプッシュすると自動デプロイ
- **カスタムドメイン**: 無料で設定可能

---

## 前提

- **GitHub に `jewelry-jay` リポジトリがあること**（GITHUB_SETUP.md を完了していること）
- **リポジトリがパブリック**であること

---

## デプロイ手順

### ステップ1: Render アカウント

1. **https://render.com にアクセス**
2. **「Get Started for Free」→「Sign up with GitHub」** でログイン
   - **GitHub の Token は不要。** ブラウザで GitHub 認証するだけ。Render がリポジトリ一覧にアクセスできるようになる。

### ステップ2: Web サービス作成

1. **「New +」→「Web Service」**
2. **GitHub 接続**（初回のみ「Connect GitHub」）
3. **リポジトリ選択**:
   - 検索で `jewelry-jay` を入力
   - `sakura1999126-lgtm/jewelry-jay` を選択  
   - または **Public Git repository** に  
     `https://github.com/sakura1999126-lgtm/jewelry-jay` を入力

### ステップ3: 設定確認

`render.yaml` があるため、多くの項目は自動入力されます。確認：

- **Name**: `jewelry-jay`
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: 空白
- **Start Command**: `node server.js`

### ステップ4: デプロイ

**「Create Web Service」** をクリック。2〜3 分でデプロイされます。

---

## デプロイ後の URL

- **例**: `https://jewelry-jay.onrender.com`

（サービス名に応じて Render が自動で付けます）

---

## Stripe を使う場合

1. Render ダッシュボード → 該当サービス → **Environment**
2. **Add Environment Variable**
3. **Key**: `STRIPE_SECRET_KEY` / **Value**: Stripe の Secret key
4. **Save Changes**（自動で再デプロイ）

---

## 注意点（無料プラン）

- **スリープ**: 15 分アクセスがないとスリープ。初回起動に 30 秒程度かかることがあります。
- **月 750 時間**まで無料。

---

## 確認

デプロイ後、以下で動作確認：

```
https://jewelry-jay.onrender.com
https://jewelry-jay.onrender.com/api/products
```

JSON が返ってくれば成功です。
