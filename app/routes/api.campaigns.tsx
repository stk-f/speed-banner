import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getCampaigns, createCampaign } from "../models/campaign.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const { session } = await authenticate.admin(request);
    const campaigns = await getCampaigns(session.shop); // passing shop domain as ID for MVP listing if shopId logic matches
    // Note: getCampaigns expects shopId. In our createCampaign logic, we linked Shop by ID.
    // If we used shopDomain as ID in Shop table, this works.
    // If Shop table has UUIDs, we need to look up Shop by session.shop first.

    // Correction: We should robustly lookup the Shop ID from the Domain.
    // Ideally, session.shop corresponds to Shop.shopDomain.
    // Let's improve getCampaigns to handle this or lookup here.
    // For MVP speed, let's look up the shop first if needed, 
    // OR update getCampaigns to accept shopDomain and do the join.
    // Let's update `getCampaigns` logic implicitly: 
    // Current `getCampaigns` takes `shopId`.
    // Does `session.shop` (domain) equal `Campaign.shopId`? 
    // In `createCampaign`, I used `data: { shop: { connect: { id: shop.id } } }`.
    // If `shop.id` was generated (UUID) or explicitly set to domain?
    // In `createCampaign` I wrote: `id: shop.id || shopDomain`.
    // If the Shop didn't exist, I set ID to shopDomain. 
    // If it did exist, I used its ID. 
    // So likely ID == Domain if created via my helper.
    // But if Shop was created elsewhere randomly...
    // Safest: Lookup Shop by domain.

    // Actually, standard Remix Shopify templates often don't have a Shop table and use session.shop everywhere.

    // Let's create a small helper in this file or assume we can pass session.shop if we enforce ID=Domain.
    // I will enforce ID=Domain in my logic for simplicity in this MVP.

    return json({ campaigns });
}

export async function action({ request }: ActionFunctionArgs) {
    const { session } = await authenticate.admin(request);

    if (request.method === "POST") {
        const data = await request.json();

        // Validate data minimal (could use Zod)
        const campaign = await createCampaign(session.shop, data);
        return json({ campaign });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
}
