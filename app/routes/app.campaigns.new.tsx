import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useSubmit, useNavigation } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    FormLayout,
    TextField,
    Select,
    BlockStack,
    Checkbox,
    InlineGrid,
    Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createCampaign } from "../models/campaign.server";

export async function action({ request }: ActionFunctionArgs) {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const message = formData.get("message") as string;
    const placement = formData.get("placement") as string;
    const priority = Number(formData.get("priority") || 0);
    const enabled = formData.get("enabled") === "true";
    const buttonText = formData.get("buttonText") as string;
    const buttonUrl = formData.get("buttonUrl") as string;

    // Style
    const backgroundColor = formData.get("style_backgroundColor") as string;
    const textColor = formData.get("style_textColor") as string;
    const styleJson = JSON.stringify({ backgroundColor, textColor });

    // Rule
    const pageScope = formData.get("rule_pageScope") as string;
    const urlPrefix = formData.get("rule_urlPrefix") as string;
    const device = formData.get("rule_device") as string;
    const frequency = formData.get("rule_frequency") as string;

    try {
        await createCampaign(session.shop, {
            shopId: session.shop, // This might be ignored or used for ID lookup depending on model implementation
            title,
            message,
            placement,
            priority,
            enabled,
            buttonText,
            buttonUrl,
            styleJson,
            rule: {
                pageScope,
                urlPrefix,
                device,
                frequency,
            },
        });
        return redirect("/app/campaigns");
    } catch (error) {
        return json({ error: "Failed to create campaign" });
    }
}

export default function NewCampaign() {
    const submit = useSubmit();
    const nav = useNavigation();
    // const actionData = useActionData<typeof action>();
    const isSaving = nav.state === "submitting";

    const [formState, setFormState] = useState({
        title: "",
        message: "",
        placement: "TOP",
        priority: "0",
        enabled: true,
        buttonText: "",
        buttonUrl: "",
        style_backgroundColor: "#000000",
        style_textColor: "#ffffff",
        rule_pageScope: "ALL",
        rule_urlPrefix: "",
        rule_device: "ALL",
        rule_frequency: "FIRST",
    });

    const handleSave = () => {
        submit({ ...formState, enabled: String(formState.enabled) }, { method: "POST" });
    };

    return (
        <Page
            title="Create Campaign"
            backAction={{ url: "/app/campaigns" }}
            primaryAction={{
                content: "Save",
                loading: isSaving,
                onAction: handleSave,
            }}
        >
            <Layout>
                <Layout.Section>
                    <FormLayout>
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">General</Text>
                                <TextField
                                    label="Title"
                                    value={formState.title}
                                    onChange={(v) => setFormState({ ...formState, title: v })}
                                    autoComplete="off"
                                />
                                <Checkbox
                                    label="Enabled"
                                    checked={formState.enabled}
                                    onChange={(v) => setFormState({ ...formState, enabled: v })}
                                />
                                <InlineGrid columns={2} gap="400">
                                    <Select
                                        label="Placement"
                                        options={[{ label: "Top", value: "TOP" }, { label: "Bottom", value: "BOTTOM" }]}
                                        value={formState.placement}
                                        onChange={(v) => setFormState({ ...formState, placement: v })}
                                    />
                                    <TextField
                                        label="Priority (Higher = Displayed)"
                                        type="number"
                                        value={formState.priority}
                                        onChange={(v) => setFormState({ ...formState, priority: v })}
                                        autoComplete="off"
                                    />
                                </InlineGrid>
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Content & Style</Text>
                                <TextField
                                    label="Message"
                                    value={formState.message}
                                    onChange={(v) => setFormState({ ...formState, message: v })}
                                    autoComplete="off"
                                />
                                <InlineGrid columns={2} gap="400">
                                    <TextField
                                        label="Button Text (Optional)"
                                        value={formState.buttonText}
                                        onChange={(v) => setFormState({ ...formState, buttonText: v })}
                                        autoComplete="off"
                                    />
                                    <TextField
                                        label="Button URL (Optional)"
                                        value={formState.buttonUrl}
                                        onChange={(v) => setFormState({ ...formState, buttonUrl: v })}
                                        autoComplete="off"
                                    />
                                </InlineGrid>
                                <InlineGrid columns={2} gap="400">
                                    <TextField
                                        label="Background Color (Hex)"
                                        value={formState.style_backgroundColor}
                                        onChange={(v) => setFormState({ ...formState, style_backgroundColor: v })}
                                        autoComplete="off"
                                        prefix="#"
                                    />
                                    <TextField
                                        label="Text Color (Hex)"
                                        value={formState.style_textColor}
                                        onChange={(v) => setFormState({ ...formState, style_textColor: v })}
                                        autoComplete="off"
                                        prefix="#"
                                    />
                                </InlineGrid>
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">Targeting Rules</Text>
                                <Select
                                    label="Page Scope"
                                    options={[
                                        { label: "All Pages", value: "ALL" },
                                        { label: "Product Pages", value: "PRODUCT" },
                                        { label: "Collection Pages", value: "COLLECTION" },
                                        { label: "Specific URL Check", value: "URL_PREFIX" },
                                    ]}
                                    value={formState.rule_pageScope}
                                    onChange={(v) => setFormState({ ...formState, rule_pageScope: v })}
                                />
                                {formState.rule_pageScope === "URL_PREFIX" && (
                                    <TextField
                                        label="URL Contains (Prefix)"
                                        value={formState.rule_urlPrefix}
                                        onChange={(v) => setFormState({ ...formState, rule_urlPrefix: v })}
                                        autoComplete="off"
                                        helpText="e.g. /pages/summer-sale"
                                    />
                                )}
                                <InlineGrid columns={2} gap="400">
                                    <Select
                                        label="Device"
                                        options={[
                                            { label: "All Devices", value: "ALL" },
                                            { label: "Desktop Only", value: "DESKTOP" },
                                            { label: "Mobile Only", value: "MOBILE" },
                                        ]}
                                        value={formState.rule_device}
                                        onChange={(v) => setFormState({ ...formState, rule_device: v })}
                                    />
                                    <Select
                                        label="Frequency"
                                        options={[
                                            { label: "First visit only", value: "FIRST" },
                                            { label: "Every 24 hours", value: "H24" },
                                            { label: "Every 7 days", value: "D7" },
                                        ]}
                                        value={formState.rule_frequency}
                                        onChange={(v) => setFormState({ ...formState, rule_frequency: v })}
                                    />
                                </InlineGrid>
                            </BlockStack>
                        </Card>
                    </FormLayout>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
