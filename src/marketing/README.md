# Marketing site

The marketing site is the public site at the root of the product domain,
`conductive.build`. It has the home page, the Terms page, the Privacy page,
and a page for an unknown address. Visitors need no sign-in. The pages run
no script and set no cookie. Every sign-in link leads to the app, on the
`app.` host.

The marketing mockups are the visual spec:
[`MarketingScreen.tsx`](../../docs/mockups/src/screens/MarketingScreen.tsx),
[`LegalScreen.tsx`](../../docs/mockups/src/screens/LegalScreen.tsx),
[`NotFoundScreen.tsx`](../../docs/mockups/src/screens/NotFoundScreen.tsx),
and the parts in
[`components/marketing/`](../../docs/mockups/src/components/marketing/).
The [brand folder](../../docs/brand/README.md) gives the logo files. The
site uses the lockups and favicons from that folder unchanged.

## How the Worker serves it

- The Worker sends each request of the root domain to `marketingResponse`
  in `worker/hosts.ts`, which calls `siteResponse` in `routes.ts`.
- `GET` and `HEAD` get a page. Other methods get `405` with
  `Allow: GET, HEAD`.
- The pages are `/`, `/terms`, and `/privacy`. Every other path gets the
  page for an unknown address with `404`. So the app's API and the app's
  own files never answer on the root domain.
- The static assets binding serves only the files that the pages name:
  the pictures, the lockups, the favicons, and the Inter font.
  `/favicon.ico` serves the favicon of the brand.
- Each page carries one inline stylesheet. Its content security policy
  allows that stylesheet by its hash, and files from the site only.
- The phone layout starts below 760 px. CSS media queries and the sources
  of each `<picture>` use that width. The site is dark first, and a visitor
  who prefers light gets the light scheme.

## Pictures

Each product picture is a still image of a real screen of the mockups.
One list defines every picture:
[`marketingPictureList.ts`](../../docs/mockups/src/screens/marketingPictureList.ts),
beside the marketing mockup. The marketing mockup, the site, and the
capture command all read it, so no copy of a picture can go stale. The
list imports nothing, so the browser, the Worker, and Node can all import
it. For each picture, it gives:

- the key, such as `hero`, in the order of the home page
- the label in each layout, which is the alt text on the site and the
  label in the mockups
- the screen of each layout: 1440 × 900 on desktop, or 390 × 800 on a
  phone
- the crop of each layout: the part of the screen that the picture shows,
  in CSS px of the screen
- the scale at which the page shows the crop in each layout
- the frame: a window that becomes a phone in the phone layout, a quiet
  excerpt, or a phone
- the files: one file for each layout, or one file that both layouts share
- the capture page and the file name of each capture

`pictures.ts` binds each picture of the list to its files in
`picture-files.ts`. It keeps no label, size, or scale of its own.
[`marketingPictures.tsx`](../../docs/mockups/src/screens/marketingPictures.tsx)
chooses the screen and the state that each picture shows.

Each picture has a file for each layout and each colour scheme, in
`pictures/`, as `<picture>-<layout>-<scheme>.webp`. The phone picture
shows the same phone screen in both layouts. So it has one file for each
scheme, `phone-<scheme>.webp`, which both layouts share. That gives 13
captures and 26 files, and each file keeps its name on each run.

When a screen of the app or a picture of the list changes, capture the
pictures again with `npm run marketing:pictures` from the repository root.
The command needs Node 24, the packages from `npm install`, and Chrome
available as `google-chrome`. It builds the current mockups and serves
them on a free local port.

Each picture has a capture page in the catalogue, at
`marketing/pictures/<picture>`. Its desktop and mobile views show the
crop of each layout at its own size, at scale 1 and without a frame, from
the top left corner of the page. For each capture and each colour scheme,
the command opens that view with the browser viewport at the size of the
screen that the picture shows, from the list. So a size that follows the
viewport, such as the height of a menu, is the same as in the app. The
command then captures a rectangle of the size of the crop from the top
left corner, and names the file from the list. So the command reads no
markup of the mockups, changes no style, and does not depend on the order
of the pictures on the page.

The command captures at two device pixels for each CSS pixel of the
screen. The site then shows each file at the scale of the list. The
command freezes animations at the same phase on each run. It uses the
direct development dependency `sharp` to write lossless WebP files in
`pictures/`, so each pixel stays as the mockup draws it. The command stops
its server and browser and removes its temporary files on success,
failure, or interruption.

## Legal drafts

