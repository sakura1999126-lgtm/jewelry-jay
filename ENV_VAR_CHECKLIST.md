# 環境変数チェックリスト

## ✅ 確認済み（問題なし）

### STRIPE_SECRET_KEY
- ✅ **問題ありません**
- 理由: Stripeアカウントに紐づいているため、エンドポイントURLとは関係ない
- 同じStripeアカウントを使っている限り、`onrender.com`でも`west-tokyo-jewels.com`でも同じキーで動作します

**確認ポイント:**
- テストモード: `sk_test_...`
- 本番モード: `sk_live_...`
- 本番環境では本番キー（`sk_live_...`）を使用してください

---

## ⚠️ 修正が必要

### STRIPE_WEBHOOK_SECRET
- ⚠️ **修正が必要です**
- 理由: エンドポイントURLごとに異なる署名シークレットが発行される
- 現在: `onrender.com`用の署名シークレットが設定されている
- 必要: `west-tokyo-jewels.com`用の署名シークレットに更新

**修正方法:**
1. Stripeダッシュボード → 「Developers」→ 「Webhooks」
2. エンドポイントURLが `https://west-tokyo-jewels.com/api/webhook` のエンドポイントを開く
3. 「署名シークレット」の「表示」をクリック
4. 新しい署名シークレットをコピー
5. Renderで `STRIPE_WEBHOOK_SECRET` を更新

---

## 📝 追加が必要

### BASE_URL
- ⚠️ **追加が必要です**
- Key: `BASE_URL`
- Value: `https://west-tokyo-jewels.com`

---

## 📋 最終チェックリスト

- [x] `STRIPE_SECRET_KEY` - 設定済み（問題なし）
- [ ] `STRIPE_WEBHOOK_SECRET` - 更新が必要（`west-tokyo-jewels.com`用に）
- [ ] `BASE_URL` - 追加が必要

---

## 🎯 今すぐやること

1. ✅ `STRIPE_SECRET_KEY` - そのままでOK
2. ⚠️ `STRIPE_WEBHOOK_SECRET` - 正しい値に更新
3. ⚠️ `BASE_URL` - 追加

完了後、「Save Changes」をクリックして再デプロイ！
