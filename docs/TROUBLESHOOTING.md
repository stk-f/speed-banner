# トラブルシューティング & 再発防止ガイド

## HTTP 500 / 起動エラー対策

### 1. Prisma Version Mismatch (P1012 Error)
**症状**: `npm run dev` 起動時に `Error code: P1012` や `schema validation` エラーが出る。
**原因**: プロジェクトの dependencies にある Prisma (`^6.x`) と、`npx` がダウンロードする最新の Prisma (`7.x`など) でバージョン不整合が起きるため。
**対策**:
- `shopify.web.toml` や `package.json` のスクリプトでは、**`npm exec prisma`** を使用する。
- `npx` (特に `--no-install` 無し) は環境によって最新版を勝手にダウンロードしてしまうリスクがあるため避ける。
- 推奨コマンド例: `npm exec prisma generate`

### 2. Prisma Import Error (500 Internal Server Error)
**症状**: `/api/*` エンドポイントにアクセスすると 500 エラーが発生。ログに `Cannot read properties of undefined (reading 'Client')` などが出る。
**原因**: `app/db.server.ts` が `export default prisma` なのに、利用側で `import { prisma }` (Named Import) している。
**対策**:
- 全ファイルで `import prisma from "../db.server"` (Default Import) に統一する。
- 以下のコマンドで誤ったインポートがないか検査可能:
  ```powershell
  grep -r "import { prisma }" app/routes
  ```

### 3. Route 404 Error (Cannot GET)
**症状**: ファイルは存在するのにエンドポイントが 404 になる。
**原因**: `vite.config.ts` の `v3_routeConfig: true` が有効だが、`routes.ts` が存在しないため、Remix がルートを認識できない。
**対策**:
- `vite.config.ts` で `v3_routeConfig: false` に設定し、従来のファイルベースルーティング（Flat Routes）を有効にする。

---

## 再発防止チェックリスト (Clean Verify)

環境が怪しいと思った場合は、以下の手順でクリーンインストール検証を行ってください。

1. **プロセス停止**: 実行中の `node` プロセスを終了 ( `taskkill /F /IM node.exe` )
2. **クリーン**: `rm -rf node_modules` (PowerShell: `Remove-Item -Recurse -Force node_modules`)
3. **インストール**: `npm ci` (lockfile準拠でインストール)
4. **起動**: `npm run dev`
   - 起動時に `Prisma CLI Version : 6.x.x` と表示されればOK (7.x.x ならNG)
5. **API確認**:
   ```powershell
   curl -v http://localhost:PORT/api/public-config
   ```
   - 期待値: `401 Unauthorized` (正常に動作し、認証で弾かれている)
### 3. 文字化け (Mojibake)
**症状**: ログの日本語が `縺ゅ≠` のように文字化けする。
**原因**: Windows PowerShell のデフォルトエンコーディングが Shift-JIS (cp932) であり、Node.js/Shopify CLI の UTF-8 出力と不整合が起きるため。
**対策**:
プロファイル (`$PROFILE`) に以下を追記して、UTF-8 を強制する。
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

### 4. Port Conflict (EADDRINUSE 9293)
**症状**: `npm run dev` 起動時に `Error: listen EADDRINUSE ... :9293` が出る。
**原因**: 前回の `npm run dev` プロセスが正常終了せず、ポートを占有したまま残っている(ゾンビプロセス)。
**対策**:
1. ポートを使用しているプロセスPIDを特定:
   ```powershell
   netstat -ano | findstr :9293
   ```
2. そのプロセスを強制終了:
   ```powershell
   taskkill /F /PID <PID>
   ```
3. 再発防止: 開発終了時は必ず `q` キーでCLIを終了させる。Ctrl+Cだとプロセスが残る場合がある。
