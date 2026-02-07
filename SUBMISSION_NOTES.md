# Submission Notes for Reviewer

These instructions outline how to verify the functionality of Speed Banner and confirm all requirements are met.

## 1. Installation & Onboarding

1.  **Install App**: Install Speed Banner on a Development Store.
2.  **Plan Selection**: After installation, you will be redirected to `/app/select-plan`.
    *   **Note**: Please use a **Test Charge** (Development Store) to verify billing. The app respects `SHOPIFY_BILLING_TEST=true` / Development Mode.
3.  **Approval**: Approve the subscription (30-day trial).
4.  **Dashboard**: You should land on the main Dashboard (`/app`).
    *   Verify the **"Current Plan"** card shows your selected plan.
    *   Verify the **"Analytics Cards"** (Impressions/Clicks) are visible.

## 2. Banner Creation & Display

1.  **Create Campaign**:
    *   Click **"Create campaign"** (primary button on Dashboard) or go to **Campaigns**.
    *   Fill in:
        *   Title: `Test Banner`
        *   Message: `Hello Reviewer`
        *   Placement: `Bottom`
        *   Status: `Active`
    *   Click **"Save"**.
    *   Verify the campaign appears in the dashboard list.

2.  **Storefront Display (Theme App Extension)**:
    *   Go to **Online Store > Themes > Customize**.
    *   Add the **"Banner Block"** (Speed Banner) to a section (e.g., Header or Footer).
    *   Save and View the storefront.
    *   **Verify**: The banner `Hello Reviewer` appears at the bottom.

## 3. Analytics Verification

1.  **Impression**: Reload the storefront page where the banner is visible.
2.  **Click**: Click the button or link on the banner (if configured).
3.  **Verify**:
    *   Return to the App Dashboard (`/app`).
    *   The **"Last 30 Days"** chart should now show data (Impressions/Clicks).
    *   *Note*: Data is updated in real-time or near real-time.

## 4. Legal Pages

Verify that the following public pages are accessible and contain compliant information:
*   [Privacy Policy](https://speedbanner.app/privacy) - Confirms data retention policy (deleted on uninstall).
*   [Terms of Service](https://speedbanner.app/terms) - detailed pricing and cancellation policy.
*   [Contact](https://speedbanner.app/contact) - Support information.

## 5. Uninstallation & Data Cleanup

1.  **Uninstall**: Remove the app from your store.
2.  **Verification**:
    *   The app's **Uninstall Webhook** triggers immediately.
    *   It performs a strict cleanup:
        *   **Shop Record**: Deleted.
        *   **Campaigns & Rules**: Deleted (Cascade).
        *   **Analytics Data**: Deleted.
        *   **Session**: Deleted.
    *   No data related to your shop remains in our database.

## 6. Security

*   **App Proxy**: The app uses `authenticate.public.appProxy` validation for all public analytic events.
*   **Cross-Shop Check**: The API verifies that the Campaign ID belongs to the authenticated Shop before processing any events.
*   **Scopes**: Minimal scope `read_themes` used.
