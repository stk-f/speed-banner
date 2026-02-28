import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
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
import {
    getCampaign,
    updateCampaign,
    deleteCampaign,
    validateCampaignInput,
    type CampaignValidationErrors,
} from "../models/campaign.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
    const { session } = await authenticate.admin(request);
    if (!params.id) throw new Response("Missing ID", { status: 400 });
    const campaign = await getCampaign(params.id, session.shop);
    if (!campaign) throw new Response("Not Found", { status: 404 });
    return json({ campaign });
}

export async function action({ request, params }: ActionFunctionArgs) {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (!params.id) throw new Response("Missing ID", { status: 400 });

    if (intent === "delete") {
        await deleteCampaign(params.id, session.shop);
        return redirect("/app/campaigns");
    }

    const title      = (formData.get("title")      as string) ?? "";
    const message    = (formData.get("message")    as string) ?? "";
    const placement  = (formData.get("placement")  as string) ?? "";
    const priorityRaw = (formData.get("priority")  as string) ?? "0";
    const enabled    = formData.get("enabled") === "true";
    const buttonText = (formData.get("buttonText") as string) ?? "";
    const buttonUrl  = (formData.get("buttonUrl")  as string) ?? "";

    const backgroundColor = (formData.get("style_backgroundColor") as string) ?? "#000000";
    const textColor       = (formData.get("style_textColor")       as string) ?? "#ffffff";
    const styleJson       = JSON.stringify({ backgroundColor, textColor });

    const pageScope  = (formData.get("rule_pageScope")  as string) ?? "";
    const urlPrefix  = (formData.get("rule_urlPrefix")  as string) ?? "";
    const device     = (formData.get("rule_device")     as string) ?? "";
    const frequency  = (formData.get("rule_frequency")  as string) ?? "";

    const errors = validateCampaignInput({
        title, message, placement, pageScope, device, frequency,
        urlPrefix, buttonUrl, priority: priorityRaw,
    });
    if (errors) return json({ errors });

    await updateCampaign(params.id, session.shop, {
        title: title.trim(),
        message: message.trim(),
        placement,
        priority: Number(priorityRaw),
        enabled,
        buttonText,
        buttonUrl: buttonUrl.trim(),
        styleJson,
        rule: { pageScope, urlPrefix: urlPrefix.trim(), device, frequency },
    });

    return redirect("/app/campaigns");
}

export default function EditCampaign() {
    const { campaign } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const nav = useNavigation();
    const actionData = useActionData<typeof action>();
    const errors = actionData?.errors as CampaignValidationErrors | undefined;
    const isSaving = nav.state === "submitting" && nav.formData?.get("intent") !== "delete";
    const isDeleting = nav.state === "submitting" && nav.formData?.get("intent") === "delete";

    const styleObj = JSON.parse(campaign.styleJson || "{}");

    const [formState, setFormState] = useState({
        title: campaign.title,
        message: campaign.message,
        placement: campaign.placement,
        priority: String(campaign.priority),
        enabled: campaign.enabled,
        buttonText: campaign.buttonText || "",
        buttonUrl: campaign.buttonUrl || "",
        style_backgroundColor: styleObj.backgroundColor || "#000000",
        style_textColor: styleObj.textColor || "#ffffff",
        rule_pageScope: campaign.rule?.pageScope || "ALL",
        rule_urlPrefix: campaign.rule?.urlPrefix || "",
        rule_device: campaign.rule?.device || "ALL",
        rule_frequency: campaign.rule?.frequency || "FIRST",
    });

    const handleSave = () => {
        submit({ ...formState, enabled: String(formState.enabled), intent: "save" }, { method: "POST" });
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this campaign?")) {
            submit({ intent: "delete" }, { method: "POST" });
        }
    };

    return (
        <Page
            title="Edit Campaign"
            backAction={{ url: "/app/campaigns" }}
            primaryAction={{
                content: "Save",
                loading: isSaving,
                onAction: handleSave,
            }}
            secondaryActions={[
                {
                    content: "Delete",
                    destructive: true,
                    loading: isDeleting,
                    onAction: handleDelete,
                }
            ]}
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
                                    error={errors?.title}
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
                                        error={errors?.placement}
                                    />
                                    <TextField
                                        label="Priority (−100 to 100)"
                                        type="number"
                                        value={formState.priority}
                                        onChange={(v) => setFormState({ ...formState, priority: v })}
                                        autoComplete="off"
                                        error={errors?.priority}
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
                                    error={errors?.message}
                                />
                                <InlineGrid columns={2} gap="400">
                                    <TextField
                                        label="Button Text"
                                        value={formState.buttonText}
                                        onChange={(v) => setFormState({ ...formState, buttonText: v })}
                                        autoComplete="off"
                                    />
                                    <TextField
                                        label="Button URL (https:// or /path)"
                                        value={formState.buttonUrl}
                                        onChange={(v) => setFormState({ ...formState, buttonUrl: v })}
                                        autoComplete="off"
                                        error={errors?.buttonUrl}
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
                                    error={errors?.pageScope}
                                />
                                {formState.rule_pageScope === "URL_PREFIX" && (
                                    <TextField
                                        label="URL Contains (Prefix)"
                                        value={formState.rule_urlPrefix}
                                        onChange={(v) => setFormState({ ...formState, rule_urlPrefix: v })}
                                        autoComplete="off"
                                        helpText="e.g. /pages/summer-sale"
                                        error={errors?.urlPrefix}
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
                                        error={errors?.device}
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
                                        error={errors?.frequency}
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
