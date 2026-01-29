# Assumptions

## General
- **アプリ名**: 特に指定がないため、フォルダ名に基づき「Speed Banner」と仮称します。
- **パッケージマネージャー**: Shopify CLIの標準に従い `npm` を使用します。
- **ノードバージョン**: 最新のLTS (v20以上) がインストールされていると仮定します。

## Phase 0: 土台
- **テンプレート**: `remix` テンプレートを使用します。
- **DB**: 開発環境では SQLite を使用します（Prismaのデフォルト）。
- **依存関係**: 余計なライブラリは追加せず、Shopifyテンプレートの標準構成から開始します。

## Phase 2: Theme App Extension
- **Extension構成**: バナー表示用の App Block を1つだけ提供します。App Embed Blockは使用しません（DOMへの影響を最小限にするため）。
- **スタイル**: 外部CSSファイルは極力使用せず、可能な限りLiquid内の `<style>` または動的インラインスタイルで解決し、リクエスト数を削減します。あるいは、単一の軽量CSSを配信します。今回は要件に従い「Inject minimal JS/CSS」を目指します。

## Phase 3: 計測
- **イベント送信**: `navigator.sendBeacon` を優先使用し、ページ遷移時のデータ欠落を防ぎつつ、メインスレッドへの負荷を最小化します。
