# Build the marketing site with Astro

Status: Active. On branch `calummoore/astro-marketing-site-switch`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The marketing site at `conductive.build` has a home page, Terms, Privacy,
and a page for an unknown address. The Worker builds each page at each
request from TypeScript strings in `src/marketing/`. The agreement page
before GitHub, on the app host, uses the same code. The site has no
Markdown support and no page list, so docs and other new pages would each
need new hand-made code.

This change moves the site to Astro, as the user chose in decision 1.
Astro builds static pages from `.astro` components, one to one with the
current pages. The Worker serves the built files with today's headers, and
it fills in the values of each request. The pages keep their paths,
markup, classes, texts, styles, and pictures. They still run no script and
set no cookie. Later docs and pages can then be Markdown files or Astro
pages.

This change does not add the docs section or any new page. Item 1 of the
"Docs Section Brainstorm" workspace is still open, and it decides how the
docs are built. The change does not touch the mockups. They stay a
separate drawing of each page, as option B accepts. The brainstorm notes
and the checks of 8 November 2026 are in `.context/astro-marketing-site/`.

Contract owners:

- [Architecture](../docs/architecture.md#marketing-site): the marketing
  site component.
- [Access and security](../docs/protocol/access-and-security.md): the site
  needs no sign-in, and its footer links to the Terms and Privacy pages.
  This change keeps both requirements.
- The [marketing site README](../src/marketing/README.md).
- The [marketing site mockups](../docs/mockups/marketing-site.md), the
  visual spec. This change keeps them as they are.

## Replaced ways

- The Worker builds each page at each request from TypeScript strings →
  Astro builds each page once, and the Worker serves the built file.
  Consumers: `marketingResponse` in `worker/hosts.ts`, `startSignIn` in
  `worker/security/auth.ts`, `src/marketing/routes.test.ts`, the marketing
  host case of `worker/security/gate.test.ts`, the marketing README, and
  the site preview text of `README.md`. Moved in Milestone 3. Milestone 3
  deletes these old modules of `src/marketing/`, and each module that only
  they use:
  - `html.ts`, `document.ts`, `styles.ts`, and `site.ts`
  - `chrome.ts`, `home.ts`, `frames.ts`, `legal.ts`, `actions.ts`, and
    `icons.ts`
  - `assets.ts`, `picture-files.ts`, `routes.ts`, and `sign-in-consent.ts`
- The hash of one inline stylesheet, computed by the Worker → the hash of
  each inline style element, recorded by the build in its file list.
  Consumers: the policy of the site pages and of the agreement page, and
  its test. Moved in Milestone 3. The old hash code goes with `styles.ts`
  in Milestone 3.
- 26 hand-written picture imports → one glob keyed by the shared picture
  list. Consumer: the picture frames. Moved in Milestone 2. Deleted with
  `picture-files.ts` in Milestone 3.

## Decisions

### 1. Choose what builds the public website

- **Root question:** How should the public website be built, so that docs
  and more pages are cheap to add?
- **Options:**
  - **A.** Keep the current site. Add each page in TypeScript, and build
    the docs in the Worker with the app's Markdown reader. Effort: Small
    now, then Large for the docs.
  - **B.** Move the site to Astro, and port the current pages one to one.
    The Worker serves the static pages with today's security headers. Docs
    become Markdown files. The complete gate gains the Astro type check,
    lint, format, and build steps. Each page stays drawn twice, in the
    mockups and in the site. Effort: Large.
  - **C.** Do B, but use the React mockup parts as the pages, so that
    each page is drawn once. Effort: Large.
- **Left out:** React pages without Astro, because the team must then
  build its own page build, style collection, and Markdown support.
  Starlight now, because it is a choice for the docs. Next.js and
  Docusaurus, because each page loads React and runs script. Eleventy,
  Hugo, and VitePress, because they cannot render the React mockup parts.
  Webflow and Framer, because their pages are not in Git. A separate host,
  such as Cloudflare Pages, because decision 73 C keeps the site on the
  Worker. Hosted docs only, such as Mintlify, because they help only the
  docs.
- **Recommendation:** C, for one drawing of each page.
- **Chosen:** B, by the user on 8 November 2026 ("1 = B").

## Design

Each item marked as an agent call is a design call of the agent, made on
8 November 2026.

### Build

- `astro.config.ts` at the root builds the site from `src/marketing/`.
  Pages are `.html` files that carry their styles inline, as today. Every
  other built file loads from `/_site/`. The settings are `srcDir`,
  `outDir`, `trailingSlash: 'never'`, `build.format: 'file'`,
  `build.inlineStylesheets: 'always'`, and `build.assetsPrefix`.
- Agent call: the build writes into `public/_site/`, which Git ignores.
  Reason: in `npm run dev`, the assets binding reads HTML only from
  `public/` and the Vite root, so a site under `dist/` is not visible
  there. `vite build` then copies the folder into the Worker's assets.
- Agent call: `npm run build` and `npm run dev` run the site build before
  Vite. `npm run site:dev` runs the Astro development server for work on
  the site.
- Agent call: the Mac app build leaves `_site/` out of its bundle. Reason:
  `desktop/vite.config.ts` uses the same `public/` folder.
- Agent call: an Astro integration in the config writes a list of the
  built files after each build. Reason: the assets binding answers a
  missing file with the app's page and status 200, and it redirects
  `.html` paths. So the Worker must know which files exist.
- Agent call, 8 November 2026: for each page, the list also holds the
  SHA-256 hash of each inline style element of the built file. Reason:
  the content security policy allows each inline style by its hash, as
  today.
- Agent call: one module in `src/shared/` names the site folder, the file
  list, and the markers. The site and the Worker both import it.
- Agent call, 8 November 2026: the site's public folder is
  `docs/brand/web/`, so the favicons keep fixed paths under `/_site/`.
  Reason: the Worker maps `/favicon.ico` to a fixed file, and the brand
  files stay unchanged.
- Agent call: the pages are `.astro` components. The existing CSS files
  stay as global stylesheets that the layout imports, so the class names
  and the styles stay as they are.
- Agent call: CSS that today comes from code joins the bundled styles:
  the design tokens, the size of each picture, and the font face. Reason:
  only bundled CSS goes inline. A stylesheet at a page path would be a
  separate file, which the policy does not allow. A virtual CSS module in
  the config is one way.
- Agent call: the data modules keep their paths: `legal-text.ts`,
  `terms.ts`, `privacy.ts`, `links.ts`, `features.ts`, and `tokens.ts`.
  Reason: the app and the mockups import the first four.
- Agent call: one glob keyed by the shared picture list gives the address
  of each picture file. Reason: Astro turns a plain image import into an
  object, so each import must change anyway. This applies the picture part
  of option C of `plans/follow-ups/marketing-site-copies.md`. The
  feature-text part stays in that item, for Milestone 15p of the main
  plan.
- Agent call: `@emnapi/runtime` is a direct dev dependency. Reason:
  `.npmrc` sets `legacy-peer-deps`, so npm does not install it, and
  `astro check` fails without it.

### Serve

- Agent call: the Worker code that serves the site moves to
  `worker/marketing/`. Then `src/marketing/` holds only the site that
  Astro builds.
- On the root domain, the Worker answers `GET` and `HEAD` only, and `405`
  with `Allow: GET, HEAD` for other methods, as today.
- It reads the file list once for each Worker instance. It serves a page
  at its path, such as `/terms` for `terms.html`, and a listed file under
  `/_site/`. `/favicon.ico` serves the favicon of the brand. Every other
  path gets the page for an unknown address, with `404`.
- It never sends on a redirect or the app's page from the assets binding.
  It never serves the folder of the agreement page on the root domain.
- Agent call: when the file list is missing, the Worker logs a warning and
  answers `503`. Reason: it cannot serve right pages without the build.
- The pages keep today's headers: `Cache-Control: no-cache`, the content
  type, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options:
  nosniff`. `HEAD` gets no body.
- The content security policy stays as today. It allows each inline
  style element of the page by its hash, from the file list. The rest
  stays too: no script, images and fonts from the site only, no base
  element, no form, and no framing.
- Agent call, changed on 8 November 2026: the first call allowed separate
  stylesheet files from the page's own origin in place of the hash. It
  changed the policy, but decision 1 B keeps today's security headers.
  Separate files are cached across pages, so the docs plan can weigh them
  again.
- Agent call: the agreement page before GitHub is a page of the same
  build, in a folder that only the app host serves. It keeps
  `Cache-Control: no-store` and its other headers.
- Agent call: the app host serves the site's asset files under
  `/_site/`, which the agreement page loads. It answers every other path
  under `/_site/` as an unknown app path, so the app host shows no copy of
  the site.

### Values of each request

- Agent call: the built pages hold a marker for each value that only the
  request gives. The Worker replaces each marker with the value as escaped
  text. Reason: one build then serves each deployment and local
  development, and the pages show the same values as today. The markers
  are:
  - the app origin of the sign-in links
  - the year of the footer
  - on the agreement page, the site origin and the Continue address
- In the Astro development server, the markers show the local app origin
  and the current year.

### Order

- Agent call: the port starts from the current `origin/main`. It ports
  each site change that lands before it, such as a Mac app section from
  the "Desktop App Website Mention" workspace. The docs section waits for
  this plan.

## Milestone 1: Documentation

Depends on: none

State the new shape of the marketing site component. No protocol doc
changes, because the change keeps every requirement at the boundary of the
site.

- [x] Update "Marketing site" in `docs/architecture.md`: the pages are
      built ahead of time as static files. The Worker serves them, fills
      in the values of each request, and serves the agreement page before
      GitHub from the same build.
- [x] Check `docs/protocol/` for each statement about the site, and
      confirm that none changes.
- [x] Move "Flows" of `docs/architecture.md` to its own linked page, so
      that the doc stays near the length target of the `documentation`
      skill. Added on 8 November 2026, because the update took the doc to
      270 lines.

Milestone completed on 8 November 2026 by the docs implementor. The
architecture doc has 229 lines. No protocol doc changes. Report:
`.context/astro-marketing-site/reports/m1-docs.md`.

## Milestone 2: Build the site with Astro

Tags: ui

Depends on: 1

Add Astro and build each current page with it. The Worker still serves the
old pages at the end of this milestone.

- [x] Merge `origin/main`. List each site change since this plan, and port
      it too.
- [x] Add the dev dependencies with `npm install -D`: `astro`,
      `@astrojs/check`, `@emnapi/runtime`, `eslint-plugin-astro`, and
      `prettier-plugin-astro`. Check that `npm ls vite` shows one Vite 8.
- [x] Add `astro.config.ts`, the shared module of the site folder, the
      file list, and the markers, and the integration that writes the
      file list.
- [x] Port the pages one to one, with the same paths, markup, classes,
      and texts:
  - [x] The layout: the head, the header, and the footer with the abuse
        address and the year.
  - [x] The home page: the hero, the feature sections, the smaller
        features, and the last call to action, with the pictures.
  - [x] Terms and Privacy, from the text model of `legal-text.ts`.
  - [x] The page for an unknown address.
  - [x] The agreement page before GitHub, with only the wordmark in its
        header and no footer.
- [x] Join the generated CSS to the bundled styles, so that each page
      carries it inline. Record the hash of each inline style element of
      each page in the file list. Read the picture
      files with one glob keyed by the shared list. Read the brand files
      and the font with `?url` imports.
- [x] Remove the picture part from
      `plans/follow-ups/marketing-site-copies.md`.
- [x] Add the scripts: `site:dev`, `site:build`, `astro check` in
      `typecheck`, and the site build before Vite in `build` and `dev`.
      Run `astro check` so that it cannot wait on a prompt.
- [x] Lint, format, and length-check `.astro` files with the existing
      commands. Ignore `.astro/` and `public/_site/` in Git, Prettier, and
      ESLint.
- [x] Leave `_site/` out of the Mac app bundle in `desktop/vite.config.ts`.
- [x] Compare each built page with the current site at 1440 and 390 px,
      dark and light. Save the screenshots under
      `.context/astro-marketing-site/`.
- [x] Update the development section of the marketing README, the command
      table of `README.md`, and the commands of `AGENTS.md`.

Milestone completed on 8 November 2026 by the UI implementor. Each built
page matches the old page with 0 differing pixels once its markers are
filled. The implementor's calls and the checks are in
`.context/astro-marketing-site/reports/m2-site-build.md`. The calls
include `tsconfig.site.json` for `astro check`, `CI=true` so that
`astro check` never waits on its install prompt, Vite's default browser
target so that the CSS keeps its `-webkit-` prefixes, and a temporary
plugin that hides the old `actions.ts` from Astro, which reads that name
as its server actions.

## Milestone 3: Serve the built site from the Worker

Depends on: 2

Serve the built pages and the agreement page from the Worker, then delete
the old page code.

- [x] Add the site response in `worker/marketing/`: the file list, the
      paths, the markers, the `404` page, the headers, and the `503`
      answer. Use it in `worker/hosts.ts`.
- [x] Serve the agreement page from the build in `startSignIn`, with the
      Continue address and the site origin.
- [x] Serve the site's asset files on the app host, and answer other
      paths under `/_site/` as unknown app paths.
- [x] Add a test helper in `worker/test-support/` that holds a small built
      site and answers as the assets binding does.
- [x] Move each assertion of `src/marketing/routes.test.ts` to the new
      tests. The policy assertion now covers each inline style element of
      the page, not only one.
- [x] Add a test that builds the site once into a temporary folder with
      `astro build --outDir`, and serves it through the Worker. It checks
      these cases:
  - [x] Each sign-in link of the home page leads to the app origin, and
        the footer shows the year of the request.
  - [x] The Terms and Privacy links of the footer open the draft pages,
        with their draft fields.
  - [x] No page names the sandbox provider.
  - [x] No page holds a script or a style attribute. The policy of each
        page allows exactly the hashes of its inline style elements. Each
        file that a page names is served.
- [x] Add router cases with the helper:
  - [x] The methods, and `HEAD` without a body.
  - [x] The `404` page for `/terms/`, an app file, and an API path.
  - [x] No redirect and no app page from the binding.
  - [x] The `503` answer without the file list.
- [x] Add a case for the agreement page: the Continue link leads to the
      accepted-terms sign-in path with the desktop challenge.
- [x] Add a case for the app host: it serves a site asset file and no site
      page.
- [x] Give the marketing host case of `worker/security/gate.test.ts` the
      test helper, and keep its assertions.
- [x] Delete the old modules of "Replaced ways". Save the searches that
      show them unused under `.context/astro-marketing-site/`.
- [x] Delete the plugin of `astro.config.ts` that hides `actions.ts`, with
      that module. Point `features.ts` at `IconName` in `icon-shapes.ts`.
      Drop the re-export of `picturesCss` with `frames.ts`. Fix the
      comments of `styles/base.css` and `styles/frames.css` that name
      `pictures.ts`. Added on 8 November 2026 from the Milestone 2 report.
- [x] Update the marketing README: how the Worker serves the site, the
      development steps, and the key code. Keep the `#pictures`,
      `#legal-drafts`, and `#development` anchors that other docs link to.
- [x] Update the site preview text and the key code of `README.md`, and
      each stale statement in `docs/mockups/marketing-site.md`. Check each
      relative link of each changed Markdown file.
- [x] Smoke-test with `npm run build` and `npm run preview`. Open each
      page, an unknown address, a picture, and the agreement page with a
      desktop challenge, at 1440 and 390 px. Save the screenshots under
      `.context/astro-marketing-site/`.

Milestone completed on 8 November 2026 by the non-ui implementor, a Codex
session. It moved every assertion of the old site tests and added 14
tests. Each new test failed first on an assertion. The built-site test
passed 10 of 10 runs in about 1.8 s each. Report and evidence:
`.context/astro-marketing-site/reports/m3-worker.md`. Agent calls: a page
without its markers, or an HTML answer for a site file, counts as the
app fallback and gives `503`. On the app host, an unknown path under
`/_site/` gets the app page from `/`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
      Run the new site build test 10 times, and record its run time.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the next deployment, open `conductive.build`, `/terms`,
      `/privacy`, an unknown address, and the browser sign-in of the Mac
      app. Check the pages, their headers, and their links.
