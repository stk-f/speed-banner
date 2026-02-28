# QA Minimum — 審査提出前 最小確認手順

この文書は読み手によって 2 つのセクションに分かれています。

| セクション | 対象読者 | ブラウザのみで完結 |
|-----------|---------|-----------------|
| **Part A — Reviewer Steps** | 審査担当者・第三者 | ✅ |
| **Part B — Developer Verification** | 開発者自身（提出前確認） | 一部ターミナル必要 |

---

# Part A — Reviewer Steps
> 審査担当者向け。Shopify Admin とブラウザの DevTools のみで実施できます。

---

## A-1 — キャンペーン作成

1. アプリを開き Dashboard (`/app`) に遷移する
2. **「Create campaign」** をクリック → `/app/campaigns/new`
3. 以下を入力して **「Save」**

   | フィールド | 入力値 |
   |-----------|--------|
   | Title | `QA Banner` |
   | Message | `Hello QA Reviewer` |
   | Placement | `Bottom` |
   | Enabled | チェック済み |
   | Background Color | `#1a1a1a` |
   | Text Color | `#ffffff` |
   | Page Scope | `All Pages` |
   | Device | `All Devices` |
   | Frequency | `Every 24 hours` |

4. `/app/campaigns` に遷移し、`QA Banner` が **Active** バッジで表示されることを確認

---

## A-2 — Theme Editor で Banner Block を追加

1. Shopify Admin > **Online Store > Themes > Customize**
2. 左サイドバー下部の **「Add section」** をクリック
3. カテゴリ **Apps** から **「Banner Block」** を選択して追加
4. **「Save」** をクリック

> **確認**: 「Saved」トーストが表示されること。

---

## A-3 — ストアフロントでバナー表示を確認

1. ストアフロントをシークレットモードで開く（localStorage がクリーンな状態）
2. ページ下部に黒背景のバナー **「Hello QA Reviewer」** が表示されることを確認
3. **×ボタン** をクリックしてバナーが消えることを確認

**バナーが表示されない場合のチェックポイント**

- Theme Editor の Banner Block セクションが保存済みか
- キャンペーンの **Enabled** が `true` か（`/app/campaigns` で確認）
- `localStorage` に `closedUntil` が残っていないか（DevTools > Application > Local Storage でクリア）
- ブラウザ Console に `Banner fetch failed` が出ていないか

---

## A-4 — DevTools Network で analytics イベントの 200 応答を確認

1. ストアフロントを開いた状態で **F12 → Network タブ** を開く
2. フィルタに `event` と入力
3. ページを **リロード**
4. `event` へのリクエストを確認

   | 確認項目 | 期待値 |
   |---------|--------|
   | URL | `/apps/speed-banner/event` |
   | Method | `POST` |
   | Status | `200` |
   | Response Body | `{}` |
   | Request payload `type` | `impression` |
   | Request payload `campaignId` | （実在する ID 文字列） |

5. バナーの CTA ボタン（設定している場合）をクリックし、`type: click` のリクエストが追加されることを確認

---

## A-5 — Dashboard で Analytics が増えることを確認

1. アプリの Dashboard (`/app`) に戻りリロードする
2. **Analytics (Last 30 Days)** セクションを確認

   | カード | 期待値 |
   |--------|--------|
   | Total Impressions | 1 以上 |
   | Total Clicks | 1 以上（A-4 でクリックした場合） |

> Dashboard はリロード時に最新値を取得します。リアルタイム Push ではありません。

---

## A-6 — アンインストール

1. Shopify Admin > **Apps** > Speed Banner > **Delete**
2. アンインストールが完了し、アプリ一覧から消えることを確認

