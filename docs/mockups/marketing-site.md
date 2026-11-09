# The marketing site

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

The home page follows the calm structure of a Conductor-style home page: a
header, a hero with a short headline, one sentence, and a large picture of
the app, then one section for each feature, the Mac app with its downloads,
the smaller features, a last call to action, and a footer. Both actions,
"Start free with GitHub" and "Sign in", lead to `app/sign-in`. The parts
live in `src/components/marketing/`.

The header links to the public source repository on GitHub in both layouts.
On desktop, it also has Features and Download, which lead to the features
and to the Mac app section of the home page. The Product column of the
footer has Features and Mac app, which lead to the same sections.

The site keeps still captures of the workspace screen, the org settings cloud computer tab, the phone workspace list, and the Mac app.
Changes to those screens require recapture with the [capture steps](../../src/marketing/README.md#pictures).

- Every picture is a real screen of the catalogue, not a drawing of one.
  `ScreenFrame` lays the screen out at its own size, 1440 × 900 for a
  desktop screen and 390 × 800 for a phone screen, then scales it and
  crops it to one part. `src/screens/marketingPictureList.ts` is the one
  list of the pictures. It gives the frame of each picture. For each
  layout, it gives the label, the screen, the part in px of the screen, and
  the scale. The site and the capture command read the same list, and the
  list imports nothing. `src/screens/marketingPictureCaptures.ts` gives the
  capture page and the files of each picture, and it imports only the
  list. `src/screens/marketingPictures.tsx` chooses the screen and its
  state. When a layout of the app changes, look at the pictures again.
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
  customer logos, testimonials, user counts, certifications, native mobile
  app, API, other agents, or changelog.
- The Mac app section shows [the Mac app](mac-app.md) of decision 62: a
  real screen of `mac-app/commands`, with the window buttons, the sidebar,
  and a command that waits for Allow. The Mac app has no phone layout, so
  the phone layout shows the same picture, smaller. Under the words,
  "Download for Mac" links the DMG for Apple silicon first, then the DMG
  for Intel. A line under them names the oldest macOS version that the app
  runs on, macOS 13. The section has no label for an early version, such
  as Beta.
- Each download is the file with a fixed name in the latest release of the
  public repository on GitHub, so its address always gives the newest DMG.
  `src/brand.ts` derives the names from the product name, and
  [`links.ts`](../../src/marketing/links.ts) of the site builds the
  addresses. The words of the section come from `macAppSection` in
  [`features.ts`](../../src/marketing/features.ts).
- The hero sentence and the footer tagline name the Mac app beside the
  browser. The description of the home page, which a search result can
  show, is the hero sentence.
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
