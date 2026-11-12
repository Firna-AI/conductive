# Changelog on the website

Status: Active. On branch `calummoore/milan-onum`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The marketing site gets a public page at `conductive.build/changelog`. The
page shows one post for each day with a release, newest first. A post
names the versions of that day and tells, in product words, what a user
or a visitor can now do or see. The team writes each post as a Markdown
file in the repository, so each post gets the review of a pull request.
A daily routine drafts the posts, and a person reviews and merges them.
This change builds the page, writes the guide that the routine follows,
and writes the posts for every release so far, 0.1.0 to the newest.

The change does not add a feed, an email signup, or pictures. It does not
link the page from the web app or the Mac app, because decision 3 is open.
It does not change `CHANGELOG.md`, the release flow, or the published
GitHub releases. They stay the complete record for engineers.

This plan replaces the plan on the unmerged branch
`calummoore/website-changelog-brainstorm`, commit `2e3d14a45`. That plan
built the page from `CHANGELOG.md`.

Contract owners:

- `docs/protocol/website-changelog.md`, which Milestone 2 writes.
- [Marketing site](../docs/architecture/marketing-site.md) and
  [Protocol docs](../docs/architecture/protocol-docs.md) in the
  architecture docs.
- The [marketing site README](../src/marketing/README.md), its new page
  `src/marketing/changelog-authoring.md`, and its
  [Key code](../src/marketing/key-code.md).
- The mockup `marketing/changelog`, with its notes in
  [The marketing site](../docs/mockups/marketing-site.md).
- The row `product-changelog` of the
  [Conductor comparison](../docs/protocol/conductor-comparison.md).

## Decisions

### 1. How people learn what changed

- **Answer:** C, made daily, from Cal on 12 November 2026: "ok, we can
  have a daily routing that does the changelog, but do the design and
  setup the framework for it and do all of the previous releases". On 11
  November 2026, Cal first chose B "for now". The second brainstorm round
  showed new facts, and Cal moved to C.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. Notes: `.context/changelog/brainstorm.md` and
  `.context/changelog/widen.md`.
- **Root question:** How do visitors and users of Conductive learn what
  changed in the product?
- **Options:**
  - **A.** A footer link to the GitHub releases page. Effort: Small.
  - **B.** A `/changelog` page built from `CHANGELOG.md` at each site
    build. Effort: Medium.
  - **C.** Curated posts that a routine drafts and a person reviews.
    Effort: Medium.
  - **D.** One note file in each user-visible pull request, shown by day.
    Effort: Medium.
- **Reasons against B:** on 11 November 2026, 52 of the 134 entries of
  `CHANGELOG.md` were comparison refreshes, internal words, or changes
  that users cannot see. Release 0.12.0 names the sandbox provider, which
  `AGENTS.md` keeps out of user-facing text. About 45 entries came each
  day, so each release pull request needed a read.
- **Left out:** A hosted changelog service, because an embed needs a
  script and the site runs none. Notes in the database, because the static
  site cannot read them. "New" badges and launch posts, because they give
  no record over time. Edits of past releases, because a published
  release never changes. A CI job with a stored model key, because a
  routine gives the same draft without a new secret.

### 2. The site's own updates crowd the page

- **Answer:** Closed with no change on 12 November 2026. It applied only
  under option B of decision 1. A curated post leaves out the comparison
  refreshes.

