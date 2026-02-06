import { type ActionFunctionArgs, json } from "@remix-run/node";
import prisma from "../db.server";

import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    // Handle preflight OPTIONS request if necessary
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    // 0. Security Guard (App Proxy Authentication)
    let shop: string;
    try {
        const { session } = await authenticate.public.appProxy(request);
        if (!session || !session.shop) {
            // Valid signature but no shop info? Should rarely happen for App Proxy.
            return json({}, { status: 200, headers: corsHeaders });
        }
        shop = session.shop;
    } catch (e) {
        // Signature validation failed or not an App Proxy request
        // Return 200 to keep it silent as requested
        return json({}, { status: 200, headers: corsHeaders });
    }

    // 0.1 Content-Type Guard
    const cType = request.headers.get("Content-Type");
    if (!cType || !cType.includes("application/json")) {
        return json({}, { status: 200, headers: corsHeaders });
    }

    try {
        // 1. Parsing and Validation
        let data;
        try {
            data = await request.json();
        } catch (e) {
            return json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
        }

        const { type, campaignId } = data;

        if (!campaignId || typeof campaignId !== "string") {
            return json({ error: "Invalid campaignId" }, { status: 400, headers: corsHeaders });
        }

        if (type !== "impression" && type !== "click") {
            return json({ error: "Invalid type" }, { status: 400, headers: corsHeaders });
        }

        // 2. Check Campaign Existence AND Shop Ownership
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { shop: true },
        });

        if (!campaign) {
            return json({}, { status: 200, headers: corsHeaders });
        }

        // Cross-Shop Validation
        if (campaign.shop.shopDomain !== shop) {
            // Campaign exists but belongs to a different shop. Reject silently.
            return json({}, { status: 200, headers: corsHeaders });
        }

        // 3. Date Handling (UTC 'YYYY-MM-DD')
        const date = new Date().toISOString().slice(0, 10);

        // 4. Upsert Logic (Atomic Increment)
        const incField = type === "impression" ? "impressions" : "clicks";

        // upsert payload
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

        // 5. Success Response
        return json({}, { status: 200, headers: corsHeaders });

    } catch (error) {
        console.error("Analytics API Error:", error);
        return json({}, { status: 200, headers: corsHeaders });
    }
};

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};
