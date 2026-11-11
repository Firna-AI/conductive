# Marketing site key code

This page belongs to the [marketing site README](README.md#key-code).
Each path is relative to `src/marketing/` unless the link names another folder.

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
  sentence under the last call to action, which fits each state of
  sign-ups.
- `pricing.ts` and `pages/pricing.astro`: the one source of the plans and
  words of the pricing page and its mockup, and the page. Its
  [key code](pricing-page.md#key-code) names each part.
- `links.ts`: the source repository address, the Mac app download
  addresses, `docsPath` for the docs, site paths, the section that the
  header marks, and `pageHrefs` for links from another origin.
- `terms.ts`, `terms-org.ts`, `privacy.ts`, `privacy-uses.ts`, and
  `legal-text.ts`: legal pages, the "Working in an org" section of the
  Terms, the "What Conductive uses, and why" section of the Privacy page,
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
