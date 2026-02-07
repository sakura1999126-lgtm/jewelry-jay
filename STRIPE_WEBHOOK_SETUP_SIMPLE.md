# Stripe Webhook設定ガイド（初心者向け）

## 📌 このガイドの目的

決済が成功したときに、自動で以下を実行するための設定です：
1. ✅ 商品の在庫を減らす
2. ✅ お客様に注文確認メールを送る

---

## 🎯 全体の流れ（3ステップ）

```
1. StripeでWebhookを設定
   ↓
2. Renderで環境変数を設定
   ↓
3. テストして確認
```

---

## 📝 ステップ1: StripeでWebhookを設定する

### 1-1. Stripeダッシュボードにログイン

1. **https://dashboard.stripe.com** にアクセス
2. アカウントにログイン

### 1-2. Webhookエンドポイントを作成

1. 左メニューから **「Developers」** をクリック
2. **「Webhooks」** をクリック
3. **「Add endpoint」** ボタンをクリック

### 1-3. エンドポイントURLを入力

**「Endpoint URL」** の欄に以下を入力：

```
https://west-tokyo-jewels.com/api/webhook
```

⚠️ **重要**: 
- `west-tokyo-jewels.com` の部分は、あなたのサイトのURLに合わせてください
- 最後の `/api/webhook` は必ず含めてください

### 1-4. イベントを選択

**「Select events to listen to」** で以下を選択：

- ✅ **`checkout.session.completed`** にチェックを入れる

（これは「決済が完了したとき」という意味です）

### 1-5. エンドポイントを作成

**「Add endpoint」** ボタンをクリック

### 1-6. Signing secretをコピー

作成されたWebhookエンドポイントをクリックすると、**「Signing secret」** という項目があります。

**「Reveal」** または **「Click to reveal」** をクリックして、表示された文字列をコピーします。

例: `whsec_1234567890abcdef...`

⚠️ **重要**: この文字列は後で使うので、メモ帳などに保存しておいてください。

---

## 📝 ステップ2: Renderで環境変数を設定する

### 2-1. Renderダッシュボードにアクセス

1. **https://render.com** にアクセス
2. アカウントにログイン

### 2-2. サービスを選択

1. **「Dashboard」** をクリック
2. **`jewelry-jay`** というサービスをクリック

### 2-3. 環境変数の設定画面を開く

1. 左メニューから **「Environment」** をクリック
2. **「Add Environment Variable」** ボタンをクリック

### 2-4. 必須の環境変数を追加

以下の3つを**必ず**追加してください：

#### ① STRIPE_SECRET_KEY

- **Key**: `STRIPE_SECRET_KEY`
- **Value**: Stripeダッシュボードの **「Developers」** → **「API keys」** → **「Secret key」** をコピー
  - 例: `sk_live_...` または `sk_test_...`

#### ② STRIPE_WEBHOOK_SECRET

- **Key**: `STRIPE_WEBHOOK_SECRET`
- **Value**: ステップ1-6でコピーしたSigning secret
  - 例: `whsec_1234567890abcdef...`

#### ③ BASE_URL

- **Key**: `BASE_URL`
- **Value**: `https://west-tokyo-jewels.com`
  - ⚠️ あなたのサイトのURLに合わせてください

### 2-5. メール送信用の環境変数（オプション）

メールを自動送信したい場合のみ設定してください：

#### ④ SMTP_HOST

- **Key**: `SMTP_HOST`
- **Value**: 
  - Gmailを使う場合: `smtp.gmail.com`
  - SendGridを使う場合: `smtp.sendgrid.net`
  - その他のメールサービス: そのサービスのSMTPサーバー名

#### ⑤ SMTP_PORT

- **Key**: `SMTP_PORT`
- **Value**: `587`
  - （通常は587でOKです）

#### ⑥ SMTP_USER

- **Key**: `SMTP_USER`
- **Value**: メールアドレス
  - 例: `your-email@gmail.com`

#### ⑦ SMTP_PASS

- **Key**: `SMTP_PASS`
- **Value**: メールのパスワード
  - Gmailの場合: 「アプリパスワード」を使用してください
    - Googleアカウント設定 → セキュリティ → 2段階認証 → アプリパスワード

#### ⑧ SMTP_FROM（省略可）

- **Key**: `SMTP_FROM`
- **Value**: 送信元として表示したいメールアドレス
  - 省略した場合は、SMTP_USERが使われます

### 2-6. 環境変数を保存

すべての環境変数を追加したら、**「Save Changes」** をクリック

⚠️ **重要**: 保存すると自動で再デプロイが始まります（数分かかります）

---

## 📝 ステップ3: 動作確認

### 3-1. テスト決済を実行

1. サイトにアクセス: `https://west-tokyo-jewels.com`
2. 商品をカートに追加
3. 決済ページに進む
4. テストカードで決済を完了
   - カード番号: `4242 4242 4242 4242`
   - 有効期限: 未来の日付（例: 12/25）
   - CVC: 任意の3桁（例: 123）

### 3-2. Renderのログを確認

1. Renderダッシュボード → `jewelry-jay` サービス
2. 左メニューから **「Logs」** をクリック
3. 以下のようなメッセージが表示されていれば成功です：

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
📧 メール送信処理開始: test@example.com
📧 メール送信成功: Message ID <...>
✅ メール送信完了: test@example.com
```

### 3-3. 在庫が減っているか確認

1. GitHubで `products.json` ファイルを開く
2. 購入した商品の `stock` の数が減っているか確認

### 3-4. メールが届いているか確認

- メール送信を設定した場合、注文したメールアドレスに確認メールが届いているか確認

---

## ❓ よくある質問

### Q1: Webhookが動作しません

**確認ポイント：**
1. ✅ `STRIPE_WEBHOOK_SECRET` が設定されているか
2. ✅ WebhookエンドポイントURLが正しいか（`https://west-tokyo-jewels.com/api/webhook`）
3. ✅ Renderのログでエラーメッセージを確認

### Q2: 在庫が減りません

**確認ポイント：**
1. ✅ 商品IDが正しいか（`products.json` の `id` と一致しているか）
2. ✅ Renderのログでエラーメッセージを確認
3. ✅ `products.json` ファイルが正しく読み込めているか

### Q3: メールが送信されません

**確認ポイント：**
1. ✅ SMTP環境変数がすべて設定されているか
2. ✅ SMTP認証情報（ユーザー名・パスワード）が正しいか
3. ✅ Gmailを使う場合、アプリパスワードを使用しているか
4. ✅ Renderのログでエラーメッセージを確認

### Q4: エラーメッセージが表示されます

Renderのログに表示されるエラーメッセージを確認してください：

- **「STRIPE_WEBHOOK_SECRET not configured」**
  → 環境変数 `STRIPE_WEBHOOK_SECRET` を設定してください

- **「Webhook signature verification failed」**
  → `STRIPE_WEBHOOK_SECRET` の値が間違っています。Stripeダッシュボードで再確認してください

- **「Product not found」**
  → 商品IDが間違っています。`products.json` を確認してください

- **「Email transporter not configured」**
  → メール送信を使わない場合は無視してOK。使う場合はSMTP環境変数を設定してください

---

## 🎉 完了！

これで設定は完了です。決済が成功すると、自動で：
- ✅ 在庫が減ります
- ✅ お客様にメールが送られます

何か問題があれば、Renderのログを確認してください！
