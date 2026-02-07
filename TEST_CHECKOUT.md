# 🧪 テスト決済の手順

## ✅ 環境変数設定完了

以下の環境変数が設定されました：
- ✅ `BASE_URL` - `https://west-tokyo-jewels.com`
- ✅ `STRIPE_SECRET_KEY` - 設定済み
- ✅ `STRIPE_WEBHOOK_SECRET` - 設定済み

---

## 🎯 動作確認の手順

### ステップ1: 再デプロイ完了を待つ

1. Renderダッシュボードで **「Live」** と表示されるまで待つ（数分）
2. 再デプロイ中は **「Deploying...」** と表示されます

### ステップ2: テスト決済を実行

1. **サイトにアクセス**: `https://west-tokyo-jewels.com`
2. **商品をカートに追加**
3. **決済ページに進む**
4. **テストカードで決済**:
   - **カード番号**: `4242 4242 4242 4242`
   - **有効期限**: 未来の日付（例: 12/25）
   - **CVC**: 任意の3桁（例: 123）
   - **郵便番号**: 任意（例: 123-4567）

### ステップ3: Renderのログを確認

1. Renderダッシュボード → `jewelry-jay` サービス
2. 左メニューから **「Logs」** をクリック
3. 以下のようなメッセージが表示されれば成功：

```
🔔 Webhook受信開始
✅ Webhook署名検証成功
📨 Webhook受信完了：[checkout.session.completed]
🛒 checkout.session.completed イベント処理開始
📋 Session ID: cs_...
📧 Customer Email: test@example.com
🛍️ Cart Items: [{"productId":"prod_earring_5mm","quantity":1}]
📦 在庫更新処理開始（1件）
📦 在庫更新対象：[商品ID: prod_earring_5mm] / [数量: 1]
✅ 在庫更新: モアサナイトピアス 5mm - 24 → 23
✅ products.json保存完了
📊 在庫更新結果: 成功 1件 / 失敗 0件
✅ 在庫更新完了: Session cs_...
```

### ステップ4: 在庫が減っているか確認

1. GitHubで `products.json` ファイルを開く
2. 購入した商品の `stock` の数が減っているか確認

---

## ✅ 成功の目安

- ✅ ログに **「✅ Webhook署名検証成功」** が表示される
- ✅ ログに **「✅ 在庫更新完了」** が表示される
- ✅ `products.json` の在庫が減っている

---

## ❌ エラーが出た場合

### 「❌ Webhook署名検証失敗」
→ `STRIPE_WEBHOOK_SECRET` が間違っています
- Stripeで正しい署名シークレットを確認して更新してください

### 「❌ 商品が見つかりません」
→ 商品IDが間違っています
- `products.json` の `id` と `cartItems` の `productId` が一致しているか確認してください

### 「❌ 在庫更新エラー」
→ `products.json` の読み書きに問題があります
- GitHubで `products.json` が正しく保存されているか確認してください

---

## 🎉 完了！

すべて成功すれば、決済が成功すると自動で：
- ✅ 在庫が減ります
- ✅ Stripeが自動でメールを送ります
