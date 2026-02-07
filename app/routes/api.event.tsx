import { type ActionFunctionArgs, json } from "@remix-run/node";
import prisma from "../db.server";

import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    // 1. Silent Method Guard (Only POST allowed, others return 200)
    if (request.method !== "POST") {
        return json({}, { status: 200 });
    }

    try {
        // 2. Security Guard (App Proxy Authentication)
        let shop: string;
        try {
            const { session } = await authenticate.public.appProxy(request);
            if (!session || !session.shop) {
                return json({}, { status: 200 });
            }
            shop = session.shop;
        } catch (e) {
            return json({}, { status: 200 });
        }

        // 3. Content-Type Guard
        const cType = request.headers.get("Content-Type");
        if (!cType || !cType.includes("application/json")) {
            return json({}, { status: 200 });
        }

        // 4. Parsing and Validation
        let data;
        try {
            data = await request.json();
        } catch (e) {
            return json({}, { status: 200 });
        }

        const { type, campaignId } = data;

        if (!campaignId || typeof campaignId !== "string") {
            return json({}, { status: 200 });
        }

        if (type !== "impression" && type !== "click") {
            return json({}, { status: 200 });
        }

        // 5. Check Campaign Existence AND Shop Ownership
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { shop: true },
        });

        if (!campaign) {
            return json({}, { status: 200 });
        }

        if (campaign.shop.shopDomain !== shop) {
            return json({}, { status: 200 });
        }

        // 6. Date Handling (UTC 'YYYY-MM-DD')
        const date = new Date().toISOString().slice(0, 10);

        // 7. Upsert Logic (Atomic Increment)
        const incField = type === "impression" ? "impressions" : "clicks";

        await prisma.analyticsDaily.upsert({
            where: {
                campaignId_date: {
                    campaignId,
                    date,
                },
            },
            update: {
                [incField]: { increment: 1 },
            },
            create: {
                campaignId,
                date,
                impressions: type === "impression" ? 1 : 0,
                clicks: type === "click" ? 1 : 0,
            },
        });

        return json({}, { status: 200 });

    } catch (error) {
        console.error("Analytics API Error:", error);
        return json({}, { status: 200 });
    }
};