### 3. How signed-in users reach the changelog

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/command-palette-actions.md:65` and
  `desktop/src/menu.ts:28-33`.
- **Terms:**
  - **Palette:** the command palette of the app. Its Help group holds one
    action, Send feedback.
- **Background:** The app links site pages only from the sign-in screens.
  The Mac Help menu holds only Check for updates. The Mac update dialog
  shows no notes. A palette row today moves only to an address inside the
  app.
- **Problem:** A signed-in user has no path from the app to the
  changelog. The public guides have the same gap.
- **Impact if no action:** Users see changes in the app with no
  explanation.
- **Root question:** How does a signed-in user find out what changed?
- **Options:**
  - **A.** Nothing in the app. Users find the page from the site. Effort:
    Small.
  - **E.** Only the Mac Help menu gets "What's new", which opens the page
    in the browser. Browser users get no path. Effort: Small.
  - **B.** A "What's new" action in the palette Help group and in the Mac
    Help menu, which opens the page. It adds a second exception where the
    palette docs call Send feedback "the one exception". Effort: Medium.
  - **D.** Notes in the Mac update dialog. It reaches Mac users only, at
    an update. Its words come from the GitHub release, because the post of
    a version comes only after its release. Effort: Medium.
  - **F.** B, extended to each public page for users. The palette Help
    group and the Mac Help menu each get "What's new" and "Docs", which
    open their site pages outside the app. The Help rule then says that
    Help holds Send feedback and the links to the public pages for users.
    Effort: Medium.
  - **C.** A "What's new" panel with a mark for unseen posts. It needs a
    new screen, a mockup, stored seen state, and a source that the app can
    read. The app connects only to its own origin. Effort: Large.
  - **G.** A visible Help button in the org rail above the account, and a
    Help row in the org switcher of a phone. Each opens a menu with What's
    new, Docs, and Send feedback. It needs new mockups and changes three
    protocol docs. Effort: Large.
  - **H.** G, plus a dot on the Help button while a post is newer than the
    newest post that the person opened. The browser keeps the date of the
    last open, so the Privacy page changes. Effort: Large.
  - **I.** An email of each new post to the signed-in users who opt in on
    the Account page. It needs consent, an unsubscribe step, a schedule,
    and a Privacy page change. It is the only option that reaches people
    who do not open the app. Effort: Large.
- **Left out:** A frame of the site page in the app, because site pages
  forbid frames and the Mac app opens no second window. A notice when a
  new version first loads, because its post does not exist yet. "New"
  marks next to changed controls, because a mark does not say what
  changed. Notes that operators write in the app, because they skip the
  pull request review that decision 1 chose.
- **Wider fix:** F. It gives every public page for users one path from
  the app, with one rule.
- **Previous examples:** The public guides at `/docs` have no link from
  the signed-in app. Only `src/shell/auth/SignInFrame.tsx:20` and
  `src/shell/auth/SignInScreen.tsx:22` link site pages.
- **Related:** `plans/keyboard-shortcuts.md` left out a notice of moved
  keys, because the app has no release notes. An answer here can change
  that reason.
- **Recommendation:** F. It costs about as much as B and also gives the
  public guides their first path from the app. The first recommendation
  was B. The options check added E to I and moved it to F. G with the dot
  of H protects best, at Large effort.
- **Action:** ask the user, because each option except A changes the Help
  group rule or adds behaviour that no requirement covers. No milestone of
  this plan depends on the answer. A later change builds the chosen
  option.

## Design

- **Source.** One Markdown file for each day with a release, in
  `src/marketing/changelog/`, named by its day, such as `2026-11-12.md`.
  An Astro content collection reads the folder. Notes for authors live
  outside that folder, so the site never publishes them.
- **Front matter.** `date`, the day of the releases, `title`, a short
  headline, and `versions`, the list of versions of the day. A post body
  is Markdown. It can start with a short lead paragraph. It then has up
  to three sections, in this order: `## New`, `## Improved`, and
  `## Fixed`. Each section is a list with one change on each line.
- **Reader.** `src/marketing/changelog-posts.ts` reads the collection,
  as `docs-guides.ts` reads the guides. It turns each post into the
  `ChangelogPost` type of `src/marketing/changelog-model.ts`: the lead,
  then the lines under each known section. A field that is missing or not
  valid takes a default and logs a warning. A post without a valid date
  takes the date of its file name. An unknown section, or text outside a
  list, gives a warning and stays off the page. Versions keep their order,
  oldest first. The posts sort newest first.
- **Page.** `src/marketing/pages/changelog.astro` on `SiteLayout`, with
  `styles/changelog.css`. A heading and a lead at the top. Then each post:
  its day as a `time` element, its title, its versions, its lead, and
  its sections. The page draws the section names as `h3` headings from
  `changelog-copy.ts`, under each `h2` post title. A desktop shows the day
  in its own column, and the day stays in view while its post scrolls. A
  phone shows the day above the title. Each post has an anchor with its
  day, such as `#2026-11-12`, and the day links to it. The versions show
  in full, such as "Versions 0.13.0, 0.14.0, and 0.15.0". The lead links the GitHub releases for the complete list
  of changes. The page has its own title and description for link
  previews.
- **Routine.** A routine of the Conductive org runs daily. It follows
  `src/marketing/changelog-authoring.md`. It finds each released version
  that no post lists yet, from the version headings of `CHANGELOG.md`. It
  reads the pull requests of those versions. It adds the versions to the
  post of their day, or creates that post. It opens a pull request and
  stops. When every version has its post, it does nothing.
