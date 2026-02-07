# GitHub リポジトリ設定（jewelry-jay）

## このプロジェクト用の設定

jewelry-jay を GitHub と Render に繋げて運用します。

---

## ステップ1: GitHub で新しいリポジトリを作成

1. **https://github.com/new にアクセス**
2. **入力**:
   - **Repository name**: `jewelry-jay`
   - **Description**: `ジュエリーECサイト`
   - **Public** を選択（Render デプロイに必要）
   - **Add a README file** のチェックは**外す**（既にファイルがあるため）
3. **「Create repository」をクリック**
4. **表示されたリポジトリURLをコピー**（例: `https://github.com/sakura1999126-lgtm/jewelry-jay`）

---

## ステップ2: 既存の origin を jewelry-jay に切り替え

jewelry-jay フォルダで、リモートを新しいリポジトリに変更します：

```bash
cd /Users/sakurairintaro/jewelry-jay

# 現在のリモートを確認
git remote -v

# origin を jewelry-jay リポジトリに変更（URLは自分のリポジトリに合わせる）
git remote set-url origin https://github.com/sakura1999126-lgtm/jewelry-jay.git

# 確認
git remote -v
```

※ GitHub のユーザー名が `sakura1999126-lgtm` でない場合は、上記の URL を自分のユーザー名・リポジトリ名に変更してください。

---

## ステップ3: 初回プッシュ

```bash
cd /Users/sakurairintaro/jewelry-jay

# 変更をコミット（未コミットがあれば）
git add .
git commit -m "jewelry-jay 用に設定更新"

# 新しい jewelry-jay リポジトリにプッシュ
git push -u origin main
```

**認証（パスワードを聞かれた場合）**

- **パスワード**の欄には、GitHub の**パスワードではなく Personal Access Token** を入力する。
- Token の作り方: GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token**。`repo` にチェックを入れて発行し、表示されたトークンをコピーする。
- **Token はプロジェクトのファイルには書かない・保存しない。** その場で入力するだけ。`git push` のたびに聞かれる場合は、Mac の「キーチェーン」に保存されることがある。

※ リポジトリを新規作成した場合は、**「Add a README」にチェックを入れなかった**場合、上記でそのままプッシュできます。README を追加して作成した場合は、`git pull origin main --rebase` してから `git push -u origin main` が必要な場合があります。

---

## リポジトリをパブリックにする

Render の無料プランでは**パブリック**が簡単です。

1. リポジトリ → **Settings**
2. 一番下 **Danger Zone** → **Change visibility**
3. **Change to public** を選択

---

## 確認

- [ ] リポジトリ `jewelry-jay` が存在する
- [ ] パブリックである
- [ ] `git remote -v` で `jewelry-jay` を指している
- [ ] `git push origin main` でプッシュできる

---

## 次のステップ

GitHub の設定ができたら、**RENDER_DEPLOY.md** の手順で Render にデプロイしてください。
