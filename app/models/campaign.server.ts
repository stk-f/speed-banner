import prisma from "../db.server";
import type { Campaign, Rule, Shop } from "@prisma/client"; // eslint-disable-line @typescript-eslint/no-unused-vars

export enum Placement {
    TOP = "TOP",
    BOTTOM = "BOTTOM",
}

export enum PageScope {
    ALL = "ALL",
    PRODUCT = "PRODUCT",
    COLLECTION = "COLLECTION",
    URL_PREFIX = "URL_PREFIX",
}

export enum Device {
    ALL = "ALL",
    DESKTOP = "DESKTOP",
    MOBILE = "MOBILE",
}

export enum Frequency {
    FIRST = "FIRST",
    H24 = "H24",
    D7 = "D7",
}

export type CreateCampaignInput = {
    shopId: string;
    title: string;
    enabled?: boolean;
    priority?: number;
    placement: string; // Placement enum
    message: string;
    buttonText?: string;
    buttonUrl?: string;
    styleJson?: string;
    startAt?: Date | null;
    endAt?: Date | null;
    rule: {
        pageScope: string; // PageScope enum
        urlPrefix?: string;
        device: string; // Device enum
        frequency: string; // Frequency enum
        suppressDaysAfterClose?: number;
    };
};

export type UpdateCampaignInput = Partial<CreateCampaignInput>;

export async function getCampaigns(shopId: string) {
    return prisma.campaign.findMany({
        where: { shopId },
        include: { rule: true },
        orderBy: { createdAt: "desc" },
    });
}

export async function getCampaign(id: string, shopId: string) {
    return prisma.campaign.findFirst({
        where: { id, shopId },
        include: { rule: true },
    });
}



// Simplified Create: Accepts shopDomain to resolve Shop relation
export async function createCampaign(shopDomain: string, campaignData: CreateCampaignInput) {
    // Try to find the shop, or create one if missing (using shopDomain as ID for simplicity if pure string, 
    // but better to use the shopId passed from session if available).
    // In `shopify-app-remix`, `authenticate.admin(request)` returns `admin.session.shop`.
    // Let's assume we find the shop by domain. 

    let shop = await prisma.shop.findUnique({ where: { shopDomain } });

    if (!shop) {
        // Just-in-time creation for the shop
        shop = await prisma.shop.create({
            data: {
                id: shopDomain, // Use domain as ID for new shop
                shopDomain,
            }
        });
    }

    // NOTE: This logic might need refinement depending on how we get the real GID of the shop. 
    // For now, using the assumption that we can link via shopDomain.

    const { rule, shopId: _shopId, ...data } = campaignData;
    if (!shop) throw new Error("Could not find or create shop");

    return prisma.campaign.create({
        data: {
            ...data,
            shop: { connect: { id: shop.id } },
            rule: {
                create: rule,
            },
        },
        include: { rule: true },
    });
}

export async function updateCampaign(id: string, shopId: string, campaignData: UpdateCampaignInput) {
    const { rule, ...data } = campaignData;
    return prisma.campaign.update({
        where: { id, shopId }, // Security: ensure shopId matches
        data: {
            ...data,
            rule: rule ? {
                update: rule,
            } : undefined,
        },
        include: { rule: true },
    });
}

export async function deleteCampaign(id: string, shopId: string) {
    return prisma.campaign.delete({
        where: { id, shopId },
    });
}

export async function getLiveCampaign(shopId: string, device: string, path: string) {
    // Logic to find the best matching campaign for public-config
    // 1. Fetch enabled campaigns for shop
    // 2. Filter by device, schedule, etc.
    // 3. Sort by priority
    // 4. Return top 1
    // This will be implemented in Step 9 (Phase 2), placeholder for now.
    return null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type CampaignValidationErrors = Partial<
    Record<
        "title" | "message" | "placement" | "pageScope" | "device" |
        "frequency" | "urlPrefix" | "buttonUrl" | "priority",
        string
    >
>;

const VALID_PLACEMENTS  = ["TOP", "BOTTOM"] as const;
const VALID_SCOPES      = ["ALL", "PRODUCT", "COLLECTION", "URL_PREFIX"] as const;
const VALID_DEVICES     = ["ALL", "DESKTOP", "MOBILE"] as const;
const VALID_FREQUENCIES = ["FIRST", "H24", "D7"] as const;
const PRIORITY_MIN = -100;
const PRIORITY_MAX =  100;

export function validateCampaignInput(data: {
    title:      string;
    message:    string;
    placement:  string;
    pageScope:  string;
    device:     string;
    frequency:  string;
    urlPrefix?: string | null;
    buttonUrl?: string | null;
    priority?:  string | number | null;
}): CampaignValidationErrors | null {
    const e: CampaignValidationErrors = {};

    // required text fields
    if (!data.title?.trim())   e.title   = "Title is required.";
    if (!data.message?.trim()) e.message = "Message is required.";

    // enum fields
    if (!(VALID_PLACEMENTS  as readonly string[]).includes(data.placement))
        e.placement = "Placement must be Top or Bottom.";
    if (!(VALID_SCOPES      as readonly string[]).includes(data.pageScope))
        e.pageScope = "Invalid page scope.";
    if (!(VALID_DEVICES     as readonly string[]).includes(data.device))
        e.device    = "Invalid device.";
    if (!(VALID_FREQUENCIES as readonly string[]).includes(data.frequency))
        e.frequency = "Invalid frequency.";

    // urlPrefix required when pageScope = URL_PREFIX
    if (data.pageScope === "URL_PREFIX" && !data.urlPrefix?.trim())
        e.urlPrefix = "URL prefix is required when Page Scope is 'Specific URL'.";

    // buttonUrl:
    //   ✅ empty
    //   ✅ relative path: single "/" prefix  (e.g. /sale, /collections/summer)
    //   ✅ absolute URL:  https:// only
    //   ❌ protocol-relative: // prefix  (e.g. //evil.com — open redirect risk)
    //   ❌ http:// (non-TLS)
    //   ❌ any other scheme
    const bUrl = data.buttonUrl?.trim() ?? "";
    if (bUrl) {
        const isRelative = bUrl.startsWith("/") && !bUrl.startsWith("//");
        const isHttps    = /^https:\/\//i.test(bUrl);
        if (!isRelative && !isHttps)
            e.buttonUrl = "Button URL must be a relative path (e.g. /sale) or an https:// URL.";
    }

    // priority range
    const rawPriority = data.priority;
    if (rawPriority !== undefined && rawPriority !== null && rawPriority !== "") {
        const p = Number(rawPriority);
        if (Number.isNaN(p) || !Number.isInteger(p))
            e.priority = "Priority must be a whole number.";
        else if (p < PRIORITY_MIN || p > PRIORITY_MAX)
            e.priority = `Priority must be between ${PRIORITY_MIN} and ${PRIORITY_MAX}.`;
    }

    return Object.keys(e).length > 0 ? e : null;
}
