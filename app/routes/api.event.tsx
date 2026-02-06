import { type ActionFunctionArgs, json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    // Handle preflight OPTIONS request if necessary (though usually handled by server/browser interaction, 
    // explicitly handling OPTIONS for CORS is safe)
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
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

        // 2. Check Campaign Existence logic (Strict requirement: ignore if not found)
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { id: true },
        });

        if (!campaign) {
            // "Nothing to do HTTP 200"
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
