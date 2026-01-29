import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server"; // Note: Event model not yet created in DB, deferred to Phase 3. 
// However, the task for Phase 2 "Frontend Logic" requires fetch & render, and Phase 3 is Analytics.
// The user approved Phase 2 "Event API (App Proxy) 実装" in the updated plan.
// I need to implement the endpoint, but I cannot save to DB if table doesn't exist.
// Option 1: Create Event table now (pulling Phase 3 task forward).
// Option 2: Log to console/stub for now.
// Given "Phase 3: Eventモデル定義 & Migration" is explicit later, I should probably wait on DB write.
// BUT, the plan says "Event API (App Proxy) 実装" in Phase 2.
// Let's implement the endpoint to accept the request and return success, but maybe just log it or do nothing until Phase 3.
// Wait, user instructions: "Keep Event model deferred to Phase 3".
// So I will just return status 200 for now, or maybe create the file but leave logic empty/commented.

export async function action({ request }: ActionFunctionArgs) {
    const { session } = await authenticate.public.appProxy(request);

    if (!session || !session.shop) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405 });
    }

    // Phase 3: Parse body and save event
    // const data = await request.json(); 
    // await createEvent(...)

    return json({ success: true });
}
