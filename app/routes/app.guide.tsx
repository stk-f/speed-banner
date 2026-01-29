import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    List,
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
                                This app allows you to display lightweight banners on your store without slowing it down.
                            </Text>

                            <Text variant="headingSm" as="h3">1. Create a Campaign</Text>
                            <List type="number">
                                <List.Item>Go to the <b>Campaigns</b> tab.</List.Item>
                                <List.Item>Click <b>Create campaign</b>.</List.Item>
                                <List.Item>Enter your message, button details, and targeting rules.</List.Item>
                                <List.Item>Save and ensure "Enabled" is checked.</List.Item>
                            </List>

                            <Text variant="headingSm" as="h3">2. Add to Theme (Coming Soon)</Text>
                            <Text variant="bodyMd" as="p">
                                In the next update, you will be able to add the "Banner Block" to your theme via the Theme Editor.
                                Once added, your active campaigns will automatically appear based on your rules.
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