> データ削除の詳細（Webhook 処理・DB クリーンアップ）は [Part B-3](#b-3--アンインストール後のデータ削除確認developer-only) を参照してください。

---

## A チェックリスト

- [ ] A-1: キャンペーンが Active で表示される
- [ ] A-2: Theme Editor で Banner Block 追加・保存済み
- [ ] A-3: ストアフロントでバナーを目視確認
- [ ] A-4: Network タブで `event` が POST 200 `{}` を確認
- [ ] A-5: Dashboard の Impressions が 1 以上
- [ ] A-6: アンインストールが完了する

---

---

# Part B — Developer Verification
> 開発者自身が提出前に実施する確認。審査担当者には不要です。

---

## B-1 — Tamper Test：不正な campaignId が無視されることを確認

### このテストが検証すること

「存在しない campaignId（または形式不正な値）を送信しても、analytics カウンターが増えない」ことを確認します。

これは次の防御ロジックを動作確認するものです。

```typescript
// api.event.tsx — campaignId の存在確認
const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
if (!campaign) {
    return json({}, { status: 200 }); // 保存せず黙って返す
}
```

### このテストが検証しないこと（注意）

「別ショップの実在 campaignId を使った cross-shop 改ざん」の再現には 2 つの開発ストアが必要です。
cross-shop 保護の実装説明は [B-2](#b-2--cross-shop保護の実装説明) を参照してください。

### 手順

1. ストアフロントを開き、DevTools Console を起動
2. 以下を実行（App Proxy HMAC は Shopify が自動付与するため、ブラウザ経由でのみ動作します）

   ```js
   fetch('/apps/speed-banner/event', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ type: 'impression', campaignId: 'nonexistent-id-12345' })
   }).then(r => r.json()).then(console.log);
   // → {} (200) が返る
   ```

3. Dashboard をリロードして Impressions が増えていないことを確認

**合わせて確認するケース**

```js
// 不正 type（click/impression 以外）
fetch('/apps/speed-banner/event', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'pageview', campaignId: '<your-real-campaign-id>' })
}).then(r => r.json()).then(console.log);
// → {} (200)、DB に変化なし
```

---

## B-2 — Cross-Shop 保護の実装説明

### 保護の仕組み

`api.event.tsx` は以下の順序で检证します。

```typescript
// 1. App Proxy 認証（Shopify が HMAC を検証）
const { session } = await authenticate.public.appProxy(request);
const shop = session.shop; // クライアント側から改ざん不可

// 2. DB から Campaign と紐づく Shop を取得
const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { shop: true },
});

// 3. セッションのショップと Campaign の所有ショップを比較
if (campaign.shop.shopDomain !== shop) {
    return json({}, { status: 200 }); // 不一致なら保存せず返す
}
```

`shop`（session 由来）はクライアントが改ざんできないため、リクエスト元ストア以外の Campaign を書き換えることはできません。

### 本来の cross-shop テスト方法

実際の cross-shop 動作確認には 2 つの開発ストアが必要です。

1. ストア A にアプリをインストールし、Campaign ID を取得する
2. ストア B のストアフロントから、ストア A の Campaign ID を指定してイベントを送信する
3. ストア A の Dashboard で analytics が増えていないことを確認する

通常の開発ストア 1 つでの確認は不可能であるため、実装コードのレビューによる検証を推奨します。

---

## B-3 — アンインストール後のデータ削除確認（Developer only）

### 前提

`app/routes/webhooks.app.uninstalled.tsx` が `app/uninstalled` Webhook を受信し、
以下を削除します。

1. `AnalyticsDaily`（対象 Campaign 分）
2. `Shop`（Cascade により `Campaign` → `Rule` も削除）
3. `Session`

### 確認手順

```bash
# アンインストール前後でレコード数を比較
npm exec prisma studio
# または SQLite ブラウザで dev.sqlite を開く
```

```sql
-- アンインストール前に記録しておく
SELECT COUNT(*) FROM Shop WHERE shopDomain = 'your-dev-store.myshopify.com';
SELECT COUNT(*) FROM Campaign;
SELECT COUNT(*) FROM AnalyticsDaily;

-- アンインストール後に同じクエリを実行 → すべて 0 になること
```

### ログで確認する方法

`npm run dev` のターミナルで Webhook 受信後に以下が出ないことを確認（エラーなし）：

```
Cleanup failed ...
```

正常終了の場合はログ出力なし（冪等のため）。

---

## B-4 — デバッグログの使い方

`api.event.tsx` は `NODE_ENV !== "production"` のとき、保存成功後に 1 行出力します。

```
[AGX event saved] type=impression campaignId=abc123 shop=dev-store.myshopify.com
```

- 本番では出力されません
- ログが不要な場合は `NODE_ENV=production npm run dev` で起動してください
- このログが出た = cross-shop チェックを通過し upsert が実行された証拠です

---

---

## B-5 — キャンペーンフォーム サーバー側バリデーション 手動テストケース

`/app/campaigns/new` または `/app/campaigns/<id>` で Save ボタンを押して確認します。

| # | 入力内容 | 期待結果 |
|---|---------|---------|
| T1 | Title = 空 | "Title is required." がフィールド直下に表示 |
| T2 | Message = スペースのみ | "Message is required."（trim されるため） |
| T3 | Page Scope = Specific URL、URL Prefix = 空 | "URL prefix is required when Page Scope is 'Specific URL'." |
| T4 | Button URL = `ftp://example.com` | "Button URL must be a relative path (e.g. /sale) or an https:// URL." |
| T5 | Button URL = `/collections/summer` | 保存成功（単一 `/` 始まりの相対パスは許可） |
| T6 | Priority = `999` | "Priority must be between −100 and 100." |
| T7 | Priority = `1.5` | "Priority must be a whole number." |
| T8 | 全フィールド正常入力 | `/app/campaigns` にリダイレクト、一覧に表示 |
| **T9** | **Button URL = `//evil.com`** | **"Button URL must be a relative path (e.g. /sale) or an https:// URL."**（プロトコル相対URL拒否） |
| **T10** | **Button URL = `https://example.com`** | **保存成功**（https:// は許可） |

> **T9 の背景**: `//evil.com` は `/` 始まりのため相対パスと誤判定されるリスクがある。
> `startsWith("//")` を明示的に拒否することでオープンリダイレクトを防いでいる。

> **http:// について**: `http://example.com` は T4 と同じく拒否されます（https:// のみ許可）。

---

## B チェックリスト

- [ ] B-1: 存在しない campaignId を送って Dashboard が変化しないことを確認
- [ ] B-1: 不正 type を送って Dashboard が変化しないことを確認
- [ ] B-3: アンインストール後に DB レコードが消えることを確認
- [ ] B-4: `[AGX event saved]` ログが正常ケースで出ることを確認
- [ ] B-5: T9 — `//evil.com` がエラーになることを確認
- [ ] B-5: T10 — `https://example.com` が保存できることを確認
