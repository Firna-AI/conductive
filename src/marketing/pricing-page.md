# The pricing page

The [marketing site README](README.md) gives the pages of the site and how
the Worker serves them. This page gives the pricing page at `/pricing`: the
one source of its plans and words, the steps to change a plan or a price,
and its key code. [Pricing](../../docs/protocol/pricing.md) states its
requirements, and
[the pricing page](../../docs/mockups/marketing-site.md#the-pricing-page)
of the marketing mockups is its visual spec.

The page shows the coming plans with their prices and cloud hours, the
price of an extra hour, the tax line, and how cloud hours count. It sells
nothing, so no plan has an action. Its last call to action has the two
actions of the site.

`pricing.ts` is the one source of the plans, the prices, the hours, and the
words of the page. The pricing mockup, `marketing/pricing`, reads the same
module, so the page and its mockup show the same plans and words. The
module keeps each price in US cents, and it writes the words of each price
once.

The desktop header and the Product column of the footer link the page. On
the page, the header marks Pricing as the current page. The phone header
keeps its links, so a phone reaches the page from the footer.

## Change a plan or a price

Only the user sets a plan, a price, an hour count, or a limit. Each one is
a requirement of [Pricing](../../docs/protocol/pricing.md).

1. Record the decision of the user, and change the protocol doc.
2. Change the plan in `pricing.ts`. The page and the mockup follow it.
3. Read the legal pages and the public guides for each sentence that
   restates the change, as [Legal pages](README.md#legal-pages) and
   [Public docs](README.md#public-docs) say. Read the notes of the
   Plans and pricing rows of [the comparison page](comparison.md) too,
   because a note names the coming plans.
4. Check the page and the mockup at 320 px and at a desktop width, in both
   colour schemes.

Keep each price true:

- Give each price as a fixed number in US dollars. Never give a price as a
  multiple of the provider's price, and name no provider.
- Keep the tax line "Prices exclude VAT and sales tax." Never say that
  checkout adds the tax, because nothing adds it by itself.
- Give no start date for billing. The protocol doc gives none.

## Key code

- `pricing.ts`: the one source of the page and its mockup.
  - `pricingPlans`: the plans in the order of the page. Free and the paid
    plans are separate kinds, so only Free has a limit of workspaces.
  - `planCopy`: the name, the price, the unit, and the facts of each plan.
  - `pricingPageCopy`: the other words of the page, with its title and
    description for the page head.
  - `pricingLinkText`: the words of the links of the header and the footer.
- `pages/pricing.astro`: the page, in the site layout. The header marks
  Pricing as the current page.
- `components/PricingIntro.astro`, `PlanCards.astro`, and
  `HoursRules.astro`: the top of the page with the note that Conductive
  stays free, the plans with the currency and tax line, and how cloud
  hours count.
- `styles/pricing.css`: the styles of the page, with the 1000 px
  breakpoint of the mockup and the 760 px phone breakpoint of the site.
  The page imports it, so other pages do not carry it.
- `styles/chrome.css`: the tighter spacing of the desktop header links
  below 900 px, so that Pricing fits beside the full lockup from 760 px.
- `links.ts`: the path of the page, for the header, the footer, and links
  from another origin.
- [`PricingScreen.tsx`](../../docs/mockups/src/screens/PricingScreen.tsx)
  and [`components/pricing/`](../../docs/mockups/src/components/pricing/):
  the mockup of the page and its parts.
- [Key code](README.md#key-code) in the marketing site README names the
  shared parts that the page also uses, such as `ClosingCall.astro`,
  `SectionIntro.astro`, and `access-copy.ts`.
