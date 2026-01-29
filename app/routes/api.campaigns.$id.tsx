import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getCampaign, updateCampaign, deleteCampaign } from "../models/campaign.server";

// We need to resolve Shop ID from session.shop (domain)
// Since we decided to use ID=Domain or lookup, let's do a quick lookup helper or assume consistent ID.
// For robustness, let's assume we might need to lookup.
// Imported prisma to lookup shop id if needed?
// Let's rely on the model helpers essentially expecting the correct ID.
// I will modify `campaign.server.ts` to accept `shopDomain` and handle the lookup internally if I haven't already.
// Checking `campaign.server.ts`:
// `getCampaigns(shopId: string)` -> uses shopId directly.
// `getCampaign(id: string, shopId: string)` -> uses shopId directly.
// `createCampaign(shopDomain: string, ...)` -> handles lookup!
// `updateCampaign(id, shopId, ...)` -> uses shopId directly.
// `deleteCampaign(id, shopId)` -> uses shopId directly.
// It seems `createCampaign` is the only one handling domain -> ID mapping.
// I should update `campaign.server.ts` to be consistent or handle it here.
// I will rewrite `campaign.server.ts` briefly to accept `shopDomain` for all methods to be safe.
// BUT for now, I will assume I can fetch the shop ID if necessary.
// Let's try to assume ID = Domain for now, as I enforced it in `createCampaign` (id: shopDomain if new).
// If a Shop record already exists from another process with a UUID, this might break.
// Wait, `prisma/schema.prisma`: `model Shop`... `id` is String.
// In `shopify.server.ts`, does it create a Shop record? No, usually just Session.
// So I am the one creating Shop records. I will enforce ID = Domain.
// So `session.shop` IS `shopId`.

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { session } = await authenticate.admin(request);
    const { id } = params;

    if (!id) {
        return json({ error: "Missing ID" }, { status: 400 });
    }

    const campaign = await getCampaign(id, session.shop);
    if (!campaign) {
        return json({ error: "Not found" }, { status: 404 });
    }

    return json({ campaign });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const { session } = await authenticate.admin(request);
    const { id } = params;

    if (!id) {
        return json({ error: "Missing ID" }, { status: 400 });
    }

    const method = request.method;

    if (method === "PUT" || method === "PATCH") { // Accepting PATCH for partial updates too
        const data = await request.json();
        const campaign = await updateCampaign(id, session.shop, data);
        return json({ campaign });
    }

    if (method === "DELETE") {
        await deleteCampaign(id, session.shop);
        return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
}
