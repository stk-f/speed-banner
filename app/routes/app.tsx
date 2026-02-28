import { redirect } from "@remix-run/node";
import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// app/routes/app.tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request); // billing is available here

  const url = new URL(request.url);
  if (url.pathname !== "/app/select-plan") {
    // Require billing
    await billing.require({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: process.env.SHOPIFY_BILLING_TEST === "true",
      onFailure: async () => {
        throw redirect("/app/select-plan");
      },
    });
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/campaigns">Campaigns</Link>
        <Link to="/app/guide">Guide</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
