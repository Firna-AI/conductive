# The marketing site

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

The home page follows the calm structure of a Conductor-style home page: a
header, a hero with a short headline, one sentence, and a large picture of
the app, then one section for each feature, the smaller features, a last
call to action, and a footer. Both actions, "Join the waitlist" and "Sign
in", lead to `app/sign-in`. A new person waits for app access, so the
main action promises a place on the waitlist, not use at once. The title
of the last call to action, "Give your next task its own cloud computer.",
promises no use at once either.
`startLabel` in `src/components/marketing/SiteActions.tsx` holds its words
for the header, the hero, the last call to action, and the footer. The
parts live in `src/components/marketing/`.

The header of a desktop has Features, Docs, GitHub, Sign in, and Join the
waitlist. A phone keeps the wordmark, Docs, GitHub, and Sign in.
Each link of the phone header is a 44 px target. There GitHub shows only
its mark, in a square named "GitHub", so that the links fit on a 360 px
phone. GitHub leads to the public source repository in both layouts. The
Product column of the footer lists Docs after Features. The Docs links of
the header and the footer lead to the docs overview, `marketing/docs`.
[The docs](#the-docs) gives its layout.

The site keeps still captures of the workspace screen, the org settings cloud computer tab, and the phone workspace list.
Changes to those screens require recapture with the [capture steps](../../src/marketing/README.md#pictures).

- Every picture is a real screen of the catalogue, not a drawing of one.
  `ScreenFrame` lays the screen out at its own size, 1440 × 900 on desktop
  and 390 × 800 on a phone, then scales it and crops it to one part.
  `src/screens/marketingPictureList.ts` is the one list of the pictures. It
  gives the frame of each picture. For each layout, it gives the label, the
  screen, the part in px of the screen, and the scale. The site and the
  capture command read the same list, and the list imports nothing.
  `src/screens/marketingPictures.tsx` chooses the screen and its state.
  When a layout of the app changes, look at the pictures again.
- Each picture has a capture page at `marketing/pictures/<picture>`.
  `PictureCapture` in `src/screens/marketingPictures.tsx` draws the part of
  the screen of one layout at its own size, at scale 1 and without a frame,
  from the top left corner of the page. The
  [capture command](../../src/marketing/README.md#pictures) opens each page
  at the size of the screen, and saves that part as the file of the
  picture.
- A picture is `inert`, so a visitor cannot focus or press anything in it.
  It also sets `StillLinks`: a `ScreenLink` in it is plain content, and an
  outside link has no address. So a picture never links into the catalogue.
- The hero picture follows the width of the page in steps of
  `--frame-scale`, because a view runs no script. The other pictures keep
  one scale.
- Each claim on the page is one that the plan decides. The page shows no
  customer logos, testimonials, user counts, certifications, desktop or
  native mobile app, API, other agents, or changelog.
- The page shows no plans, because the product is free for now. It asks
  for no other account, because the app runs every cloud computer in its
  own account.
- The product is "Conductive", on `conductive.build`.
  `src/brand.ts` holds the name and the domains, so that one change renames
  the product.
- The footer and the sign-in page link to `marketing/terms` and
  `marketing/privacy` through `LegalLinks`. The agreement of the sign-in
  page links to the same pages in its text.
- The Terms, Privacy, and not-found pages draw the documents that the site
  serves: `termsDocument`, `privacyDocument`, and `notFoundText` from the
  code of the [marketing site](../../src/marketing/README.md#legal-pages).
  Their words are text without markup, in the model of
  [`legal-text.ts`](../../src/marketing/legal-text.ts). Astro builds
  that text as HTML. The Worker serves the built pages and fills their
  request values. The mockups render the text with `LegalDocumentView` and
  `CatalogueText`, through `RunningText`, which the app also uses. So the
  site, the app, and the mockups show the same words. Both legal pages use
  the shared operator details and legal contact address.
- The footer has a Report abuse column with `abuseAddress` from
  [`legal-text.ts`](../../src/marketing/legal-text.ts), which is `abuse@`
  and the product domain. The Terms page gives the same address.
- `SitePage` gives a page of the site its header and its footer, and
  `TextPage` gives a text page its label, title, and lead. A `bare` page
  has only the wordmark in its header, and no footer.
- `marketing/not-found` keeps the header and the footer of the site, with a
  link to the home page.
- `app/sign-in/terms` draws the page that the Worker shows before GitHub
  when a sign-in starts without the agreement, such as the browser sign-in
  of the Mac app. It has the words of the sign-in page from
  `src/screens/signInCopy.ts`, and the agreement with its links. It runs
  no script, so it has the look of the site, with only the wordmark in its
  header and no footer.
  Astro builds the agreement page with the same layouts and styles as the
  site. The Worker fills its Continue address and its links to the site.

## The docs

The docs pages draw the layout of the public guides of the site, at
`/docs` and `/docs/<page>`. The site does not serve these pages yet. The
mockups draw two pages: the overview and the Get started guide. Their
words are an example, not the final guides. [The catalogue](catalogue.md)
gives their paths and their views.
[Website docs](../protocol/website-docs.md) states the requirements of the
guides.

- `DocsScreen` in `src/screens/DocsScreen.tsx` draws a page of the docs in
  `SitePage`, with the header and the footer of the site. It sets the
  `current` prop of `SitePage`, so the header fills its Docs link and
  marks it as the current section.
- The parts live in `src/components/marketing/docs/`. `docsGuides.ts` is
  the one list of the twelve guides, in the groups Start, Work, and Manage.
  The sidebar, the phone menu, and the previous and next links use its
  order.
- A guide has a `to` only when the mockups draw its page. Each other guide
  keeps its place and its look, without a link.
- `docsOverview.tsx` and `docsGetStarted.tsx` in `src/screens/` hold the
  bodies of the two pages as TSX. Each `DocsPage`, from `docsPage.ts`, also
  gives the lead and the level-two headings that the contents link.
- A desktop shows three columns at the width of the site: the guides, the
  page, and "On this page". The guides and the contents stay in view while
  the page scrolls. Below 1120 px, the contents move into a box under the
  lead.
- The top of a page shows the group, the title, and the lead.
- A phone shows a "Docs menu" bar under the header. It opens the guides in
  place and pushes the page down. "On this page" is a box under the lead,
  closed at first. Both are native disclosures, so they open without a
  script.
- The contents link each level-two heading. A heading has no link of its
  own, so a reader copies the address of a section from the contents.
- The current guide has the fill of a selected row. Cards at the foot link
  the previous and the next guide. The next card stays on the right
  without a previous card, and a phone stacks the cards.
- `DocsProse.module.css` styles the plain elements of a body, because
  Markdown gives them no classes. A table first wraps its words, then
  scrolls by itself. Code in a table cell keeps one line. A long code block
  scrolls inside itself, so the page never scrolls sideways.
- The long install script of Get started takes keyboard focus, as a region
  named "Example install script". A keyboard can then scroll it.
- The same CSS gives each colour of code a class with the name of a Prism
  token class, such as `comment` or `operator`. The code of the pages uses
  fixed spans with these classes.
- A list item that holds only a link is a guide action, such as a page to
  open next. On a phone, its link is a 44 px target that covers no other
  text. The two guide actions of Get started use this pattern.
- Each link and each disclosure bar shows a 2 px focus ring, as the links
  of the site do. The menu rows and the phone bars draw the ring inside
  the item.
