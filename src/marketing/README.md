# Marketing site

The marketing site is the public site at the root of the product domain,
`conductive.build`. It has the home page, the public docs, the Terms page,
and the Privacy page. It also has the Conductor comparison page and a
page for an unknown address. Visitors need no sign-in. The pages run no
script and set no cookie. Every sign-in link leads to the app, on the
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
links never wrap. The header and the footer also link to the public docs.
A phone header keeps the lockup, Docs, the GitHub mark alone, and Sign in.

The Mac app section follows the features. It links the DMG for Apple
silicon first, then the DMG for Intel, and names the oldest macOS version
that the app runs on. Each download is the file with a fixed name in the
latest release of the source repository on GitHub, as
[Releases](../../docs/protocol/desktop-packages-and-updates.md#releases)
states, so its address always gives the newest DMG. Like the GitHub link of
the header, the downloads are plain links that leave the site.

The hero sentence names the browser and the Mac app. It is also the
description of the home page. The footer tagline names both too. The site
and the mockups read both lines from `productSummary` in `features.ts`.

The marketing mockups are the visual spec:
[`MarketingScreen.tsx`](../../docs/mockups/src/screens/MarketingScreen.tsx),
[`LegalScreen.tsx`](../../docs/mockups/src/screens/LegalScreen.tsx),
[`NotFoundScreen.tsx`](../../docs/mockups/src/screens/NotFoundScreen.tsx),
[`DocsScreen.tsx`](../../docs/mockups/src/screens/DocsScreen.tsx),
[`FromConductorScreen.tsx`](../../docs/mockups/src/screens/FromConductorScreen.tsx),
and the parts in
[`components/marketing/`](../../docs/mockups/src/components/marketing/) and
[`components/parity/`](../../docs/mockups/src/components/parity/).
The [brand folder](../../docs/brand/README.md) gives the logo files. The
site uses the lockups and favicons from that folder unchanged. The header
and the footer show the lockup 25 px high, from the `lockupHeight` token
of the mockups, with its clear space of half that height. On a narrow
phone, the lockup of the site shrinks to the space beside the links, so
the page never scrolls sideways.

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
  A page in a folder keeps the folder in its path, such as
  `/docs/get-started` for `docs/get-started.html`. The home page uses
  `/`. The Worker requests each page without `.html` to avoid the
  binding's redirects. Every other address gets `404.html`
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
When a screen of the app or a picture of the list changes, capture the
pictures again with `npm run marketing:pictures` from the repository
root. [Pictures](pictures.md) gives the picture list, the files, and the
capture command.

## Legal pages

The Terms and Privacy pages show their title, introduction, and sections.
[Legal pages](legal-pages.md) gives their operator, the sources of their
facts, and their shared text. It also gives the sources for their review,
such as the ICO guidance on the privacy information to give.

When you change a fact in the architecture doc or in a protocol doc, read
both legal pages in full. The legal pages are the Terms page in
`src/marketing/terms.ts` and the Privacy page in `src/marketing/privacy.ts`.
In the same change, update each sentence of the legal pages that restates
the fact. A search for the old words is not enough, because a legal page
can restate a fact in other words.

## Public docs

The public docs are guides to the product at `/docs`.
[Website docs](../../docs/protocol/website-docs.md) states their
requirements, and [The docs](../../docs/mockups/marketing-site.md#the-docs)
of the marketing mockups is their visual spec.
[Writing the public guides](docs-authoring.md) gives the rules and the
steps for their authors.

Each Markdown file in `docs/` is one guide, and the site builds one page
from each file. The site has all twelve launch guides. The overview is at
`/docs`, from `overview.md`, and Get started is at `/docs/get-started`.
[Source references](docs-authoring.md#source-references) lists every guide
with its address and sources.

- Astro reads the files as the `docs` content collection, without a
  schema. Only the file name gives the ID of a guide. Each missing or
  invalid front-matter field takes its default, so a field never stops
  the build.
- One page route builds every guide. The overview has only the address
  `/docs`, and each other guide has `/docs/<id>`.
- Prism gives each token of a code block a class, which `docs-code.css`
  colours. Hooks of the Markdown processor then give each code block and
  each table keyboard focus and a name. They also mark each link that is
  alone in its list item as a guide action. So a guide needs no HTML of
  its own, no `style` attribute, and no script.
- The hooks run in `@astrojs/markdown-satteri`, the Markdown processor of
  Astro. The root package declares it so that `astro.config.ts` can pass
  the hooks. Keep its version equal to the version that Astro depends on,
  so the site keeps one copy of the processor.

The guides are docs too. A change that makes a guide wrong updates that
guide in the same change. When you change a fact in the architecture doc
or in a protocol doc, also read each public guide in full. In the same
change, update each guide sentence that restates the fact. A search for
the old words is not enough, because a guide can restate a fact in other
words. This rule is separate from the rule for the legal pages above, and
both apply.

## The comparison page

The page at `/from-conductor` shows people who move from Conductor the
status in Conductive of each Conductor feature, local and cloud.
[Conductor comparison](../../docs/protocol/conductor-comparison.md)
states its requirements. The link above the home headline and the "From
Conductor" link in the Product column of the footer lead to it. Its last
call to action has the sentence and the two actions of the home page.

[The comparison page](comparison.md) gives the one source of its rows, the
steps to change a row and keep it true, and its key code.
[AGENTS.md](../../AGENTS.md) says when a change must update a row.

## Development

The pages are in `pages/`, with layouts in `layouts/` and parts in
`components/`. The guides are Markdown files in `docs/`. Astro builds them
before the Worker serves them.

- Run the site tests with `npm run test -- worker/marketing src/marketing`.
  The built-site test clears Astro's content cache and builds once in a
  temporary folder, so Markdown hooks always use current source. The
  capture tests use fake pages and a fake browser, so they need no Chrome.
- Work on the pages with `npm run site:dev`. It serves them at
  `http://localhost:4321` and reloads them after edits. Sign-in links lead
  to the app of `npm run dev`. The footer shows the current year.
  The docs overview is at `/docs`. This server adds scripts of its own,
  so check the policy and the absence of scripts on a build.
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
- `content.config.ts`: the `docs` content collection, which reads each
  guide in `docs/` without a schema and takes its ID from its file name.
- `docs-guides.ts`: the front-matter defaults, the order of the menu, the
  address of each guide, and its previous and next guides.
- `pages/docs/[...guide].astro`: the page of each guide, with its
  level-two headings for "On this page".
- `layouts/DocsLayout.astro`: a guide in the site layout, with Docs marked
  as the current section of the header.
- `components/DocsNav.astro`, `DocsMenu.astro`, `DocsContents.astro`, and
  `DocsPager.astro`: the guide list, the Docs menu of a phone, "On this
  page", and the previous and next cards.
- `scroll-regions.ts`: the Markdown hook that gives each code block and
  each table keyboard focus and a name.
- `guide-actions.ts`: the Markdown hook that gives the `guide-action`
  class to a link that is the only content of its list item.
- `styles/docs-layout.css`: the columns of a guide, with the 1120 px and
  760 px breakpoints of the mockups.
- `styles/docs-nav.css`, `docs-contents.css`, `docs-prose.css`, and
  `docs-code.css`: the guide lists, the contents and cards, the body, and
  the code colours.
- `pages/from-conductor.astro`, `from-conductor/`, `styles/comparison.css`,
  and `styles/comparison-table.css`: the comparison page, the one source of
  its rows, and its styles. [Its key code](comparison.md#key-code) names
  each module and part.
- `components/StatusMark.astro`, `DueDay.astro`, `CopyText.astro`, and
  `ClosingCall.astro`: a status as its icon and word, a due day or "No date
  yet", a sentence of shared copy as markup, and the last call to action of
  a page.
- `features.ts`: the words that the site and the mockups share: the hero
  sentence and the footer tagline, the features, the Mac app section with
  its downloads, and the smaller features.
- `components/FeatureSection.astro` and `MacDownloads.astro`: the section of
  one feature of the home page, and the downloads of the Mac app section,
  with one link for each chip and the oldest macOS version.
- `access-copy.ts`: the words of the two actions of the site, and the
  sentence under the last call to action.
- `links.ts`: the source repository address, the Mac app download
  addresses, `docsPath` for the docs, site paths, the section that the
  header marks, and `pageHrefs` for links from another origin.
- `terms.ts`, `privacy.ts`, `privacy-uses.ts`, `legal-text.ts`: legal pages
  and the shared text model, titles, contact addresses, and sign-in
  agreement.
- `request-values.ts`: built-page markers, local Astro preview values,
  the sign-in address, and the links to the sections of the home page.
- [`astro.config.ts`](../../astro.config.ts): build settings, generated
  CSS for the font, tokens and picture sizes, the Markdown processor with
  Prism and the hooks, and the file list writer.
- [`site-build.ts`](../shared/site-build.ts): shared folder, list, page,
  icon, marker, and file-list names and types.
- `tokens.ts`, `styles/`: design tokens from the mockups and bundled CSS.
- `icon-shapes.ts`: the lucide icons of the home page features, the
  actions, such as the Mac app downloads, the comparison page, and the
  docs, as shapes for the Astro pages.
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
  files, the public guides, and the comparison page with its two entry
  links.
