import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {
  PLAN_MONTHLY,
  PLAN_ANNUAL,
  MONTHLY_PLAN,
  ANNUAL_PLAN
} from "./constants";

export { MONTHLY_PLAN, ANNUAL_PLAN, PLAN_MONTHLY, PLAN_ANNUAL };

export type Plan = "FREE" | "TRIAL" | "PAID";

export function getPlanFromSubscription(subscription: any): Plan {
  // No subscription => FREE
  if (!subscription) return "FREE";

  // 1) 明示的な trialEnd が存在し未来日であれば TRIAL
  //    -> Shopify のレスポンスで trialEndsOn / trial_end / trial_end_at のどれかで来る可能性があるため複数キーをチェック
  const trialKeys = ['trialEndsOn', 'trial_end', 'trial_end_at', 'trialEndsAt'];
  for (const k of trialKeys) {
    const v = subscription[k];
    if (v) {
      const d = new Date(String(v));
      if (!isNaN(d.getTime()) && d > new Date()) {
        return "TRIAL";
      }
    }
  }

  // 2) subscription.status が明確に "active" であれば PAID
  //    status の表現は外部 API により差があるためケースインセンシティブに判定
  if (subscription.status && typeof subscription.status === 'string') {
    const s = subscription.status.toLowerCase();
    if (s.includes('active') || s.includes('paid')) {
      return "PAID";
    }
    // 一部 API では "trialing" の表現があるため、trialEndsOn が無い場合は保守的に TRIAL ではなく PAID へ落とす
  }

  // 3) 開発環境でのみ subscription.test を TRIAL 判定に使う（本番事故防止のため）
  if (process.env.NODE_ENV !== 'production' && subscription.test) {
    return "TRIAL";
  }

  // 4) 最終フォールバック: subscription オブジェクトが存在する時点で PAID と見なす
  return "PAID";
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (process.env.SCOPES || "read_themes").split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "https://speedbanner.app",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    expiringOfflineAccessTokens: true,
  },
  billing: {
    [MONTHLY_PLAN]: {
      lineItems: [
        {
          amount: 9,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
          trialDays: 30,
        },
      ],
    },
    [ANNUAL_PLAN]: {
      lineItems: [
        {
          amount: 90,
          currencyCode: "USD",
          interval: BillingInterval.Annual,
          trialDays: 30,
        },
      ],
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
