# Stripe実装チェックリスト

## ✅ 完了していること

### フロントエンド
- ✅ 購入者情報フォームを削除
- ✅ Stripe Checkoutボタンを追加
- ✅ カートデータをStripe形式に変換する処理を実装
- ✅ `/api/checkout` APIを呼び出す処理を実装
- ✅ エラーハンドリングを実装

### サーバー側（プレースホルダー）
- ✅ `/api/checkout` エンドポイントが存在
- ⚠️ 実際のStripe Checkout Session作成処理は未実装（プレースホルダー）

---

## ❌ 実装が必要なこと

### 1. サーバー側のStripe実装

#### 必要なパッケージ
```bash
npm install stripe
```

#### server.js の修正が必要

現在の`/api/checkout`エンドポイントはプレースホルダーです。以下を実装する必要があります：

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// /api/checkout エンドポイントで
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: lineItems,
  mode: 'payment',
  success_url: successUrl,
  cancel_url: cancelUrl,
  customer_email: null, // Stripeが管理
  shipping_address_collection: {
    allowed_countries: ['JP']
  },
  locale: 'ja'
});

res.end(JSON.stringify({ sessionId: session.id, url: session.url }));
```

---

### 2. 環境変数の設定

#### 必要な環境変数
- `STRIPE_SECRET_KEY`: Stripeのシークレットキー（本番用）
- `STRIPE_PUBLISHABLE_KEY`: Stripeの公開キー（フロントエンド用、必要に応じて）

#### Cloudflare Pagesでの設定
Cloudflare Pagesは静的サイトホスティングなので、サーバーサイドコードは実行できません。

**解決策:**
1. **Cloudflare Workersを使用**（推奨）
   - Serverless FunctionsとしてStripe APIを実装
   - `/api/checkout` をCloudflare Workersとして実装

2. **別のサーバーを使用**
   - Heroku、Vercel、Netlify Functionsなどを使用
   - サーバー側APIを別途ホスティング

3. **StripeのManaged Checkoutを使用**
   - 最も簡単だが、カスタマイズ性が低い

---

### 3. フロントエンドの修正（実装後）

#### checkout.html の修正が必要

Stripe実装後、以下のコードを有効化：

```javascript
// 現在はコメントアウトされている部分
// window.location.href = data.url;
```

実際のStripe Checkout URLにリダイレクトするように変更。

---

### 4. checkout-success.html の修正

Stripeから戻ってきたときの処理：

```javascript
// URLパラメータからsession_idを取得
const sessionId = urlParams.get('session_id');

if (sessionId) {
  // Stripe Checkout Sessionを確認
  // 注文データを取得
  // 注文完了ページに表示
}
```

---

## 📋 実装手順（友達が後で実装する場合）

### ステップ1: Stripeアカウント作成
1. https://stripe.com でアカウント作成
2. ダッシュボードからAPIキーを取得

### ステップ2: サーバー側実装
1. `npm install stripe`
2. `server.js` の `/api/checkout` を実装
3. 環境変数を設定

### ステップ3: Cloudflare Workersの設定（推奨）
1. Cloudflare Workersプロジェクトを作成
2. Stripe APIを呼び出すWorkerを実装
3. `/api/checkout` をWorkerに設定

### ステップ4: テスト
1. Stripeのテストモードでテスト
2. 実際の決済フローを確認

---

## 現在の状態

### フロントエンド
- ✅ Stripe Checkoutボタンが実装済み
- ✅ カートデータの変換処理が実装済み
- ✅ API呼び出し処理が実装済み
- ⚠️ 実際のリダイレクトはプレースホルダー（完了ページに移動）

### サーバー側
- ✅ APIエンドポイントが存在
- ❌ 実際のStripe実装は未完了

---

## 結論

**フロントエンドは準備完了！** ✅

**サーバー側の実装が必要です。** ❌

友達が後でStripe実装をする場合、`server.js`の`/api/checkout`エンドポイントを実装するだけで動作します。

または、Cloudflare Workersを使用する場合は、別途Workerプロジェクトを作成する必要があります。
