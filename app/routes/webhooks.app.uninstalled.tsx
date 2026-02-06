import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  // P1 (任意): production で常時ログを出さない
  if (process.env.NODE_ENV !== "production") {
    console.log(`Received ${topic} webhook for ${shop}`);
  }

  // P0: session の有無で cleanup をガードしない
  // uninstall webhook は session が null の状態でも届き得るため、
  // shop が取れているなら cleanup を実行する。
  try {
    // 1) Shop と campaignIds を取得（無ければ既に削除済みとして終了）
    const shopRecord = await db.shop.findUnique({
      where: { shopDomain: shop },
      select: { campaigns: { select: { id: true } } },
    });

    if (!shopRecord) {
      // 既に消えているなら何もしない（冪等）
      await db.session.deleteMany({ where: { shop } });
      return new Response(null, { status: 200 });
    }

    const campaignIds = shopRecord.campaigns.map((c) => c.id);

    // 2) まとめて実行（任意: transaction）
    await db.$transaction(async (tx) => {
      // AnalyticsDaily は Campaign に FK が無い（/もしくは cascade されない）想定なので手動削除
      if (campaignIds.length > 0) {
        await tx.analyticsDaily.deleteMany({
          where: { campaignId: { in: campaignIds } },
        });
      }

      // Shop を消す（Campaign -> Rule 等は schema 側の onDelete/cascade で落ちる想定）
      // 冪等のため delete ではなく deleteMany
      await tx.shop.deleteMany({ where: { shopDomain: shop } });

      // Session も最後に削除（冪等 deleteMany）
      await tx.session.deleteMany({ where: { shop } });
    });
  } catch (e) {
    // webhook は失敗しても Shopify 側の再送があり得るので落とさず 200 返す
    console.error("Cleanup failed", e);
  }

  return new Response(null, { status: 200 });
};
