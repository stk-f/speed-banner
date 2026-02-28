# Submission Notes for Reviewer

These instructions outline how to verify the functionality of Speed Banner.

For a full step-by-step walkthrough with screenshots guidance, see
**[docs/qa-minimum.md — Part A (Reviewer Steps)](docs/qa-minimum.md)**.

---

## 1. Installation & Onboarding

1. **Install App**: Install Speed Banner on a Development Store.
2. **Plan Selection**: After installation, you will be redirected to `/app/select-plan`.
    - The page shows two plans: **Monthly ($9/mo)** and **Annual ($90/yr)**.
    - Both plans include a **30-day free trial**. No charge is made during the trial.
    - **Note**: On a Development Store, use a **Test Charge** to approve billing without real payment.
3. **Approval**: Select a plan and approve the Shopify billing confirmation.
4. **Dashboard**: You should land on the main Dashboard (`/app`).
    - Verify the **"Current Plan"** card shows the plan name you selected.
    - Verify the **Analytics (Last 30 Days)** section is visible (values start at 0).

---

## 2. Banner Creation & Display

1. **Create Campaign**:
    - Click **"Create campaign"** (top-right button on Dashboard) or go to **Campaigns**.
    - Fill in:
        - Title: `Test Banner`
        - Message: `Hello Reviewer`
        - Placement: `Bottom`
        - **Enabled**: checked (this controls whether the banner is live)
    - Click **"Save"**.
    - Verify the campaign appears in **Campaigns** list with an **Active** badge.

2. **Storefront Display (Theme App Extension)**:
    - Go to **Online Store > Themes > Customize**.
    - In the left sidebar, click **"Add section"**.
    - Under the **Apps** category, select **"Banner Block"** (Speed Banner).
    - Click **"Save"**, then open your storefront in a new tab.
    - **Verify**: The banner `Hello Reviewer` appears at the bottom of the page.

---

## 3. Analytics Verification

1. **Impression event**: Open (or reload) the storefront page where the banner is visible.
2. **Click event**: Click the CTA button on the banner (if you configured one).
3. **Verify via DevTools**:
    - Open **F12 → Network tab**, filter by `event`.
    - Confirm a `POST /apps/speed-banner/event` request returned **status 200** with body `{}`.
    - A 200 response confirms the event was recorded. **This is the primary success indicator.**
4. **Verify via Dashboard**:
    - Return to the App Dashboard (`/app`) and **reload the page**.
    - The **Analytics (Last 30 Days)** section should now show Impressions ≥ 1.
    - *Note*: The Dashboard reads from the database on page load. If the count does not
      update immediately, wait a moment and reload once more.

---

## 4. Legal Pages

Verify that the following public pages are accessible:

| Page | URL | Key content |
|------|-----|-------------|
| Privacy Policy | https://speedbanner.app/privacy | Data retention: deleted on uninstall |
| Terms of Service | https://speedbanner.app/terms | Pricing ($9/mo or $90/yr), 30-day trial, cancellation |
| Contact | https://speedbanner.app/contact | Support email: support@speedbanner.app |

---

## 5. Uninstallation

1. **Uninstall**: Remove the app from your store via **Apps > Speed Banner > Delete**.
2. The app registers a `app/uninstalled` webhook.
   On receipt, the server deletes all data associated with your shop
   (Shop record, Campaigns, Rules, Analytics, Session).
3. **What you can verify**: The app is removed cleanly from your store with no errors.
   Data deletion is a server-side operation confirmed by the webhook handler in
   `app/routes/webhooks.app.uninstalled.tsx`.

---

## 6. Security

| Mechanism | Details |
|-----------|---------|
| App Proxy auth | All storefront API calls validated via `authenticate.public.appProxy` (Shopify HMAC) |
| Campaign ownership check | `/api/event` verifies `campaign.shop.shopDomain === session.shop` before saving any analytics |
| Minimal scopes | Only `read_themes` is requested |
| Input validation | Server-side validation on all campaign create/update actions (title, message, URL format, priority range) |