The Terms and Privacy pages are drafts for a lawyer, as decision 35 asks.
Each page shows "Draft for lawyer review" at the top. Each fact that the
operator or the lawyer must still give is a marked draft field, such as
the legal name, the address, the contact, the law, the lawful basis, and
how long data stays. The other facts come from the
[architecture doc](../../docs/architecture.md) and the
[protocol docs](../../docs/protocol/).

The words of the legal pages, of the page for an unknown address, and of
the sign-in agreement are text without markup. `terms.ts`, `privacy.ts`,
and `legal-text.ts` hold them. `legal.ts` renders them as HTML for the
site. The mockups and the sign-in screen of the app render the same text
with React. So every surface shows the same words.

Sources for the review:

- The ICO guidance on the privacy information to give:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/>.
  It lists the identity and the contact, the purposes and the lawful
  basis, the recipients, transfers to other countries, retention, the
  rights, and complaints. The Privacy page has a section for each.
- Boat's terms: <https://boat.dev/terms>. They cover the allowed use of
  the app's Boat organization, and they make the operator answer for what
  users do in it. The Terms and Privacy pages name no provider and link to
  no provider terms. The Acceptable use section of the Terms page passes
  on those rules in its own words. A draft field asks the operator to
  confirm that the section protects the providers at least as much as
  their own rules do.

Each new user accepts the Terms at sign-up. The agreement sits beside
Continue with GitHub, as
[Terms consent](../../worker/security/README.md#terms-consent) says. The
Terms page also has a Suspension section and a Report abuse section. The
[operator action](../../worker/operator/README.md) suspends an account.
Draft fields still wait for the notice of a suspension, its review, and
what happens to the data.

The footer of the site and the Report abuse section give `abuseAddress`
from `legal-text.ts`: `abuse@` and the product domain. No code or setup in
this repository creates that mailbox.

## Development

- Run the tests: `npm run test -- src/marketing`. The test of the capture
  command uses fake pages, so it needs no browser.
- Preview the site with `npm run dev`. Set `APP_ORIGIN` to
  `http://127.0.0.1:5173` and `MARKETING_ORIGIN` to
  `http://localhost:5173` in `.dev.vars`. Then open `http://localhost:5173`
  for the site, and `http://127.0.0.1:5173` for the app.

### Key code

- `routes.ts`: `siteResponse`, the response for each request of the root
  domain.
- `site.ts`: the pages of the site and their heads.
- `home.ts`, `features.ts`: the home page and its copy.
- `chrome.ts`, `actions.ts`: the header, the footer with the address for
  abuse reports, and the actions. `wordmark(home)` links the lockup to a
  given home address, for the agreement page on the app host.
- `links.ts`: the paths of the site, and `pageHrefs`, which gives each page
  as a path on the site or as a complete address on another origin.
- `legal.ts`, `terms.ts`, `privacy.ts`: the legal pages and their drafts.
- `legal-text.ts`: the model of text without markup, the page titles, the
  notice of the draft, `abuseAddress`, the words of the page for an
  unknown address, and `termsAgreement`, the agreement of sign-in.
- `sign-in-consent.ts`: `termsConsentPage`, the agreement page that the
  Worker serves on the app host before GitHub.
- [`marketingPictureList.ts`](../../docs/mockups/src/screens/marketingPictureList.ts):
  the one list of the pictures, with `pictureCaptures`, `capturePagePath`,
  and `pictureFileName`.
- `pictures.ts`, `frames.ts`, `picture-files.ts`: the pictures of the
  list with their files, their frames, and the bundled files.
- [`tools/marketing-pictures/run.ts`](../../tools/marketing-pictures/run.ts):
  the capture command, its build, and its cleanup.
- [`capture-pictures.ts`](../../tools/marketing-pictures/capture-pictures.ts),
  [`page.ts`](../../tools/marketing-pictures/page.ts),
  [`cdp.ts`](../../tools/marketing-pictures/cdp.ts), and
  [`encode-pictures.ts`](../../tools/marketing-pictures/encode-pictures.ts):
  the captures of the capture pages, the browser page, the Chrome
  connection, and the lossless encoding.
- `picture-capture.test.ts`: the test that each capture keeps its page,
  its bounds, and its file name.
- `document.ts`, `styles.ts`, `tokens.ts`, `styles/`: the page document,
  the stylesheet, the design tokens from the mockups, and the CSS.
- `assets.ts`: the brand files and the font, and the asset paths that the
  site serves.
- `html.ts`: the `html` template tag, which escapes each value.
