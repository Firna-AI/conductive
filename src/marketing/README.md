# Marketing site

The marketing site is the public site at the root of the product domain,
`conductive.build`. It has the home page, the Terms page, the Privacy page,
the Conductor Cloud comparison page, and a page for an unknown address.
Visitors need no sign-in. The pages run no script and set no cookie.
Every sign-in link leads to the app, on the `app.` host.

The main action and Sign in lead to the same sign-in. The words of the
main action promise only what that sign-in gives, as
[The main action of the site](../../docs/protocol/sign-ups.md#the-main-action-of-the-site)
says. The Worker fills the start-label marker of a page with "Join the
waitlist" while a new person waits for app access, as the
[waitlist protocol](../../docs/protocol/waitlist.md) says. During open
sign-up, it fills the marker with "Start free with GitHub". Each main
action writes `requestValues.startLabel`: `components/StartButton.astro`,
which the header and the page actions use, and the main action of
`components/SiteFooter.astro`. In a build, that value is the marker.

The shared header links to the public source repository on GitHub.
The link appears on phones and desktops.

The marketing mockups are the visual spec:
[`MarketingScreen.tsx`](../../docs/mockups/src/screens/MarketingScreen.tsx),
[`LegalScreen.tsx`](../../docs/mockups/src/screens/LegalScreen.tsx),
[`NotFoundScreen.tsx`](../../docs/mockups/src/screens/NotFoundScreen.tsx),
[`FromConductorScreen.tsx`](../../docs/mockups/src/screens/FromConductorScreen.tsx),
and the parts in
[`components/marketing/`](../../docs/mockups/src/components/marketing/) and
[`components/parity/`](../../docs/mockups/src/components/parity/).
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
- A page that holds the start-label marker also gets the label of the
  main action, as escaped text in each place of the marker. Each page of
  the site holds it, in the main actions of its header and its footer.
  `SITE_START_LABELS` in [`site-build.ts`](../shared/site-build.ts) holds
  both labels. The Worker does not require the marker. A page without it
  keeps its built words and reads no sign-up settings.
- The label comes from the switch and the pause in D1. Each Worker app
  keeps the label of each D1 binding for 60 seconds from the start of its
  read, on the clock of the Worker dependencies, with no timer. So the
  site can show a change up to 60 seconds late. Only the label uses this
  copy. The sign-in and the request gate always read D1.
- When the read fails, the page gets "Join the waitlist" and keeps its
  status and headers. The Worker logs a fixed warning. It keeps no copy of
  a failed read, so the next page reads again. Site files other than
  pages never read D1.
- Pages keep `Cache-Control: no-cache`, `Content-Type: text/html; charset=utf-8`,
  `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.
  Their content security policy allows each inline style by its build hash.
  It keeps `default-src 'none'`, images and fonts from `'self'`, and
  `base-uri`, `form-action`, and `frame-ancestors` set to `'none'`.
- The app host serves the built agreement page only through sign-in.
  It also serves the built GitHub install return page at `/github/setup`
  for an install that started in the Mac app. That page tells the user
  to go back to the Mac app.
  The Worker fills the agreement's Continue address and the site-origin markers.
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

The product pictures of the home page are still images of real screens
of the mockups. When a screen that a picture shows changes, capture the
pictures again with `npm run marketing:pictures`.
[Marketing pictures](pictures/README.md) gives the picture list, the
files, and the capture steps.

## Legal pages

The Terms and Privacy pages show their title, introduction, and sections.
The operator is Firna Ltd, registered in England and Wales.
`legalOperator` in `legal-text.ts` holds its company number, registered
office, and VAT number. Both pages use those details. Each page keeps its
own effective date. The Terms use the law of England and Wales and preserve
mandatory consumer protections.
The facts about the service come from the
[architecture doc](../../docs/architecture.md) and the
[protocol docs](../../docs/protocol/). The Privacy page names what the
waitlist, the invite codes, and each record of app access keep, the
GitHub token and the verified emails that each sign-in keeps, and Resend,
which sends the emails, from
[The record of app access](../../docs/protocol/waitlist.md#the-record-of-app-access).

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
- The [ICO guide to lawful bases](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/)
  explains contract, legitimate interests, and legal obligations.
- [Data protection complaints](https://www.gov.uk/data-protection/make-a-complaint)
  gives the contact details of the Information Commissioner's Office.
- [Article 13 of the UK GDPR](https://www.legislation.gov.uk/eur/2016/679/article/13)
  states the information that a notice must give about international transfers.
- The [UK-US data bridge guidance](https://www.gov.uk/government/publications/uk-us-data-bridge-supporting-documents/uk-us-data-bridge-factsheet-for-uk-organisations)
  and [its regulations](https://www.legislation.gov.uk/uksi/2023/1028/contents)
  cover transfers to US organisations certified under the UK Extension.
- [Cloudflare's data processing terms](https://www.cloudflare.com/cloudflare-customer-dpa/)
  and [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
  describe their published transfer protections.
- [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy),
  [its data processing terms](https://www.anthropic.com/legal/data-processing-addendum),
  and [OpenAI's data processing terms](https://openai.com/policies/data-processing-addendum/)
  describe protections under the account that an agent session uses.
- Boat's terms: <https://boat.dev/terms>. They cover the allowed use of
  the app's Boat organization, and they make the operator answer for what
  users do in it. The Terms and Privacy pages do not name the cloud computer
  provider or link to its terms. The Acceptable use section passes on
  those rules in its own words.
- [Boat's privacy policy](https://boat.dev/privacy) reports its EU hosting
  locations and says that an Article 28 agreement is available on request.
  Its public policy does not prove that Firna has that agreement.

Each sign-in accepts the current revision of the Terms. The agreement sits
beside Continue with GitHub, as
[Terms consent](../../worker/security/README.md#terms-consent) says. The
Terms page also has a Suspension section and a Report abuse section. The
[operator action](../../worker/operator/README.md) suspends an account.
The Suspension section explains how to request a review and warns that
a stopped cloud computer can lose its disk.

The footer and the Report abuse section use `abuseAddress` from
`legal-text.ts`: `abuse@` and the product domain. Legal and privacy contact
links use `legalAddress`: `legal@` and the product domain.
No code or setup in this repository creates those mailboxes.

## The comparison page

The page at `/from-conductor` shows people who move from Conductor Cloud
the status of each Conductor Cloud feature in Conductive.
[Conductor Cloud comparison](../../docs/protocol/conductor-cloud-comparison.md)
states its requirements. [Comparison rows](from-conductor/README.md)
gives the one source of its rows, how to change a row, and the rules
that keep each row true.

## Development

The pages are in `pages/`, with layouts in `layouts/` and parts in
`components/`. Astro builds them before the Worker serves them.

- Run the site tests with `npm run test -- worker/marketing src/marketing`.
  The built-site test builds Astro once in a temporary folder. It checks
  both labels in the four main actions of the home page. The capture
  test uses fake pages and needs no browser. The label test uses fake
  pages with the start-label marker. It moves the Worker clock past the
  60 seconds, and it makes the settings read fail.
- Work on the pages with `npm run site:dev`. It serves them at
  `http://localhost:4321` and reloads them after edits. Sign-in links lead
  to the app of `npm run dev`. The footer shows the current year.
  `requestValues.startLabel` gives "Join the waitlist" there, because the
  Astro server reads no sign-up settings.
  The agreement preview is at `/app-host/terms-consent`.
  The GitHub return previews are at `/app-host/github-setup/installed`
  and `/app-host/github-setup/requested`.
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
  page paths, site files, the favicon, the unknown-address page, and the
  values of each page.
- [`worker/marketing/start-label.ts`](../../worker/marketing/start-label.ts):
  the label of the main action from the sign-up settings, with its
  60-second copy and its safe fallback.
- [`worker/marketing/files.ts`](../../worker/marketing/files.ts): the
  file-list parser and cache for each assets binding.
- [`worker/marketing/page.ts`](../../worker/marketing/page.ts): built-page
  reads, headers, content security policy, the safe `503` warning, and
  values that depend on the text of the page.
- [`worker/marketing/markers.ts`](../../worker/marketing/markers.ts): exact
  marker replacement with HTML escaping.
- [`worker/marketing/consent.ts`](../../worker/marketing/consent.ts): the
  agreement response for sign-in on the app host.
- [`worker/marketing/github-setup.ts`](../../worker/marketing/github-setup.ts):
  the built GitHub install return page for the Mac app.
- [`worker/marketing/assets.ts`](../../worker/marketing/assets.ts): site
  asset reads and the app host's handling of other site paths.
- `pages/`, `layouts/`, `components/`: the pages, documents, and parts.
- `pages/from-conductor.astro`: the comparison page. `ParityIntro.astro`,
  `ParityLegend.astro`, and `ParityTable.astro` in `components/` draw its
  top, its legend, and its one table.
- `components/StatusMark.astro`, `DueDay.astro`, `CopyText.astro`, and
  `ClosingCall.astro`: a status as its icon and word, a due day or "No date
  yet", a sentence of shared copy as markup, and the last call to action of
  a page.
- `features.ts`: the home page's feature copy.
- `from-conductor/`: the one source of the comparison page and its mockup.
  [Its README](from-conductor/README.md) names each module.
- `access-copy.ts`: the sentence under the last call to action of each
  page, which fits both states of sign-up.
- `links.ts`: the source repository address, site paths, and `pageHrefs`
  for links from another origin.
- `terms.ts`, `privacy.ts`, `legal-text.ts`: legal pages and the shared
  text model, titles, contact addresses, and sign-in agreement.
- `request-values.ts`: built-page markers and local Astro preview values,
  with the start label.
- [`astro.config.ts`](../../astro.config.ts): build settings, generated
  CSS for the font, tokens and picture sizes, and the file list writer.
- [`site-build.ts`](../shared/site-build.ts): shared folder, list, page,
  icon, marker, and file-list names and types, and the two start labels.
- `tokens.ts`, `styles/`: design tokens from the mockups and bundled CSS.
- `styles/comparison.css`, `styles/comparison-table.css`: the comparison
  page and its table, in the cascade that `layouts/Document.astro` keeps.
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
  real builds served through the Worker, including their policy, their
  files, and the comparison page with its two entry links.
- [`worker/marketing/start-label.test.ts`](../../worker/marketing/start-label.test.ts):
  both labels, the 60-second copy, the pause, a failed read, and site files
  without D1.
