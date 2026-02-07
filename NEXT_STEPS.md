# 🎯 今すぐやること（3ステップ）

## ✅ ステップ1: Stripeの署名シークレットをコピー

1. StripeのWebhookページで **「署名シークレット」** の **「表示」** をクリック
2. `whsec_...` で始まる文字列をコピー
3. メモ帳などに保存

## ✅ ステップ2: Renderで環境変数を設定

### 2-1. Renderダッシュボードを開く
- https://render.com にアクセス
- ログイン

### 2-2. サービスを選択
- **「Dashboard」** をクリック
- **`jewelry-jay`** サービスをクリック

### 2-3. 環境変数の設定画面を開く
- 左メニューから **「Environment」** をクリック
- 既に `STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` が設定されていることを確認

### 2-4. BASE_URLを追加

#### ③ BASE_URL（追加が必要）
- **「Add Environment Variable」** ボタンをクリック
- **Key**: `BASE_URL`
- **Value**: `https://west-tokyo-jewels.com`
- **「Save」** をクリック

### 2-5. 保存
- **「Save Changes」** ボタンをクリック（画面下部にあるはず）
- ⚠️ 自動で再デプロイが始まります（数分かかります）

### 📋 現在の設定状況
- ✅ `STRIPE_SECRET_KEY` - 設定済み
- ✅ `STRIPE_WEBHOOK_SECRET` - 設定済み
- ⚠️ `BASE_URL` - 追加が必要

## ✅ ステップ3: 動作確認

### 3-1. 再デプロイ完了を待つ
- Renderのダッシュボードで「Live」と表示されるまで待つ（数分）

### 3-2. テスト決済を実行
1. サイトにアクセス: `https://west-tokyo-jewels.com`
2. 商品をカートに追加
3. 決済ページに進む
4. テストカードで決済:
   - **カード番号**: `4242 4242 4242 4242`
   - **有効期限**: 未来の日付（例: 12/25）
   - **CVC**: 任意の3桁（例: 123）

### 3-3. Renderのログを確認
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

### 3-4. 在庫が減っているか確認
1. GitHubで `products.json` ファイルを開く
2. 購入した商品の `stock` の数が減っているか確認

---

## ⚠️ 重要なポイント

- ✅ **署名シークレットは必ず設定する**（設定しないとWebhookが動作しません）
- ✅ **環境変数を保存すると自動で再デプロイされます**
- ✅ **再デプロイが完了するまで数分かかります**

---

## 🎉 完了！

これで設定は完了です。決済が成功すると、自動で：
- ✅ 在庫が減ります
- ✅ Stripeが自動でメールを送ります

何か問題があれば、Renderのログを確認してください！
