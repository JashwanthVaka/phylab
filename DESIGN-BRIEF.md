# KINETIQ design brief

Written from an inspection of the running site, not from an idea of it. Every
claim here is checkable against `styles.css`, `index.html` and the page modules
in `js/`.

## Design read

A study tool for IB Diploma Physics students, in a calm technical-instrument
language, built on glass surfaces over a warm neutral ground with a rust
primary and a documented pill-for-interactive shape system.

## Purpose

Teach the IBDP Physics course and let a student practise it. Twenty-six lessons
in syllabus order, 131 formulae with their symbols explained, 26 simulations
that compute from the real equations, 218 practice questions with transparent
marking, and a tutor that answers from KINETIQ's own lessons first.

## Audience

IB Diploma Physics candidates at SL and HL, typically 16 to 18, working alone,
often on a phone, often late, often under exam pressure. Secondary audience:
teachers checking whether the content is sound.

This audience sets the tone. A student revising two days before Paper 1 needs
to find a formula in three seconds. Nothing on the page may compete with that.

## Primary call to action

**Start a lesson.** The homepage opens on the first lesson the student has not
finished. Secondary action is practice (`/exam-prep`). Sign-in is deliberately
not a call to action, because everything works without an account.

## Brand personality

Precise, calm, honest, unpatronising. It behaves like laboratory equipment: it
tells you what it measured and does not flatter you. It is not playful, not
corporate, and not a game.

## Design style

Instrument panel, not brochure. Warm neutral ground, glass chrome that floats
over content, one rust primary, amber reserved for the brand mark and progress.
Typographic hierarchy carries the page. Decoration is close to zero, and the
hero visual is a real running physics model rather than an illustration.

## Colour and typography direction

- One primary: rust `#C2410C`, at 4.83:1 on the page ground and 5.18:1 for
  white text on it. No second accent competes with it.
- Amber `#F4B942` is a brand mark and progress colour, never a call to action.
- Teal `#0F766E` is reserved for success, so it is never mistaken for primary.
- Sans for interface and body, serif for lesson and formula display, mono for
  measurements, units and metadata. Mono never carries prose.

## Layout and component principles

- Content first, chrome second. The glass header floats; it does not frame.
- One layout family per job. Card grids for browsing, tables for comparison,
  definition lists for readouts.
- Density is allowed. This is a reference tool, and a student scanning for a
  formula is better served by more on screen than by generous whitespace.
- Numbers on the page are computed from real content counts. Nothing is
  invented, estimated or rounded up.

## Responsive requirements

- Works from 320px to 1440px and beyond, with no horizontal scrolling at any
  width. This is a hard requirement, not a target.
- The full navigation collapses to a burger before it can crowd the actions.
- Every interactive control reaches 44px in at least one axis on touch, and
  44x44px where it is a standalone control.

## Accessibility requirements

- WCAG AA contrast for all text and interactive states, in both themes.
- Full keyboard operation, with a visible focus ring on every control.
- Semantic headings with no skipped levels, and one h1 per page.
- `prefers-reduced-motion` and `prefers-reduced-transparency` both honoured.
- Route changes announced without reading the whole page aloud.

## Visual references

Principles only, taken from public design documentation. No brand asset, logo,
colour or layout is copied.

- **Linear** for typographic hierarchy: a single type voice from display to
  body, negative tracking on display sizes, positive tracking on eyebrows.
- **Stripe** for technical density: dense reference content that stays calm.
- **Mintlify** for documentation readability at long scroll lengths.

## Things to avoid

- Purple or blue AI gradients. The palette is warm and stays warm.
- Em dashes in any user-facing string.
- Emoji used as icons.
- Invented figures. Every count is derived from the content files.
- Scroll animations that delay reading.
- Cursor effects of any kind.
- A hero that says something vague about learning.