- **Mockup.** `marketing/changelog`, drawn by `ChangelogScreen`, with
  sample posts. `src/marketing/changelog-copy.ts` holds the words of the
  page, and `src/marketing/changelog-model.ts` the shape of a post, so the
  site and the mockup show the same words and the same shape.

### Design calls

These are my calls, made on 12 November 2026.

| Call | Reason |
| --- | --- |
| One post for each day with a release. A post lists the versions of its day. | Cal chose a daily routine. Releases come several times a day, so one post for each release would be short and many. The versions let a Mac user match a post to the installed version. |
| A post covers released versions only. A change on `main` waits for its release. | The Mac app gets a change only at a release. The version is a fixed point that the routine can find again without a gap or a double entry. |
| The day of a post is the date of its version headings in `CHANGELOG.md`. | release-please writes that date. The routine then needs no clock of its own. |
| A post leaves out a change that no user or visitor can see: refactors, CI, tests, the release flow, and comparison refreshes. Operator changes stay out too. | The page is for users and visitors. The GitHub releases keep the complete list. |
| Notable changes to the website, such as the pricing page, go in a post. | A visitor can see them. |
| A post uses product words. It follows the naming rules of `AGENTS.md` and the copy rules of the `product-ui` skill. | The page is user-facing text. |
| The sections are New, Improved, and Fixed, in that order. A section without changes is left out. | Conductor, Linear, and Cursor use the same kind of groups. A reader scans for what is new first. |
| The reader turns each post body into the shared model, and the page sets the section headings and their order. | Found by the mockup on 12 November 2026. A body rendered as written would give each section an `h2`, at the level of the post titles. The type cannot hold a wrong order or an unknown section. |
| One page holds every post. No page for each post, and no pages of posts. | The site has four days of posts. Anchors let a link point to one day. A later change can split the page. |
| A post commit uses the type `docs(changelog)`. | release-please hides `docs` commits, so a post never shows in the release notes and never raises the version. |
| The routine runs once a day and drafts. A person reviews and merges its pull request. | Agent merges are off in `AGENTS.md`. The review catches a wrong claim of the model. |
| The routine uses the `external docs implementor` action of the `models` skill. | The `models` skill lists release notes under that action. |
| Cal creates the routine in the app after the merge. | Routines live in the app, not in the repository. The routine reads the guide from `main`. |
| A field that is missing or not valid gives a default and a warning, not a build error. | The always-on rules prefer a warning. A new build error needs the user's approval. The guides use the same rule. |
| The footer Product column links the page, as its last link. The header keeps its links. | The header has no free width on a phone. The comparison page made the same call. |
| The web app and the Mac app get no link to the page. | Decision 3 is open. |
| The row `product-changelog` changes to Available in Milestone 4. | `AGENTS.md` asks the change that ships a listed feature to update its row. |
| The new protocol doc is `docs/protocol/website-changelog.md`. | It sits beside `website-docs.md`. |
| The protocol doc names each choice by its date, not by a decision number. | Decision numbers collide across parallel plans. |

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The `ui implementor` draws the changelog page and adds the footer link to
every page of the site.

- [x] Add `src/marketing/changelog-copy.ts` with the words of the page:
      its label, title, lead, description, footer link, the section
      names, and the empty state. Follow the copy rules of the
      `product-ui` skill and the naming rules of `AGENTS.md`.
- [x] Add `ChangelogScreen` in `docs/mockups/src/screens/` and the entry
      `marketing/changelog`, for desktop and phone. Draw it on `SitePage`.
  - [x] Use three sample posts: one with all three sections and a lead,
        one with Fixed only, and one with many versions.
  - [x] Add the empty state as a second state of the entry.
- [x] Add the page key `changelog` to `sitePaths` and `pageHrefs` in
      `src/marketing/links.ts`, to `src/marketing/request-values.ts`, and
      to `docs/mockups/src/paths.ts`. Update every other map of the site
      pages, such as `SiteHeader.tsx`, `SitePage.tsx`, and
      `CatalogueText.tsx`.
- [x] Add the Changelog link to the Product column of the mockup footer.
- [x] Describe the page in `docs/mockups/marketing-site.md`,
      `docs/mockups/catalogue.md`, and the marketing part of
      `docs/mockups/README.md`.
- [x] Run `npm run mockups:check` and the early checks of `AGENTS.md`.
      Smoke-test the new page and a changed footer on both layouts and in
      both colour schemes.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. Report:
      `.context/website-changelog/milestone-1-report.md`.
