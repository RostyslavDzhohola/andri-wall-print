#!/usr/bin/env node
// Local manual-verification helper for the reserve-flow Stripe Payment Link.
//
// Usage:
//   node scripts/check-stripe-redirect.mjs https://buy.stripe.com/XXXXXXXX
//
// What it does (NO Stripe API key, NO secrets):
//   1. Fetches the Payment Link URL and confirms it resolves (HTTP 200).
//   2. Sanity-checks it looks Stripe-hosted (buy.stripe.com / checkout.stripe.com).
//   3. Prints the manual checklist for the post-payment redirect, which can only
//      be verified in the Stripe dashboard + a real phone round-trip.
//
// The redirect itself is dashboard configuration and cannot be read from the
// public link page, hence the checklist.

// LAUNCH GATE: replace with the real production domain (must match lib/site-url.ts).
const EXPECTED_REDIRECT = "https://<domain>/reserved?session_id={CHECKOUT_SESSION_ID}";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const url = process.argv[2];

if (!url) {
  console.error("Usage: node scripts/check-stripe-redirect.mjs <payment-link-url>");
  console.error("Example: node scripts/check-stripe-redirect.mjs https://buy.stripe.com/XXXXXXXX");
  process.exit(2);
}

let parsed;

try {
  parsed = new URL(url);
} catch {
  fail(`Not a valid URL: ${url}`);
}

if (parsed.protocol !== "https:") {
  fail(`Payment Link must be https, got: ${parsed.protocol}//`);
}

const stripeHosted = parsed.hostname === "buy.stripe.com" || parsed.hostname.endsWith(".stripe.com");

if (!stripeHosted) {
  console.warn(`WARN: ${parsed.hostname} is not a *.stripe.com host — is this really the Stripe Payment Link?`);
}

console.log(`Checking Payment Link: ${url}`);

const response = await fetch(url, { redirect: "follow" }).catch((error) => {
  fail(`Fetch failed: ${error?.message ?? error}`);
});

if (!response.ok) {
  fail(`Payment Link responded ${response.status} ${response.statusText} — link is not live.`);
}

const finalHost = new URL(response.url).hostname;

console.log(`OK: link resolves (HTTP ${response.status}, served from ${finalHost}).`);

if (!finalHost.endsWith(".stripe.com")) {
  console.warn(`WARN: final host ${finalHost} is not Stripe-hosted.`);
}

console.log(`
Manual checklist (Stripe dashboard > Payment Links > this link):
  [ ] Price is exactly $100.00 USD, one-time.
  [ ] "After payment" is set to redirect customers to:
        ${EXPECTED_REDIRECT}
      (the {CHECKOUT_SESSION_ID} placeholder must be included verbatim —
       Stripe substitutes the real session id on redirect).
  [ ] Confirmation email + payment-page message mention the /reserved URL.
  [ ] Round-trip test ON A PHONE: pay with a test/live card, land on /reserved,
      confirm the page shows the receipt ref line.
  [ ] Re-open /reserved WITHOUT the ?session_id (from the Stripe email link) —
      page must still render completely.
`);
