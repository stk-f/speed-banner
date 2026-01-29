import prisma from "../db.server";
import type { Campaign, Rule, Shop } from "@prisma/client";

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

// Ensure Shop exists before creating campaign
async function ensureShop(shopDomain: string, shopId: string) {
    // shopId in Session might be different from Shop model ID if not synced.
    // We assume the shopId passed here is capable of identifying the shop.
    // However, in standard Shopify templates, 'shop' in Session is the domain.
    // We need to clarify what 'shopId' is passed. Usually we pass shop domain to find the Shop record.
    // But our Campaign model uses a relation to Shop.id.

    // Strategy: Upsert Shop using shopDomain (which we assume is unique and known).
    // If the input is actually the shop domain, we can handle existing check.

    // Implementation Note: Calling code should ideally pass the Shop ID or Domain.
    // Standard session info gives us the shop domain.
    // We will upsert the Shop record based on the domain.

    return prisma.shop.upsert({
        where: { shopDomain: shopDomain }, // Using shopDomain as unique key
        update: {},
        create: {
            id: shopId, // If shopId is predictable (e.g. from session.id or offline id), use it.
            // If we don't know the ID, we might need to generate one or fetch from Shopify API.
            // For MVP, we can assume the session shop ID is valid or just use domain as ID if compatible.
            shopDomain: shopDomain,
        },
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
