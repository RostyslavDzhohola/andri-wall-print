# Stripe Reserve Deposit — Setup & Daily Routine (Client SOP)

This is your one-page guide for the $100 reserve deposit. Everything here happens
in the Stripe dashboard — there is no payment code on the website, so you stay in
full control.

> Placeholders to fill in: `<domain>` = your live website domain (e.g.
> `www.wallprintpro.com`). Once created, paste the Payment Link URL into the
> website's `WALL_PRINT_PRO_RESERVE_URL` setting (your developer knows where).

## One-time setup: create the Payment Link

1. In Stripe, go to **Payment Links → + New**.
2. Product: name it **"Wall print reserve deposit"**. Price: **$100.00, one-time**.
3. In the product/price description, use this exact wording:
   **"Reserves your print-job slot. Credited toward your final print price."**
4. Under **After payment**, choose **"Don't show confirmation page — redirect
   customers to your website"** and paste exactly:

   ```
   https://<domain>/reserved?session_id={CHECKOUT_SESSION_ID}
   ```

   Keep `{CHECKOUT_SESSION_ID}` exactly as written, curly braces and all —
   Stripe fills it in automatically. This is how the thank-you page shows the
   buyer their receipt reference.
5. Under **After payment → Confirmation email**: make sure the payment
   receipt email is turned on, and add a custom message that includes:
   - the link `https://<domain>/reserved`
   - "Next step: text or call us to schedule your estimate visit."
6. On the payment page itself, add the custom message:
   **"This $100 deposit reserves your print-job slot and is credited toward your
   final print price. Custom artwork must be licensed or original; printability
   is confirmed at your estimate."**

## Test it before sharing (5 minutes, on your phone)

1. Open the Payment Link on your phone and pay (use Stripe test mode first if
   your developer has it set up, otherwise pay $100 live and refund yourself).
2. After paying you should land on the **"You're in line"** page with a small
   "Receipt ref …" line near the top.
3. Open the confirmation email Stripe sent you and tap the /reserved link —
   the same page should load fine (without the receipt line — that's normal).

Your developer can also run a quick automated check of the link:
`node scripts/check-stripe-redirect.mjs <your-payment-link-url>`

## Daily routine

- **Install the Stripe mobile app** (iPhone/Android) and turn on push
  notifications so every deposit pings your phone immediately.
- **Respond to every payment notification within 24 hours.** The buyer just
  paid you $100 and is waiting — text or call them to schedule the estimate
  visit. Their name, email, and phone are in the Stripe payment details.
- At the estimate visit, remember: the $100 comes **off their final print
  price** — it is not an extra fee.

## Refunds

- Handle refunds directly in the Stripe dashboard: open the payment →
  **Refund**. The money goes back to the buyer's card automatically
  (typically 5–10 business days).
- Refund promptly if a job can't proceed (e.g. artwork can't be licensed or the
  wall isn't printable) — fast refunds protect your reviews.
