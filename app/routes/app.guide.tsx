import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    List,
    Banner,
} from "@shopify/polaris";

export default function Guide() {
    return (
        <Page title="Guide">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">How to use Speed Banner</Text>
                            <Text variant="bodyMd" as="p">
                                Display lightweight announcement banners on your storefront in three steps.
                            </Text>

                            <Text variant="headingSm" as="h3">Step 1 — Create a Campaign</Text>
                            <List type="number">
                                <List.Item>Go to the <b>Campaigns</b> tab.</List.Item>
                                <List.Item>Click <b>Create campaign</b>.</List.Item>
                                <List.Item>Enter your message, optional button, placement (Top / Bottom), and targeting rules.</List.Item>
                                <List.Item>Make sure <b>Enabled</b> is checked, then click <b>Save</b>.</List.Item>
                            </List>

                            <Text variant="headingSm" as="h3">Step 2 — Add Banner Block to your Theme</Text>
                            <List type="number">
                                <List.Item>In your Shopify Admin, go to <b>Online Store &gt; Themes</b>.</List.Item>
                                <List.Item>Click <b>Customize</b> on your active theme.</List.Item>
                                <List.Item>In the left sidebar, click <b>Add section</b>.</List.Item>
                                <List.Item>Under the <b>Apps</b> category, select <b>Banner Block</b>.</List.Item>
                                <List.Item>Click <b>Save</b> to publish the change to your storefront.</List.Item>
                            </List>

                            <Text variant="headingSm" as="h3">Step 3 — Verify on your Storefront</Text>
                            <List type="number">
                                <List.Item>Open your storefront in a new browser tab.</List.Item>
                                <List.Item>The active banner should appear at the top or bottom of the page.</List.Item>
                                <List.Item>Return to the Dashboard to confirm Impressions and Clicks are recorded.</List.Item>
                            </List>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Banner tone="warning">
                                <Text as="p" variant="bodyMd">
                                    Banner not showing on your storefront? Work through the checklist below.
                                </Text>
                            </Banner>

                            <Text variant="headingMd" as="h2">Troubleshooting — Banner Not Showing</Text>

                            <Text variant="headingSm" as="h3">1. Banner Block not added to theme</Text>
                            <Text variant="bodyMd" as="p">
                                The Block must be added in the Theme Editor before it can display.
                                Go to <b>Online Store &gt; Themes &gt; Customize</b>, click <b>Add section</b>,
                                and choose <b>Banner Block</b> under Apps. Click <b>Save</b>.
                            </Text>

                            <Text variant="headingSm" as="h3">2. Campaign is Inactive</Text>
                            <Text variant="bodyMd" as="p">
                                Open the campaign and confirm the <b>Enabled</b> checkbox is checked.
                                A campaign with Enabled = false will never be served to visitors.
                            </Text>

                            <Text variant="headingSm" as="h3">3. Frequency cap already reached</Text>
                            <Text variant="bodyMd" as="p">
                                If Frequency is set to <b>First visit only</b>, the banner is hidden after
                                the first view per browser. To see it again without changing settings,
                                open the storefront in a <b>private / incognito window</b> — each private
                                session starts fresh.
                            </Text>
                            <Text variant="bodyMd" as="p">
                                <i>Optional:</i> While testing, you can also edit the campaign and
                                temporarily set Frequency to <b>Every 24 hours</b> or{" "}
                                <b>Every 7 days</b>. You can switch back to your preferred frequency anytime.
                            </Text>

                            <Text variant="headingSm" as="h3">4. URL_PREFIX rule does not match current page</Text>
                            <Text variant="bodyMd" as="p">
                                If Page Scope is set to <b>Specific URL</b>, the URL prefix must match
                                the path of the page you are viewing (e.g. <code>/pages/sale</code>).
                                Switch to <b>All Pages</b> to test without a path filter.
                            </Text>

                            <Text variant="headingSm" as="h3">5. Dashboard shows 0 — but the banner was visible</Text>
                            <Text variant="bodyMd" as="p">
                                The Dashboard counter updates on page load from the database.
                                First confirm the event was sent: open <b>DevTools → Network</b>, filter by
                                <code>event</code>, and look for a <b>POST 200</b> response.
                                If you see 200, the impression was recorded — reload the Dashboard to see the updated count.
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
