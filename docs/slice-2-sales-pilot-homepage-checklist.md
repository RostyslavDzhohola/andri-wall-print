# Slice 2: Sales Pilot Homepage and Request Polish

## Source Artifacts

- Office Hours design direction: `/Users/Rostyslav/.gstack/projects/preview-picture/Rostyslav-main-design-20260616-201112.md`
- CEO plan: `/Users/Rostyslav/.gstack/projects/preview-picture/ceo-plans/2026-06-17-wall-print-pro-sales-pilot-ai-draft-previews.md`
- Plan Engineer test plan: `/Users/Rostyslav/.gstack/projects/preview-picture/Rostyslav-main-eng-review-test-plan-20260616-213842.md`
- Current shipping guide: `/Users/Rostyslav/Projects/preview-picture/docs/gstack-shipping-guide.html`

## GStack Decision

Do not rerun Office Hours or CEO review for this slice. Those artifacts already define the direction.

A full Plan Engineer rerun is not required before building slice 2 because this slice stays inside the already-reviewed plan: public homepage, request flow polish, contact cues, and CTA behavior.

Run a narrow Plan Engineer review only if one of these happens:

- The GStack ship/review dashboard requires a branch-local review artifact.
- The implementation expands into new backend architecture, payments, booking, public pricing, or final measurement.
- The slice becomes ambiguous enough that the checklist below no longer answers what to build.

## Goal

Turn the existing prototype entry point into a clearer Wall Print Pro sales-pilot page that helps a real lead understand the offer, see proof, and choose the right next action.

## In Scope

### Homepage `/`

- Keep the visual preview/prototype as a primary proof point.
- Make the first viewport clearly say that Wall Print Pro can help a client preview wall art before committing.
- Add clear primary and secondary actions:
  - Try artwork in the gallery: `/gallery`
  - Request a wall preview: `/request`
  - Reserve interest: `/request?intent=reserve`
  - Call/contact the seller only when public contact config exists
- Add homepage sections for:
  - Portfolio or proof of real wall-print work
  - Home and business use cases
  - Simple process from photo/upload to preview to install conversation
  - Trust/contact cues
- Preserve the sales-pilot framing. This is not the final company website.

### Request Flow `/request`

- Align the form with the CEO plan:
  - Name
  - Preferred contact method
  - Email or phone, with at least one required
  - Project type
  - Room or business context
  - Notes
  - Desired timing or reserve intent where already supported
- Keep uploads and existing preview-request behavior working.
- Keep internal estimate data out of public UI and public payloads.

### Tests And Verification

- Add or update route/UI tests for homepage CTA targets.
- Add or update request validation tests for preferred contact method and email-or-phone requirements.
- Add or update fallback coverage for missing public phone/contact config if the app already supports that configuration path.
- Run the relevant existing checks after implementation:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm test:e2e` if the slice touches tested browser flows

## Out Of Scope

- Payment collection
- Booking/calendar scheduling
- Final measurement workflow
- Public pricing calculator
- Real production AI generation changes
- A full CMS or final official marketing site
- Admin overhaul beyond what is needed to preserve current request behavior

## Acceptance Criteria

- A new lead can land on `/`, understand the offer in under 10 seconds, and choose gallery, request, reserve, or contact.
- `/request` captures the contact and project details needed for the seller to follow up.
- The app does not expose internal price/estimate fields to public users.
- Existing preview, gallery, admin, and request tests still pass.
- The implementation remains a slice of the sales pilot, not a widened platform build.

## Suggested Implementation Order

1. Inspect current `/`, `/request`, shared config, and tests.
2. Update homepage structure and copy.
3. Add contact-config fallback behavior if missing or incomplete.
4. Polish request form fields and validation.
5. Update tests around public CTAs and request validation.
6. Run verification commands.
7. If the GStack review dashboard needs branch-local proof, run a narrow Plan Engineer review against this slice.
