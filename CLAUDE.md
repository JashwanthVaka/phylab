# CLAUDE.md

Project memory for KINETIQ. Read automatically at the start of every session in this
repository. The rules below are standing instructions, not suggestions, and they do not
need to be restated in a prompt.

## Design rules (apply to every page, not only the homepage)

- **No purple gradients.** Avoid the generic AI-generated purple/blue gradient look unless
  it genuinely belongs to the brand.
- **No pill-shaped buttons.** Do not make every button fully rounded. Button shape follows
  the site's design system.
- **No fake reviews or metrics.** Only show reviews, ratings, logos, user counts, revenue,
  downloads or other figures that are real and verifiable. Invented testimonials carry
  legal risk under the FTC consumer-reviews rule:
  https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers
- **No fake counters.** No "10,000 happy customers" or "1 million users". Use real data,
  label estimates clearly, or leave the number out.
- **No vague hero text.** The first section of the homepage must say what the product is,
  who it is for, why it matters, and what the visitor should do next.
- **No emoji icons.** Use one consistent icon set or original illustrations. Emojis only
  where they are a deliberate part of the brand voice.
- **No em dashes in copy.** Prefer shorter sentences, commas, colons or parentheses.
- **No excessive scroll animations.** Motion should aid understanding. Keep it subtle,
  fast, and respectful of `prefers-reduced-motion`.
- **No AI-slop imagery or copy.** No generic AI images, stock-like filler, or repetitive
  marketing language. Use real product screenshots, original visuals, specific claims, and
  edited prose.
- **No cursor animations.** No trailing, glowing, distorting or otherwise decorative
  cursor effects.

## Pre-launch checklist

- **Custom domain.** Ship on a branded address, not a platform subdomain.
- **Favicon.** Present and correct at every required size.
- **Platform "Made with AI" badge.** Remove only if the platform permits it and removal
  does not hide a required AI disclosure. Removing the badge is not a substitute for
  disclosure where disclosure is needed.
- **Privacy Policy page.** What data is collected, why, how it is stored or shared, and how
  to make contact. Required in practice once there are forms, analytics, cookies, payments
  or a newsletter.
- **Terms and Conditions page.** Rules of use, payments, refunds, intellectual property,
  acceptable use, disclaimers, limits of liability.
- **Manual review before publishing.** Check links, forms, mobile layout, spelling,
  accessibility, page speed, SEO basics, legal pages, and every factual claim.

## Working practice

- Inspect the existing code before changing it. Preserve what works, avoid rewrites that
  are not asked for, and never delete user data.
- Keep secrets in environment variables. Never commit `.env`, never put keys in frontend
  code, and keep `.env.example` filled with placeholders only.
- Keep documentation aligned with what is actually implemented. Do not describe planned
  work as a finished feature.
