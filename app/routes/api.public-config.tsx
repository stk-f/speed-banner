import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Helper to calculate logic
// In production, we might want to move this to model/service
async function getHighestPriorityCampaign(shopDomain: string, path: string, device: string) {
    // 1. Fetch active campaigns for shop
    const campaigns = await prisma.campaign.findMany({
        where: {
            shop: { shopDomain },
            enabled: true,
            // Date checks
            OR: [
                { startAt: null },
                { startAt: { lte: new Date() } }
            ],
            AND: [
                { OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }
            ]
        },
        include: { rule: true },
        orderBy: { priority: "desc" },
    });

    // 2. Filter in memory (logic is complex for pure SQL with JSON/Enums in SQLite)
    for (const cam of campaigns) {
        if (!cam.rule) continue;

        // Filter by Device
        const ruleDevice = cam.rule.device;
        if (ruleDevice !== "ALL" && ruleDevice !== device) continue;

        // Filter by PageScope
        const scope = cam.rule.pageScope;
        const prefix = cam.rule.urlPrefix;

        let match = false;
        if (scope === "ALL") match = true;
        else if (scope === "URL_PREFIX" && prefix && path.startsWith(prefix)) match = true;
        else if (scope === "PRODUCT" && path.includes("/products/")) match = true; // Simple heuristic
        else if (scope === "COLLECTION" && path.includes("/collections/")) match = true; // Simple heuristic

        if (match) {
            // Return minimal payload
            return {
                id: cam.id,
                placement: cam.placement,
                message: cam.message,
                buttonText: cam.buttonText,
                buttonUrl: cam.buttonUrl,
                style: (() => {
                    try { return JSON.parse(cam.styleJson || "{}"); }
                    catch { return {}; }
                })(),
                frequency: cam.rule.frequency,
                suppressDays: cam.rule.suppressDaysAfterClose,
            };
        }
    }

    return null;
}

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const { session, admin } = await authenticate.public.appProxy(request);

        if (!session || !session.shop) {
            return json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const path = url.searchParams.get("path") || "/";
        const device = url.searchParams.get("device") || "DESKTOP"; // Client should send DESKTOP or MOBILE

        const campaign = await getHighestPriorityCampaign(session.shop, path, device.toUpperCase());

        return json({ campaign });
    } catch (error) {
        if (error instanceof Response) {
            return error;
        }
        console.error("Loader Error:", error);
        return json({ error: "Internal Server Error" }, { status: 500 });
    }
}
