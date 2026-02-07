import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useSubmit, useNavigation } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    Button,
    BlockStack,
    Text,
    InlineGrid,
    Box,
    List,
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { billing } = await authenticate.admin(request);

    try {
        const billingCheck = await billing.check({
            plans: [MONTHLY_PLAN, ANNUAL_PLAN],
            isTest: process.env.SHOPIFY_BILLING_TEST === "true",
        });

        if (billingCheck.hasActivePayment) {
            return redirect("/app");
        }
    } catch (error) {
        if (error instanceof Response) throw error;
    }

    return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { billing } = await authenticate.admin(request);
    const formData = await request.formData();
    const plan = formData.get("plan") as string;

    if (plan !== MONTHLY_PLAN && plan !== ANNUAL_PLAN) {
        return json({ error: "Invalid plan" }, { status: 400 });
    }

    const origin = process.env.SHOPIFY_APP_URL ?? new URL(request.url).origin;
    await billing.request({
        plan: plan === MONTHLY_PLAN ? MONTHLY_PLAN : ANNUAL_PLAN,
        isTest: process.env.SHOPIFY_BILLING_TEST === "true",
        returnUrl: new URL("/app", origin).toString(),
    });

    return null;
};

export default function SelectPlan() {
    const submit = useSubmit();
    const nav = useNavigation();
    const isSubmitting = nav.state === "submitting";

    const handleSelect = (plan: string) => {
        if (isSubmitting) return;
        submit({ plan }, { method: "POST" });
    };

    return (
        <Page title="Select a Plan">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">What you get</Text>
                            <List>
                                <List.Item>Speed-first banner (minimal JS, avoids CLS/LCP issues)</List.Item>
                                <List.Item>Impression & click tracking</List.Item>
                                <List.Item>Last 30 days dashboard report</List.Item>
                            </List>
                            <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                                <BlockStack gap="200">
                                    <Text as="p" variant="bodySm">
                                        Start with a <strong>30-day free trial</strong>. You can cancel anytime from Shopify admin (Apps &gt; App and sales channels).
                                    </Text>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                        No charges during the trial.
                                    </Text>
                                </BlockStack>
                            </Box>
                        </BlockStack>
                    </Card>
                </Layout.Section>
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        {/* Monthly Plan */}
                        <Card>
                            <BlockStack gap="400" align="center">
                                <Text as="h2" variant="headingLg">
                                    Monthly
                                </Text>
                                <div style={{ height: "100px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Text as="p" variant="heading3xl">
                                        $9
                                        <Text as="span" variant="bodyMd" tone="subdued">/mo</Text>
                                    </Text>
                                </div>
                                <Text as="p" variant="bodyMd" tone="subdued">
                                    Standard features. 30-day free trial.
                                </Text>
                                <Button
                                    variant="primary"
                                    onClick={() => handleSelect(MONTHLY_PLAN)}
                                    loading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Select Monthly
                                </Button>
                            </BlockStack>
                        </Card>

                        {/* Annual Plan */}
                        <Card>
                            <BlockStack gap="400" align="center">
                                <Text as="h2" variant="headingLg">
                                    Annual
                                </Text>
                                <div style={{ height: "100px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Text as="p" variant="heading3xl">
                                        $90
                                        <Text as="span" variant="bodyMd" tone="subdued">/yr</Text>
                                    </Text>
                                </div>
                                <Box background="bg-surface-success" padding="200" borderRadius="200">
                                    <Text as="p" variant="bodySm" tone="success">
                                        Save ~17% (2 months free)
                                    </Text>
                                </Box>
                                <Text as="p" variant="bodyMd" tone="subdued">
                                    Standard features. 30-day free trial.
                                </Text>
                                <Button
                                    onClick={() => handleSelect(ANNUAL_PLAN)}
                                    loading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Select Annual
                                </Button>
                            </BlockStack>
                        </Card>
                    </InlineGrid>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
