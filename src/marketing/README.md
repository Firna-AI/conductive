# Marketing site

The marketing site is the public site at the root of the product domain,
`conductive.build`. It has the home page, the Terms page, the Privacy page,
the Conductor Cloud comparison page, and a page for an unknown address.
Visitors need no sign-in. The pages run
no script and set no cookie. Every sign-in link leads to the app, on the
`app.` host. The main action, Sign up, and Sign in lead to the same
sign-in. A new person waits there for app access, as the
[waitlist protocol](../../docs/protocol/waitlist.md) says. No button names
the waitlist. The sentence under the last call to action says that a new
account waits for access, so the page promises no use at once. The second
action of the hero and of the last call to action, Download for Mac, leads
to the Mac app section of the home page, because a page runs no script to
pick the chip of the visitor. The site and the mockups read the words of
both actions from `siteActionCopy` in `access-copy.ts`.

The shared header links to the public source repository on GitHub.
The link appears on phones and desktops. On desktops, the header also has
Features and Download, which lead to the features and to the Mac app
section of the home page. The Product column of the footer links the same
two sections, so a phone reaches the downloads from the footer. The header
links never wrap.

The Mac app section follows the features. It links the DMG for Apple
silicon first, then the DMG for Intel, and names the oldest macOS version
that the app runs on. Each download is the file with a fixed name in the
latest release of the source repository on GitHub, as
[Releases](../../docs/protocol/desktop-app.md#releases) states, so its
address always gives the newest DMG. Like the GitHub link of the header,
the downloads are plain links that leave the site.

The hero sentence names the browser and the Mac app. It is also the
description of the home page. The footer tagline names both too. The site
and the mockups read both lines from `productSummary` in `features.ts`.

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
- the screen of each layout: a desktop screen of 1440 × 900, or a phone
  screen of 390 × 800
- the crop of each layout: the part of the screen that the picture shows,
  in CSS px of the screen
- the scale at which the page shows the crop in each layout
- the frame: a window that becomes a phone in the phone layout, a quiet
  excerpt, or a phone
- the files: one file for each layout, or one file that both layouts share

[`marketingPictureCaptures.ts`](../../docs/mockups/src/screens/marketingPictureCaptures.ts)
beside the list gives the capture page of each picture, its captures, and
the file name of each capture. It imports only the list, so Node can
import it too.

`components/PictureFrame.astro` reads each picture from the list by its
key and layout. `picture-urls.ts` reads the files with one glob keyed by
the list. So the site keeps no label, size, or scale of its own.
[`marketingPictures.tsx`](../../docs/mockups/src/screens/marketingPictures.tsx)
chooses the screen and the state that each picture shows.

Each picture has a file for each layout and each colour scheme, in
`pictures/`, as `<picture>-<layout>-<scheme>.webp`. The phone picture and
the Mac picture each show the same screen in both layouts. So each has one
file for each scheme, such as `phone-<scheme>.webp`, which both layouts
share. That gives 14 captures and 28 files, and each file keeps its name
on each run.

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
command freezes each animation of the clock at the same phase on each run.
An animation that scrolling drives keeps the state of its scroll position.
The command uses the direct development dependency `sharp` to write
lossless WebP files in `pictures/`, so each pixel stays as the mockup draws
it. The command stops its server and browser and removes its temporary
files on success, failure, or interruption.

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
and `legal-text.ts` hold them. `terms.ts` takes its "Working in an org"
section from `terms-org.ts`, and `privacy.ts` takes its "What Conductive
uses, and why" section from `privacy-uses.ts`. `layouts/LegalPage.astro` and
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
states its requirements. The link above the home headline and the "From
Conductor Cloud" link in the Product column of the footer lead to it. Its
last call to action has the sentence and the two actions of the home page.

The modules in `from-conductor/` are the one source of the rows, the
statuses, the dates, and the words of the page. The chosen mockup,
`marketing/from-conductor/one-table`, reads the same modules, so the page
and its mockup show the same rows. One table serves both layouts with CSS
only: a computer shows the merged Area cell of each area, and a phone shows
the Area cell of each row. `### Key code` names each module and part.
[AGENTS.md](../../AGENTS.md) says when a change must update a row.

To change a row, edit it in the file of its area under
`from-conductor/areas/`, and keep its `id`. A new area also needs its entry
in `areas.ts` and its place in `features.ts`.

Keep each row true:

- Check each status with the claim rules of the protocol doc. A mockup or
  a plan alone never proves Available.
- Write each note in one or two plain sentences, with at most 25 words.
  Say what Conductive does, or what to do instead. Name a limit only with
  the way around it.
- Name no sandbox provider, internal name, or decision number in a note.
  Copy no Conductor text.
- Give a due date only for a dated commitment that the team recorded.
  Never add an example date.
- Keep the evidence of each status and the scope audit out of the rows and
  out of the page.
- After a full check of every row, set the check date that the page shows.

## Development

The pages are in `pages/`, with layouts in `layouts/` and parts in
`components/`. Astro builds them before the Worker serves them.

- Run the site tests with `npm run test -- worker/marketing src/marketing`.
  The built-site test builds Astro once in a temporary folder. The capture
  tests use fake pages and a fake browser, so they need no Chrome.
- Work on the pages with `npm run site:dev`. It serves them at
  `http://localhost:4321` and reloads them after edits. Sign-in links lead
  to the app of `npm run dev`. The footer shows the current year.
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
  page paths, site files, the favicon, and the unknown-address page.
- [`worker/marketing/files.ts`](../../worker/marketing/files.ts): the
  file-list parser and cache for each assets binding.
- [`worker/marketing/page.ts`](../../worker/marketing/page.ts): built-page
  reads, headers, content security policy, and the safe `503` warning.
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
- `features.ts`: the words that the site and the mockups share: the hero
  sentence and the footer tagline, the features, the Mac app section with
  its downloads, and the smaller features.
- `from-conductor/`: the one source of the comparison page and its mockup.
  - `areas.ts` and `areas/`: the 15 areas in their order, and one file of
    rows for each area.
  - `features.ts`: the rows in area order, `featuresOf`, and the check
    date.
  - `model.ts`: the row types. Only an In progress or Planned row can have
    a due date.
  - `statuses.ts`: the word, the meaning, the icon, and the tone of each
    status, in the order of the legend.
  - `dates.ts`: the days of Conductor Cloud, the announcement link, the due
    rule, and the words of a day.
  - `copy.ts`: the words of the page and of its two entry links, as text
    without markup.
- `access-copy.ts`: the words of the two actions of the site, and the
  sentence under the last call to action.
- `links.ts`: the source repository address, the Mac app download
  addresses, site paths, and `pageHrefs` for links from another origin.
- `terms.ts`, `privacy.ts`, `legal-text.ts`: legal pages and the shared
  text model, titles, contact addresses, and sign-in agreement.
- `terms-org.ts`, `privacy-uses.ts`: the "Working in an org" section of
  the Terms and the "What Conductive uses, and why" section of the
  Privacy page.
- `request-values.ts`: built-page markers, local Astro preview values,
  the sign-in address, and the links to the sections of the home page.
- [`astro.config.ts`](../../astro.config.ts): build settings, generated
  CSS for the font, tokens and picture sizes, and the file list writer.
- [`site-build.ts`](../shared/site-build.ts): shared folder, list, page,
  icon, marker, and file-list names and types.
- `tokens.ts`, `styles/`: design tokens from the mockups and bundled CSS.
- `styles/comparison.css`, `styles/comparison-table.css`: the comparison
  page and its table, in the cascade that `layouts/Document.astro` keeps.
- `icon-shapes.ts`: lucide icons as shapes for the Astro pages.
- `picture-urls.ts`, `picture-styles.ts`: picture file addresses, media
  queries, frame classes, and picture-size CSS.
- [`marketingPictureList.ts`](../../docs/mockups/src/screens/marketingPictureList.ts):
  the shared picture list.
- [`marketingPictureCaptures.ts`](../../docs/mockups/src/screens/marketingPictureCaptures.ts):
  capture pages, bounds, and file names.
- [`tools/marketing-pictures/run.ts`](../../tools/marketing-pictures/run.ts):
  the capture command, build, and cleanup.
- [`capture-pictures.ts`](../../tools/marketing-pictures/capture-pictures.ts),
  [`page.ts`](../../tools/marketing-pictures/page.ts),
  [`cdp.ts`](../../tools/marketing-pictures/cdp.ts), and
  [`encode-pictures.ts`](../../tools/marketing-pictures/encode-pictures.ts):
  capture pages, browser control, Chrome connection, and lossless encoding.
- `picture-capture.test.ts`: capture pages, bounds, and file names.
- `picture-page.test.ts`: the animation reset before each capture.
- [`worker/marketing/built-site.test.ts`](../../worker/marketing/built-site.test.ts):
  real builds served through the Worker, including their policy, their
  files, and the comparison page with its two entry links.
