# KINETIQ design system

The rules the interface actually follows. Written by reading `styles.css` and
measuring the running site, so it describes what is implemented, not what was
planned. When code and this file disagree, one of them is a bug: fix the code
if it drifted, update this file if the rule changed on purpose.

Token definitions live at the top of `styles.css`. This file explains when to
reach for each one.

---

## Colour

### Primary

| Token | Value | Use |
|---|---|---|
| `--blue` | `#C2410C` rust 700 | The one primary. Buttons, links, focus rings, active states |
| `--blue-strong` | `#9A3412` | Hover and pressed only |
| `--blue-soft` | `#E4703F` | Primary on dark grounds only, never on light |

The token is still named `--blue` for historical reasons while carrying a rust
value. Renaming it touches several hundred declarations, so it stays until
there is a reason to spend that risk. Read it as "primary".

**One primary, whole site.** A section does not get its own accent colour.

### Supporting

| Token | Value | Use |
|---|---|---|
| `--amber` | `#F4B942` | Brand mark and progress only. **Never a call to action** |
| `--accent-3` | `#0F766E` teal | Success. Kept distinct from primary so the two never read as the same signal |
| `--pale` | `#FDF2EC` | Warm tinted surface behind grouped content |

### Ground and ink

Backgrounds run warm neutral. Ink is `--ink` for body, `--ink-soft` for
secondary, `--muted` for metadata. Hairlines are `--line`, or `--line-strong`
where a border must be seen rather than felt.

### Contrast

Every text and interactive pairing meets WCAG AA. The primary is documented at
4.83:1 on the page ground and 5.18:1 for white text on it. A new colour pairing
is not finished until its ratio is measured.

### Themes

Three layers, in cascade order: a light base, a `[data-theme="dark"]` override,
and a warm palette layer that remaps the primary. Dark is opt-in through the
toggle and is deliberately **not** inferred from the operating system.

Never give a colour its only definition inside a theme block.

---

## Typography

| Family | Token | Carries |
|---|---|---|
| Sans | `--font-sans` | Interface, body, buttons, navigation |
| Serif | `--font-serif` | Lesson titles, formula display, editorial moments |
| Mono | `--font-mono` | Measurements, units, metadata, eyebrows, code |

**Mono never carries prose.** It marks a value that was measured or computed.

### Scale

Display sizes use `clamp()` so they shrink with the viewport rather than
snapping at a breakpoint. Negative letter-spacing on display sizes, slight
positive tracking on mono eyebrows. Body sits at 16px with a 1.5 line height
and a measure of roughly 65 to 70 characters.

### Rules

- One h1 per page. Never skip a heading level to get a size: change the class.
- Emphasis inside a heading uses the serif deliberately, as a documented
  device, not as decoration on every heading.
- **No em dashes in any user-facing string.** Use a period, a comma, a colon,
  parentheses, or a spaced hyphen.

---

## Spacing

Base unit 4px, on a 4/8 scale.

`--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 · `--s7` 48
· `--s8` 64 · `--s9` 96 · `--s10` 128

Page gutter is `--gutter`, a `clamp(20px, 5vw, 56px)`. Content max width is
`--maxw` at 1240px.

**Use a token.** A raw pixel value in new code needs a comment saying why no
token fitted.

---

## Shape

Interactive elements are pill. Containers are not. This is the documented rule,
and mixing the two systems arbitrarily is a bug.

| Token | Value | Applies to |
|---|---|---|
| `--r-pill` | `999px` | Buttons, chips, tags, level badges, nav links, related links, progress bars, the nav shell |
| `--r-xs` | `8px` | Focus ring radius, small inputs |
| `--r-sm` | `12px` | Inline tiles |
| `--r-md` | `16px` | Formula blocks, standard cards |
| `--r-lg` | `20px` | Feature cards, panels |
| `--r-xl` | `24px` | Large surfaces, modal cards |

A pill container or a square button both break the system.

---

## Components

### Buttons

Minimum height 40px, 44px on touch. Padding `0 18px`. Radius `--r-pill`.
Weight 600 at 14.5px. Press feedback is `scale(.97)`, nothing more.

- **`.btn-primary` / `.button`** Rust fill, white text. One primary action per
  view.
- **`.outline`** Glass secondary. Backdrop blur with a solid fallback under
  `prefers-reduced-transparency`.
- **`.text-button`** Inline text action. On touch it still needs to reach 44px,
  which is what `min-height` plus `inline-flex` provides.

Button text fits on one line at desktop. Contrast is checked against the
surface the button actually sits on, glass included.

### Forms

Label above the input, always. Never a placeholder standing in for a label.
Error text below the field, and marked with `aria-invalid` rather than colour
alone. Inputs reach 44px on touch.

### Cards and containers

A card is used when elevation carries real hierarchy. Otherwise group with a
hairline or with space. Shadows are tinted to the ground, never pure black.

### Icons

Inline SVG with a consistent stroke weight, drawn in `currentColor`.
**No emoji as icons.**

### States

Every view implements loading, empty and error, not only the successful state.
Loading uses shapes matching the final layout where the shape is known.

---

## Responsive

| Width | Behaviour |
|---|---|
| 1080px | Primary nav collapses to the burger. Grids go 2-up |
| 760px | Grids go 1-up. Hero stacks. Touch targets grow to 44px |
| 400px | Display type steps down |

Also honoured: `pointer: coarse` for touch sizing, `prefers-reduced-motion`,
`prefers-reduced-transparency`, and a print stylesheet.

**No horizontal scrolling at any width.** The root cannot use `overflow-x:
clip`, because that combination breaks repainting in Chromium when a sticky
element also carries `backdrop-filter`. Overflow is therefore contained on the
children instead. Any fix must respect that constraint.

---

## Motion

`--t-fast` 160ms · `--t-mid` 220ms · `--t-slow` 400ms, all on `--ease`.

Motion explains a state change. It does not announce the page. No scroll-linked
reveals that delay reading, no cursor effects, no infinite loops outside a
genuine loading state. Under `prefers-reduced-motion` the hero model pauses and
offers a manual control instead of animating.

---

## Accessibility

Non-negotiable, and checked by `tests/e2e/`:

- WCAG AA contrast in both themes.
- Every control reachable and operable by keyboard, with a visible 2px focus
  ring at 3px offset.
- Semantic landmarks, ordered headings, one h1 per page.
- Route changes announced without re-reading the whole page.
- Touch targets 44px.
- No horizontal scroll at any width.

---

## Content rules

- Every figure on the page is computed from the content files. No estimate is
  presented as a count, and no number is invented.
- No testimonials, ratings or user counts unless they are real and verifiable.
- Claims are specific. "26 simulations that compute from the real equations"
  beats "powerful interactive learning".
