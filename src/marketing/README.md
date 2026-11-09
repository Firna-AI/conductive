# Marketing site

The marketing site is the public site at the root of the product domain,
`conductive.build`. It has the home page, the Terms page, the Privacy page,
and a page for an unknown address. Visitors need no sign-in. The pages run
no script and set no cookie. Every sign-in link leads to the app, on the
`app.` host.

The shared header links to the public source repository on GitHub.
The link appears on phones and desktops.

The marketing mockups are the visual spec:
[`MarketingScreen.tsx`](../../docs/mockups/src/screens/MarketingScreen.tsx),
[`LegalScreen.tsx`](../../docs/mockups/src/screens/LegalScreen.tsx),
[`NotFoundScreen.tsx`](../../docs/mockups/src/screens/NotFoundScreen.tsx),
and the parts in
[`components/marketing/`](../../docs/mockups/src/components/marketing/).
The [brand folder](../../docs/brand/README.md) gives the logo files. The
site uses the lockups and favicons from that folder unchanged.

## How the Worker serves it

Astro builds the pages into `public/_site/`. Vite copies that folder into
`dist/client/_site/`. The Worker serves those files through its static
assets binding.

- `marketingResponse` in [`worker/hosts.ts`](../../worker/hosts.ts) calls
  `siteResponse` in [`worker/marketing/site.ts`](../../worker/marketing/site.ts).
  `GET` and `HEAD` get a page. Other methods get `405` with
  `Allow: GET, HEAD`. A `HEAD` response has no body.
- The build writes `site-files.json` with each file path and the SHA-256
  hash of each inline style element. The Worker reads it once for each
  assets binding. A failed read is not cached.
- A listed page uses its public path, such as `/terms` for `terms.html`.
  The home page uses `/`. The Worker requests each page without `.html`
  to avoid the binding's redirects. Every other address gets `404.html`
  with status `404`. Neither `404.html` nor the agreement folder has a
  public page path.
- Listed files other than HTML and the list load under `/_site/`.
  `/favicon.ico` also serves the fixed brand favicon under that folder.
  App API paths and app files get the unknown-address page on the root domain.
- The Worker replaces the exact app-origin and year markers with escaped
  HTML text. Sign-in links use `APP_ORIGIN`. The footer uses the UTC year
  of the request.
- Pages keep `Cache-Control: no-cache`, `Content-Type: text/html; charset=utf-8`,
  `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.
  Their content security policy allows each inline style by its build hash.
  It keeps `default-src 'none'`, images and fonts from `'self'`, and
  `base-uri`, `form-action`, and `frame-ancestors` set to `'none'`.
- The app host serves the built agreement page only through sign-in.
  The Worker fills its Continue address and site-origin markers.
  It keeps the same page headers, with `Cache-Control: no-store`.
  The app host also serves listed site files under `/_site/`. Other paths
  there get the app page, as an unknown app path does.
- A missing or broken file list, a failed binding response, an HTML asset
  fallback, or a page without its markers gives `503`. The Worker logs a
  fixed warning without request data. It never forwards a site redirect
  or the app page as a site file.
- The phone layout starts below 760 px. CSS media queries and the sources
  of each `<picture>` use that width. The site is dark first. A visitor
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

`components/PictureFrame.astro` reads each picture from the list by its
key and layout. `picture-urls.ts` reads the files with one glob keyed by
the list. So the site keeps no label, size, or scale of its own.
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

The Terms and Privacy pages are drafts for a lawyer.
Each page shows "Draft for lawyer review" at the top. Each fact that the
operator or the lawyer must still give is a marked draft field, such as
the legal name, the address, the contact, the law, the lawful basis, and
how long data stays. The other facts come from the
[architecture doc](../../docs/architecture.md) and the
[protocol docs](../../docs/protocol/).

When you change a fact in the architecture doc or in a protocol doc, read
both legal pages in full. The legal pages are the Terms page in
`src/marketing/terms.ts` and the Privacy page in `src/marketing/privacy.ts`.
In the same change, update each sentence of the legal pages that restates
the fact. A search for the old words is not enough, because a legal page
can restate a fact in other words.

The words of the legal pages, of the page for an unknown address, and of
the sign-in agreement are text without markup. `terms.ts`, `privacy.ts`,
and `legal-text.ts` hold them. `layouts/LegalPage.astro` and
`components/RunningText.astro` build their HTML for the site. The mockups and the sign-in screen of the app render the same text
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

Each sign-in accepts the current revision of the Terms. The agreement sits
beside Continue with GitHub, as
[Terms consent](../../worker/security/README.md#terms-consent) says. The
Terms page also has a Suspension section and a Report abuse section. The
[operator action](../../worker/operator/README.md) suspends an account.
Draft fields still wait for the notice of a suspension, its review, and
what happens to the data.

The footer of the site and the Report abuse section give `abuseAddress`
from `legal-text.ts`: `abuse@` and the product domain. No code or setup in
this repository creates that mailbox.

## Development

The pages are in `pages/`, with layouts in `layouts/` and parts in
`components/`. Astro builds them before the Worker serves them.

- Run the site tests with `npm run test -- worker/marketing src/marketing`.
  The built-site test builds Astro once in a temporary folder. The capture
  test uses fake pages and needs no browser.
- Work on the pages with `npm run site:dev`. It serves them at
  `http://localhost:4321` and reloads them after edits. Sign-in links lead
  to the app of `npm run dev`. The footer shows the current year.
  The agreement preview is at `/app-host/terms-consent`.
