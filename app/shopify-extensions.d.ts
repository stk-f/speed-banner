import "@shopify/shopify-app-remix/server";

declare module "@shopify/shopify-app-remix/server" {
    export interface AppSubscriptionLineItem {
        trialDays?: number;
    }
    export interface BillingConfigRecurringLineItem {
        trialDays?: number;
    }
    export interface BillingConfigOneTimeLineItem {
        trialDays?: number;
    }
}
