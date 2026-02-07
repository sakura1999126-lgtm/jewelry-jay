# Supabase設定手順

## ステップ1: Supabase接続情報を取得

1. Supabaseダッシュボードにログイン: https://supabase.com/dashboard
2. プロジェクトを選択
3. 左メニューの「Settings」（⚙️）をクリック
4. 「API」をクリック
5. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`（長い文字列）

## ステップ2: 設定ファイルを編集

`supabase-config.js` ファイルを開いて、以下の値を置き換えてください：

```javascript
const SUPABASE_CONFIG = {
    url: 'https://xxxxx.supabase.co',  // ← あなたのProject URL
    anonKey: 'eyJhbGc...'              // ← あなたのanon public key
};
```

## ステップ3: 動作確認

1. ブラウザでサイトを開く
2. 開発者ツール（F12）のコンソールを開く
3. エラーが出ていなければ成功です
4. 商品が表示されれば、Supabase接続成功です！

## トラブルシューティング

### エラー: "supabase is not defined"
- `supabase-config.js` が正しく読み込まれているか確認
- SupabaseのCDNが読み込まれているか確認（index.html）

### エラー: "Invalid API key"
- `supabase-config.js` の `anonKey` が正しいか確認
- SupabaseダッシュボードでAPIキーを再確認

### 商品が表示されない
- SupabaseのTable Editorで商品データが存在するか確認
- ブラウザのコンソールでエラーメッセージを確認
