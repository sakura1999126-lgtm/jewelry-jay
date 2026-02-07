# Stripe Webhook設定ガイド

## 環境変数の設定

Renderで以下の環境変数を設定してください：

### 必須環境変数

1. **STRIPE_SECRET_KEY**
   - Stripeダッシュボード → Developers → API keys → Secret key
   - 例: `sk_live_...` または `sk_test_...`

2. **STRIPE_WEBHOOK_SECRET**
   - Stripeダッシュボード → Developers → Webhooks → エンドポイントを選択 → Signing secret
   - 例: `whsec_...`
   - ⚠️ **重要**: 本番環境では必ず設定してください。設定しないとWebhookが動作しません。

3. **BASE_URL**
   - サイトのベースURL（デフォルト: `https://west-tokyo-jewels.com`）
   - 例: `https://west-tokyo-jewels.com`

### メール送信用環境変数（オプション）

メール送信機能を使用する場合：

4. **SMTP_HOST**
   - SMTPサーバーのホスト名
   - 例: `smtp.gmail.com` (Gmail), `smtp.sendgrid.net` (SendGrid)

5. **SMTP_PORT**
   - SMTPサーバーのポート番号（デフォルト: `587`）
   - 例: `587` (TLS), `465` (SSL)

6. **SMTP_SECURE**
   - SSL/TLSを使用する場合 `true`（デフォルト: `false`）
   - ポート465を使用する場合は `true`

7. **SMTP_USER**
   - SMTP認証用のユーザー名（メールアドレス）

8. **SMTP_PASS**
   - SMTP認証用のパスワード

9. **SMTP_FROM**
   - 送信元メールアドレス（省略時はSMTP_USERを使用）

## Webhookエンドポイントの設定

1. **Stripeダッシュボード**にログイン
2. **Developers** → **Webhooks**
3. **Add endpoint** をクリック
4. **Endpoint URL** に以下を入力：
   ```
   https://west-tokyo-jewels.com/api/webhook
   ```
5. **Events to send** で以下を選択：
   - `checkout.session.completed`
6. **Add endpoint** をクリック
7. **Signing secret** をコピーして、環境変数 `STRIPE_WEBHOOK_SECRET` に設定

## 動作確認

### ログの確認

Renderのログで以下のメッセージが表示されることを確認：

```
🔔 Webhook受信開始
✅ Webhook署名検証成功
📨 Webhook受信完了：[checkout.session.completed]
🛒 checkout.session.completed イベント処理開始
📋 Session ID: cs_...
📧 Customer Email: customer@example.com
🛍️ Cart Items: [{"productId":"prod_earring_5mm","quantity":1}]
📦 在庫更新処理開始（1件）
📦 在庫更新対象：[商品ID: prod_earring_5mm] / [数量: 1]
✅ 在庫更新: モアサナイトピアス 5mm - 24 → 23
✅ products.json保存完了
📊 在庫更新結果: 成功 1件 / 失敗 0件
✅ 在庫更新完了: Session cs_...
📧 メール送信処理開始: customer@example.com
📧 メール送信成功: Message ID <...>
✅ メール送信完了: customer@example.com
```

### テスト方法

1. テスト決済を実行
2. Renderのログを確認
3. `products.json` の在庫が減っているか確認
4. 顧客にメールが送信されているか確認

## トラブルシューティング

### Webhookが受信されない

- **STRIPE_WEBHOOK_SECRET** が設定されているか確認
- WebhookエンドポイントURLが正しいか確認（`https://west-tokyo-jewels.com/api/webhook`）
- Renderのログでエラーメッセージを確認

### 在庫が減らない

- `products.json` のファイルパスが正しいか確認
- 商品IDが正しいか確認（`cartItems` の `productId`）
- Renderのログでエラーメッセージを確認

### メールが送信されない

- SMTP環境変数がすべて設定されているか確認
- SMTP認証情報が正しいか確認
- Renderのログでエラーメッセージを確認

## セキュリティ

- **STRIPE_WEBHOOK_SECRET** は必ず設定してください
- 署名検証なしでWebhookを受け付けると、不正なリクエストを受け入れる可能性があります
- 本番環境では必ず署名検証を有効にしてください
