import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    Button,
    IndexTable,
    Badge,
    Text,
    EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getCampaigns } from "../models/campaign.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const { session } = await authenticate.admin(request);
    const campaigns = await getCampaigns(session.shop);
    return json({ campaigns });
}

export default function CampaignsList() {
    const { campaigns } = useLoaderData<typeof loader>();

    return (
        <Page
            title="Campaigns"
            primaryAction={
                <Button variant="primary" url="/app/campaigns/new">
                    Create campaign
                </Button>
            }
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        {campaigns.length === 0 ? (
                            <EmptyState
                                heading="Create your first campaign"
                                action={{ content: "Create campaign", url: "/app/campaigns/new" }}
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <p>Manage banners and popups for your store.</p>
                            </EmptyState>
                        ) : (
                            <IndexTable
                                resourceName={{ singular: "campaign", plural: "campaigns" }}
                                itemCount={campaigns.length}
                                headings={[
                                    { title: "Title" },
                                    { title: "Status" },
                                    { title: "Priority" },
                                    { title: "Placement" },
                                    { title: "Date" },
                                ]}
                                selectable={false}
                            >
                                {campaigns.map((campaign: any) => (
                                    <IndexTable.Row
                                        id={campaign.id}
                                        key={campaign.id}
                                        position={campaign.id}
                                    >
                                        <IndexTable.Cell>
                                            <Text variant="bodyMd" fontWeight="bold" as="span">
                                                <Link to={`/app/campaigns/${campaign.id}`}>
                                                    {campaign.title}
                                                </Link>
                                            </Text>
                                        </IndexTable.Cell>
                                        <IndexTable.Cell>
                                            <Badge tone={campaign.enabled ? "success" : "critical"}>
                                                {campaign.enabled ? "Active" : "Inactive"}
                                            </Badge>
                                        </IndexTable.Cell>
                                        <IndexTable.Cell>{campaign.priority}</IndexTable.Cell>
                                        <IndexTable.Cell>{campaign.placement}</IndexTable.Cell>
                                        <IndexTable.Cell>
                                            {new Date(campaign.createdAt).toLocaleDateString()}
                                        </IndexTable.Cell>
                                    </IndexTable.Row>
                                ))}
                            </IndexTable>
                        )}
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
