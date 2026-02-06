import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Fix 3-1: Combine auth calls
  const { session, billing } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Get active subscription
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

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
  });

  if (!shop) {
    return json({ currentPlan });
  }

  return json({
    currentPlan
  });
};

export default function Index() {
  const { currentPlan } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
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
      </BlockStack>
    </Page>
  );
}
