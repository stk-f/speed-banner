import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  IndexTable,
  LegacyCard,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "../shopify.server";
import prisma from "../db.server";

// Helper for CTR calculation
const calculateCtr = (clicks: number, impressions: number) => {
  if (impressions === 0) return "0.0";
  return ((clicks / impressions) * 100).toFixed(1);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // 1. Billing Check (Existing Logic)
  let currentPlan = "No active plan";
  try {
    const billingCheck = await billing.check({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: process.env.SHOPIFY_BILLING_TEST === "true",
    });
    if (billingCheck.hasActivePayment) {
      currentPlan = billingCheck.appSubscriptions[0].name;
    }
  } catch (e) {
    console.error("Billing check failed", e);
  }

  // 2. Fetch Shop & Campaigns
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    include: {
      campaigns: {
        select: { id: true, title: true }
      }
    }
  });

  if (!shop) {
    return json({
      currentPlan,
      analytics: {
        totalImpressions: 0,
        totalClicks: 0,
        ctr: "0.0",
        breakdown: []
      }
    });
  }

  // 3. Analytics Data Fetching (Last 30 Days)
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 30);
  const sinceStr = sinceDate.toISOString().slice(0, 10);

  const campaignIds = shop.campaigns.map(c => c.id);

  const dailyRecords = await prisma.analyticsDaily.findMany({
    where: {
      campaignId: { in: campaignIds },
      date: { gte: sinceStr }
    }
  });

  // 4. Aggregation Logic (In-Memory)
  let totalImpressions = 0;
  let totalClicks = 0;
  const breakdownMap: Record<string, { id: string; name: string; imp: number; click: number }> = {};

  // Init map with all campaigns (even with 0 data)
  shop.campaigns.forEach(c => {
    breakdownMap[c.id] = { id: c.id, name: c.title, imp: 0, click: 0 };
  });

  dailyRecords.forEach(r => {
    if (breakdownMap[r.campaignId]) {
      breakdownMap[r.campaignId].imp += r.impressions;
      breakdownMap[r.campaignId].click += r.clicks;
      totalImpressions += r.impressions;
      totalClicks += r.clicks;
    }
  });

  const breakdown = Object.values(breakdownMap).map(b => ({
    ...b,
    ctr: calculateCtr(b.click, b.imp)
  })); // No sorting required by spec

  return json({
    currentPlan,
    analytics: {
      totalImpressions,
      totalClicks,
      ctr: calculateCtr(totalClicks, totalImpressions),
      breakdown
    }
  });
};

export default function Index() {
  const { currentPlan, analytics } = useLoaderData<typeof loader>();

  // Table setup
  const resourceName = { singular: 'campaign', plural: 'campaigns' };
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(analytics.breakdown);

  const rowMarkup = analytics.breakdown.map(
    ({ id, name, imp, click, ctr }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{imp.toLocaleString()}</IndexTable.Cell>
        <IndexTable.Cell>{click.toLocaleString()}</IndexTable.Cell>
        <IndexTable.Cell>{ctr}%</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">

        {/* Billing Info */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Current Plan</Text>
                <Text as="p" variant="bodyMd">{currentPlan}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* KPI Cards */}
        <Layout>
          <Layout.Section>
            <Text as="h2" variant="headingLg">Analytics (Last 30 Days)</Text>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">Total Impressions</Text>
                <Text as="p" variant="headingXl">{analytics.totalImpressions.toLocaleString()}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">Total Clicks</Text>
                <Text as="p" variant="headingXl">{analytics.totalClicks.toLocaleString()}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">CTR</Text>
                <Text as="p" variant="headingXl">{analytics.ctr}%</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Campaign Table */}
        <Layout>
          <Layout.Section>
            <LegacyCard>
              <IndexTable
                resourceName={resourceName}
                itemCount={analytics.breakdown.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: 'Campaign' },
                  { title: 'Impressions' },
                  { title: 'Clicks' },
                  { title: 'CTR' },
                ]}
                selectable={false} // Requirement: Minimal, no actions
              >
                {rowMarkup}
              </IndexTable>
            </LegacyCard>
          </Layout.Section>
        </Layout>

      </BlockStack>
    </Page>
  );
}
