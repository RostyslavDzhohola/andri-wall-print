# Wall Print Pro — Design System

Factual documentation of the **current** design language (the values below live in
`app/globals.css` today; they are documented here, not invented). New UI extends
this system — it does not fork a new palette or font.

## Color tokens (`:root` in `app/globals.css`)

| Token         | Value     | Use                                  |
| ------------- | --------- | ------------------------------------ |
| `background`  | `#fafafa` | Page background                      |
| `foreground`  | `#18181b` | Primary text (near-black zinc)       |
| `card`        | `#ffffff` | Card / panel surfaces                |
| `primary`     | `#1c4f59` | Deep teal — CTAs, links, brand accent|
| `primary-foreground` | `#ffffff` | Text on teal                    |
| `secondary` / `muted` | `#f4f4f5` | Subtle fills                    |
| `muted-foreground` | `#71717a` | Secondary text                     |
| `border` / `input` | `#e4e4e7` | Hairlines, inputs                  |
| `ring`        | `#6aa2a4` | Focus ring (teal tint)               |
| `destructive` | `#b43a31` | Errors / rejection states            |

Status tokens (`status-ready`, `status-warning`, `status-danger`) provide warm,
low-saturation backgrounds/foregrounds/borders for inline state messaging.

**Contrast:** deep teal `#1c4f59` on white passes WCAG AA (≥4.5:1) for text.

## Typography

- **Geist sans** (`next/font/google`), exposed as `--font-sans` / `--font-heading`.
  Geist Mono is available as `--font-mono`. No font swaps — Geist is the system.
- Headlines: large, `font-semibold`, tight leading, `text-balance`.

## Shape & elevation

- **Radius:** `--radius: 0.625rem` for cards/panels (`radius-lg`); buttons and
  pills are `rounded-full`.
- **Warm shadow:** `0 24px 70px rgba(35,31,25,.12)` — the signature soft, warm
  card lift. A deeper variant `0 30px 90px rgba(35,31,25,0.18)` is used on the
  hero art surface.

## Layout

- Max content width `max-w-6xl`; hero splits into a `~0.46 / 0.54` two-column
  grid at `md` (copy left, art surface right).
- Generous vertical rhythm; sections separated by `border-t` + tinted `muted`
  bands rather than heavy dividers.

## Motion (exactly two, both behind `prefers-reduced-motion`)

1. **Hero fade-up** — the hero copy/chooser rises and fades in on load.
2. **Tab / entry crossfade** — the three-entry chooser crossfades between states.

Reduced-motion users get the final state instantly (no transform/opacity
transitions).

## Accessibility baseline

- Minimum 44px touch targets on interactive controls.
- Visible 2px focus ring (`ring` token), never focus removal.
- Visible form labels — never placeholder-only.
- Descriptive `alt` text on all photography/artwork.

## AI-slop guards (binding)

- No 3-column icon grids, no centered-everything layouts.
- Real photography/artwork from repo assets only — no gradient placeholders.