- [x] Commit the milestone with the `git-commit` skill.

## Milestone 2: Documentation and protocol

Depends on: 1

The `docs implementor` writes the requirements and the decisions in force.

- [x] Write `docs/protocol/website-changelog.md`. State:
  - [x] The address, no sign-in, the site header and footer, no script,
        no cookie, the footer link, the link preview, and the anchors. The
        mockup `marketing/changelog` is the visual spec.
  - [x] One post for each day with a release, newest first, with its day,
        title, versions, optional lead, and sections.
  - [x] What a post includes and leaves out, and the rules for its words.
  - [x] How a post is made: a routine drafts it daily, a person reviews
        and merges it, and the pull request review checks it.
  - [x] The defaults of a missing field, and the empty state.
  - [x] The decision in force: curated posts won over the GitHub
        releases link, a page built from `CHANGELOG.md`, and a note in
        each pull request. Name the date of the choice.
- [x] Name the page in `docs/architecture/marketing-site.md` and in the
      hostnames table of `docs/architecture.md`. Link the new doc from
      `docs/architecture/protocol-docs.md`.
- [x] Write `src/marketing/changelog-authoring.md`: the file format, the
      rules for the words, and the steps of the routine. Give the prompt
      of the routine. Link it from `src/marketing/README.md`.
- [x] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each
      public guide in `src/marketing/docs/` in full. Change only a
      sentence that restates a changed fact.
- [x] Check each relative link of each changed Markdown file. Commit.

## Milestone 3: Posts for the past releases

Depends on: 2

The `external docs implementor` writes one post for each day with a
release, from 0.1.0 to the newest release on `main`. It follows
`src/marketing/changelog-authoring.md`. It reads each pull request of
each version, not only its commit subject.

- [ ] Write the posts in `src/marketing/changelog/`, one for each day.
- [ ] Check that each released version is in exactly one post.
- [ ] Check the words against the naming rules of `AGENTS.md`.
- [ ] Commit with the type `docs(changelog)`.

## Milestone 4: Public page

Tags: ui

Depends on: 2. It runs beside Milestone 3, because it changes other
files. The built-site case runs after both.

- [ ] Before the page exists, the `non-ui implementor` extends
      `worker/marketing/built-site.test.ts` with one focused case.
  - [ ] Follow the footer link from the home page to `/changelog`. Check
        status 200, the title, and the newest post.
  - [ ] Add the path to the existing script, style-hash, asset, and link
        preview checks.
  - [ ] See the case fail on its expected 404.
- [ ] The `non-ui implementor` adds the collection `changelog` to
      `src/marketing/content.config.ts` and writes
      `src/marketing/changelog-posts.ts` with its tests.
- [ ] The `ui implementor` adds `src/marketing/pages/changelog.astro` and
      `styles/changelog.css`, in the cascade of `layouts/Document.astro`.
      Use the shared copy, `CopyText.astro` for the lead, and `dayWords`
      for the day. Add no script, inline style, or accent edge.
- [ ] Add the Changelog link to the Product column of `SiteFooter.astro`.
- [ ] Set the row `product-changelog` in
      `src/marketing/from-conductor/areas/apps-and-devices.ts` to
      Available, with a note under the claim rules of the comparison
      protocol.
- [ ] Run the marketing tests. In this sandbox, set `TMPDIR` to a folder
      inside `.context/`, because `/tmp` is on another mount. Run the new
      case 10 times, without retries
      or longer time limits.
- [ ] Run the mockup check and the early checks. Add no new gate.
- [ ] Smoke-test the built page through the Worker with `npm run build`
      and `npm run preview`. Compare it with the mockup in both colour
      schemes at 320, 390, 760, and 1440 px. Check the links and the
      keyboard order.
- [ ] Add the new files to `src/marketing/key-code.md`.
- [ ] Add `/changelog` and its footer link to the task of
      `plans/follow-ups/marketing-site-deployed-smoke-test.md`.
- [ ] Commit.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Before the pull request, merge `main` and add a post for each
      version that released since Milestone 3.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, the prompt of the routine, and the follow-up items that the
      change adds.

## Post-merge follow-up (non-blocking)

- [ ] Cal creates the routine in the Conductive org with the prompt in
      `src/marketing/changelog-authoring.md`: daily, on this repository,
      with the model of the `external docs implementor` action. Use Run
      now once and review its pull request.
- [ ] After the deploy, open `https://conductive.build/changelog`. Check
      the newest post and the footer link.
