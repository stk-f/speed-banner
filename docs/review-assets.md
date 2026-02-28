# Review Assets — スクショ撮影リスト・動画台本・提出前チェックリスト

審査提出時に添付するアセットの作成ガイドです。

---

## Trial 証跡について

**主根拠は SS-2 の実スクショです。**
Shopify 請求承認画面に "Free trial: 30 days" が写っていることが証跡の中核です。
コードレベルの根拠は末尾の [Appendix](#appendix-code-trace-reference) に記載しています。

> SS-2 の取得はユーザー側作業です（`.env` 要・アプリ起動が必要）。
>
> 詳細は [SS-2 詳細手順](#ss-2--billing-approval--ユーザー側作業) を参照してください。

---

## 1. スクショ撮影リスト（7 枚）

撮影順に並んでいます。開発ストアの画面を使用してください。

| # | 画面 | URL / 場所 | 撮影ポイント（概要） |
|---|------|-----------|------------------|
| SS-1 | プラン選択（アプリ内） | `/app/select-plan` | Monthly $9・Annual $90 の 2 カードと「30-day free trial.」文言 |
| **SS-2** | **Shopify 請求承認画面** | Shopify Admin（自動遷移） | "Free trial: 30 days"・金額・Approve ボタンが 1 枚に収まること |
| SS-3 | Dashboard（承認直後） | `/app` | "Current Plan: Monthly Subscription" と Analytics = 0 |
| SS-4 | キャンペーン一覧 | `/app/campaigns` | `Hello Reviewer` が Active バッジで表示されている |
| SS-5 | Theme Editor | Online Store › Themes › Customize | 左サイドバーに Banner Block セクションが追加されている |
| SS-6 | ストアフロント | ストアフロント任意ページ | 画面下部に黒帯バナー「Hello Reviewer」が表示されている |
| SS-7 | DevTools Network | ストアフロント（F12 → Network） | `/apps/speed-banner/event` が Status 200・Response `{}` |

> **SS-2 はユーザー側作業です。** `.env`（`SHOPIFY_API_KEY` 等）とアプリ起動が必要です。
> 詳細は下記 [SS-2 詳細手順](#ss-2--billing-approval--ユーザー側作業) を参照してください。

SS-1〜SS-4 は Shopify Admin の画面です（SS-2 のみ Shopify ネイティブ請求画面）。ブラウザウィンドウ全体（URL バー含む）をキャプチャしてください。

### ファイル名規約

```
assets/
  ss-01-select-plan.png
  ss-02-billing-approval-trial30.png    ← Trial 証跡の主ファイル
  ss-03-dashboard-after-approval.png
  ss-04-campaign-list-active.png
  ss-05-theme-editor-block.png
  ss-06-storefront-banner.png
  ss-07-devtools-event-200.png
```

---

### SS-2 — Billing approval — ユーザー側作業

> ⚠️ **この手順はユーザーが手動で実施してください。** `.env` がないと起動できません。

**承認画面に写す 3 要素（すべてが 1 枚に収まること）:**

1. "Free trial: 30 days"（または "Your free trial ends on [date]"）
2. 金額: $9.00 USD every 30 days
3. "Approve" ボタン

**取得手順:**

1. `.env` に `SHOPIFY_BILLING_TEST=true` を設定して `shopify app dev` を起動する。
2. 開発ストアにアクセスし、`/app/select-plan` にリダイレクトされることを確認する（未課金状態）。
3. 「**Select Monthly**」をクリックする。
4. アプリが Shopify 承認画面（`confirmationUrl`）へ自動リダイレクトする。
5. 上記 3 要素が表示されていることを確認し、`assets/ss-02-billing-approval-trial30.png` として保存する。
6. 「**Approve**」をクリックし、Dashboard に遷移したら SS-3 を撮影する。

**表示が期待通りでない場合の切り分け:**

- *承認なしで Dashboard に遷移する* → `billing.check()` が `hasActivePayment: true` を返している。Shopify Admin で既存サブスクリプションをキャンセルして再試行。
- *"Free trial: 0 days" または trial 表示なし* → 同一ストアで trial 消化済み。Partner Dashboard → Stores → **Remove app** でリセットし、別ストアまたは再インストールで試行。
- *承認画面に遷移しない（エラー）* → `.env` の `SHOPIFY_BILLING_TEST=true` が未設定の可能性を確認。

---

## 2. デモ動画台本（60〜90 秒）

画面収録ツール（OBS / QuickTime / Loom 等）で録画します。
ナレーションは任意。字幕なしでも操作の流れが伝わるよう、ゆっくり操作してください。

**[0:00〜0:15] プラン選択 → Shopify 承認（Trial 証跡）**

- `/app/select-plan` を開き、Monthly $9 カードの「30-day free trial.」文言を見せる
- 「Select Monthly」をクリック → Shopify 承認画面へ遷移する
- 承認画面で "Free trial: 30 days" と金額を見せてから「Approve」をクリック
- Dashboard に戻り "Current Plan: Monthly Subscription" が表示されることを確認

**[0:15〜0:30] キャンペーン作成**

- 「Create campaign」をクリック
- Title `Hello Reviewer`、Message `Hello Reviewer`、Placement = Bottom を入力
- Enabled チェック済みを確認し「Save」

**[0:30〜0:45] Theme Editor — Banner Block 追加**

- Shopify Admin › Online Store › Themes › Customize を開く
- 「Add section」→ Apps → Banner Block を選択して「Save」

**[0:45〜1:00] ストアフロントでバナー確認 + Network**

- ストアフロントをシークレットモードで開く
- 画面下部にバナーが表示されることを見せる
- DevTools → Network で `POST /apps/speed-banner/event` が 200 を返すことを確認

**[1:00〜1:15] Dashboard Analytics 確認**

- Dashboard に戻ってリロードし、Impressions が 1 以上になっていることを見せる

**[1:15〜1:25] クロージング（任意）**

- Campaigns 一覧に戻り、Active バッジで締める

---

## 3. 審査員チェックリスト（提出前最終確認）

### アプリ設定

- [ ] `shopify.app.toml` の `application_url` が本番 URL (`https://speedbanner.app`) になっている
- [ ] `shopify.app.toml` の `redirect_urls` に本番コールバック URL が含まれている
- [ ] `redirect_urls` にローカル / トンネル URL が**残っていない**（本番提出時）
- [ ] Extension の `shopify.extension.toml` の `uid` が Partner Dashboard と一致している

### 機能確認

- [ ] インストール → プラン選択 → ダッシュボードの遷移が正常
- [ ] キャンペーン作成・編集・削除がすべて動作する
- [ ] Theme Editor で Banner Block が「Add section › Apps」から追加できる
- [ ] ストアフロントでバナーが表示される（シークレットモードで確認）
- [ ] DevTools Network で `POST /apps/speed-banner/event` が 200 を返す
- [ ] Dashboard Impressions / Clicks がリロード後に増える

### 法的・ポリシー

- [ ] `/privacy` が 200 で開き、データ削除ポリシーが明記されている
- [ ] `/terms` が 200 で開き、価格（$9/月・$90/年）と 30 日トライアルが明記されている
- [ ] `/contact` が 200 で開き、サポートメールが記載されている
- [ ] Partner Dashboard の "App listing" に Privacy Policy URL が設定されている

### Billing

- [ ] **`assets/ss-02-billing-approval-trial30.png` が存在し、"Free trial: 30 days" が写っている**
- [ ] 開発ストアで Test Charge を承認すると Dashboard に遷移できる
- [ ] `SHOPIFY_BILLING_TEST=true` が `.env` に設定されている（ローカル / ステージング）
- [ ] 本番デプロイ時は `SHOPIFY_BILLING_TEST` が `false` または未設定であること

### セキュリティ

- [ ] `/api/event` は App Proxy 認証を通過したリクエストのみ処理する
- [ ] Campaign の所有ショップ確認（`campaign.shop.shopDomain === session.shop`）が実装済み
- [ ] サーバー側バリデーションが create / update の両 action で動作する

### アンインストール

- [ ] `app/uninstalled` Webhook が登録されている（`shopify.app.toml` で確認）
- [ ] アンインストール後にアプリが Shopify Admin から消える

---

## 参照ドキュメント

| ドキュメント | 用途 |
|------------|------|
| `SUBMISSION_NOTES.md` | 審査員向け操作手順の要約 |
| `docs/qa-minimum.md` | 詳細な検証手順（Part A: 審査員向け / Part B: 開発者向け） |
| `docs/review-assets.md` | 本ファイル：スクショ・動画・チェックリスト |

---

## Appendix: Code trace (reference)

> この節は補助根拠です。主根拠は SS-2 の実スクショです。

`billing.request()` 呼び出し時の `trialDays` 受け渡しフロー:

| # | ファイル | キー処理 |
|---|---------|---------|
| 1 | `app/shopify.server.ts` | `[MONTHLY_PLAN]: { trialDays: 30, lineItems: [...] }` |
| 2 | `@shopify/shopify-api` billing/request.js L77 | `billingConfig = { ...config.billing[plan] }` → `trialDays: 30` を含む |
| 3 | 同 L186 | `trialDays: billingConfig.trialDays` → mutation 変数にセット |
| 4 | `RECURRING_PURCHASE_MUTATION` L20/28 | `appSubscriptionCreate(trialDays: $trialDays)` → Shopify API へ送信 |
| 5 | `@shopify/shopify-app-remix` billing/request.js L42 | `confirmationUrl` へリダイレクト（承認画面に trial 表示） |