- Run `npm run site:build` to write the pages, files, and file list into
  `public/_site/`, which Git ignores. `npm run dev` and `npm run build`
  build the site first. Restart the Worker after rebuilding the site so
  it reads the new file list.
- Preview through the Worker with `npm run dev`. Set `APP_ORIGIN` to
  `http://127.0.0.1:5173` and `MARKETING_ORIGIN` to
  `http://localhost:5173` in `.dev.vars`. Open `http://localhost:5173` for
  the site and `http://127.0.0.1:5173` for the app.
- To preview the production build, use port 5174 in those settings.
  Run `npm run build`, then `npm run preview`. Open
  `http://localhost:5174`. The agreement page opens on the app host at
  `/api/auth/github` without the current `terms_version` value.

### Key code

- [`worker/marketing/site.ts`](../../worker/marketing/site.ts): public
  page paths, site files, the favicon, and the unknown-address page.
- [`worker/marketing/files.ts`](../../worker/marketing/files.ts): the
  file-list parser and cache for each assets binding.
- [`worker/marketing/page.ts`](../../worker/marketing/page.ts): built-page
  reads, headers, content security policy, and the safe `503` warning.
- [`worker/marketing/markers.ts`](../../worker/marketing/markers.ts): exact
  marker replacement with HTML escaping.
- [`worker/marketing/consent.ts`](../../worker/marketing/consent.ts): the
  agreement response for sign-in on the app host.
- [`worker/marketing/assets.ts`](../../worker/marketing/assets.ts): site
  asset reads and the app host's handling of other site paths.
- `pages/`, `layouts/`, `components/`: the pages, documents, and parts.
- `features.ts`: the home page's feature copy.
- `links.ts`: the source repository address, site paths, and `pageHrefs`
  for links from another origin.
- `terms.ts`, `privacy.ts`, `legal-text.ts`: legal drafts and the shared
  text model, titles, draft notice, abuse address, and sign-in agreement.
- `request-values.ts`: built-page markers and local Astro preview values.
- [`astro.config.ts`](../../astro.config.ts): build settings, generated
  CSS for the font, tokens and picture sizes, and the file list writer.
- [`site-build.ts`](../shared/site-build.ts): shared folder, list, page,
  icon, marker, and file-list names and types.
- `tokens.ts`, `styles/`: design tokens from the mockups and bundled CSS.
- `icon-shapes.ts`: lucide icons as shapes for the Astro pages.
- `picture-urls.ts`, `picture-styles.ts`: picture file addresses, media
  queries, frame classes, and picture-size CSS.
- [`marketingPictureList.ts`](../../docs/mockups/src/screens/marketingPictureList.ts):
  the shared picture list, capture pages, bounds, and file names.
- [`tools/marketing-pictures/run.ts`](../../tools/marketing-pictures/run.ts):
  the capture command, build, and cleanup.
- [`capture-pictures.ts`](../../tools/marketing-pictures/capture-pictures.ts),
  [`page.ts`](../../tools/marketing-pictures/page.ts),
  [`cdp.ts`](../../tools/marketing-pictures/cdp.ts), and
  [`encode-pictures.ts`](../../tools/marketing-pictures/encode-pictures.ts):
  capture pages, browser control, Chrome connection, and lossless encoding.
- `picture-capture.test.ts`: capture pages, bounds, and file names.
- [`worker/marketing/built-site.test.ts`](../../worker/marketing/built-site.test.ts):
  real builds served through the Worker, including their policy and files.
