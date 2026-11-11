# Changelog page on the website

Status: Active. On branch `calummoore/website-changelog-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The marketing site gets a public page at `conductive.build/changelog`. Each
site build reads the root `CHANGELOG.md`, which release-please writes at
each release. The page shows each released version, newest first, with its
day, its sections, and the entries of its release notes. The Product column
of the footer links the page on every page of the site. Decision 2 is open:
it decides how the page keeps the refreshes of the comparison table from
crowding out the other entries.

The change does not write notes by hand, add a feed or an email signup, add
pictures, or link the page from the web app or the Mac app. It does not
change the published GitHub releases.

Contract owners:

- `docs/protocol/website-changelog.md`, which Milestone 2 writes.
- [Marketing site](../docs/architecture/marketing-site.md) and
  [Protocol docs](../docs/architecture/protocol-docs.md) in the
  architecture docs.
- The [marketing site README](../src/marketing/README.md), its new page
  `src/marketing/changelog-page.md`, and its [Key code](../src/marketing/key-code.md).
- The mockup `marketing/changelog`, with its notes in
  [The marketing site](../docs/mockups/marketing-site.md).
- The release steps in [the Mac app releases guide](../desktop/RELEASES.md).
- The row `product-changelog` of the
  [Conductor comparison](../docs/protocol/conductor-comparison.md).

## Decisions

### 1. How a person on the website learns what changed

- **Answer:** B, from Cal on 11 November 2026: "1 = B (for now)". Cal gave
  no reason. "For now" marks B as the first source, which a later change
  can replace.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. The brainstorm notes are in
  `.context/website-changelog/brainstorm.md`.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** The site has a home page, Terms, Privacy, and the
  comparison page for people who leave Conductor Cloud. release-please adds
  one section to `CHANGELOG.md` for each release, with each `feat` and
  `fix` commit subject. The site does not link the file.
- **Problem:** The site gives no record of what changed.
- **Impact if no action:** Visitors see no sign of the pace of work. Users
  find changes in the app with no explanation.
- **Root question:** How does a person on the website learn what changed
  in Conductive?
- **Options:**
  - **A.** A footer link to the GitHub releases page. Visitors leave the
    site and see commit subjects beside nine download files. Effort: Small.
  - **B.** A `/changelog` page built from `CHANGELOG.md` at each site
    build, without commit links. It needs no writing, but every `feat` and
    `fix` subject becomes public copy. Effort: Medium.
  - **C.** One hand-written entry for each release in a typed module. Each
    release needs its own notes pull request. Effort: Medium.
  - **D.** One note file in the pull request of each change that users can
    see, shown by day. A new `AGENTS.md` rule asks for it. Effort: Medium.
- **Left out:** A hosted changelog service needs a script and cookies,
  which the site does not use. A page that fetches the GitHub releases
  shows the words of B with a network call, and an edit there changes a
  published release. A CI job that drafts notes with a model needs a stored
  model key. An in-app panel is not the website. A blog covers only a few
  big features. No change fails the goal.
- **Wider fix:** None. The item adds a feature.
- **Previous examples:** None for a changelog. The comparison page chose a
  site page over a Markdown file in the repository. The Mac app downloads
  rejected a link to the releases page, because of its nine files.
- **Recommendation:** D, in the brainstorm. Cal chose B.
- **Action:** Answered. A later change can move to C or D. The page reads
  a typed model, so only the source of the releases changes.

### 2. The site's own updates crowd the page

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `CHANGELOG.md`. Most of the entries come from commits that
  change only `src/marketing/from-conductor/`.
- **Terms:**
  - **Scope:** the word in brackets after the type of a commit subject,
    such as `marketing` in `fix(marketing): …`.
  - **`exclude-paths`:** a release-please setting that skips each commit
    whose files all lie under the listed paths.
- **Background:** The site's own changes use the `marketing` scope. On
  `main` on 11 November 2026, after 0.9.0, 32 of the 119 entries of
  `CHANGELOG.md` have it. 23 of them are refreshes of the comparison table,
  7 are site features, such as the pricing page, and 2 are small site
  fixes. Each
  refresh is a `fix(marketing)` commit, so release-please lists it as a bug
  fix. The Mac app does not show the site, as `desktop/vite.config.ts`
  says.
- **Problem:** Under decision 1, the page shows each of these entries. In
  0.8.0, 8 of the 10 fixes are refreshes. Their words, such as "Mark file
  drops and image tab previews in progress", describe the comparison
  table, not the product.
- **Impact if no action:** Most fixes on the page are status changes of
  the comparison table. A visitor learns little about the product from
  them.
- **Root question:** How does the page keep the changes of the product and
  the site in view, without the refreshes of the comparison table crowding
  them out?
- **Options:**
  - **A.** Show every entry, as the option text of decision 1 says. The
    refreshes stay beside the product's changes. Effort: Small.
  - **B.** The page leaves out each entry with the `marketing` or `mockups`
    scope. The file and the GitHub releases keep them. The page also hides
    the site features, and it depends on the scope. Effort: Small.
  - **C.** Set `exclude-paths` to `src/marketing/from-conductor` in
    `release-please-config.json`. A commit that changes only the comparison
    rows then leaves the release notes and raises no version. This changes
    the release rules of the Mac app protocol. Past releases keep their
    refreshes on the page. Effort: Small.
  - **D.** A rule in `AGENTS.md`: a change that only the site shows uses a
    type that release-please hides, such as `docs(marketing)`. It works
    only when each agent follows it. It also hides later site features,
    such as a new pricing page. Past releases keep their entries. Effort:
    Small.
  - **E.** The page leaves out each entry with the `mockups` scope, and
    each bug fix with the `marketing` scope. It keeps the site features,
    such as the pricing page and the Mac app downloads. It also hides later
    site fixes, and it depends on the scope and the type. Effort: Small.
  - **F.** The page folds the `marketing` and `mockups` entries of each
    release into one closed `details` element, such as "Website: 8
    updates". Every entry stays on the page, and the site already uses
    `details` with no script. An opened fold still lists the refreshes.
    Effort: Small.
  - **G.** C and E together. E hides the past refreshes, which C cannot
    reach. C keeps each new refresh out of the release notes and the
    version by its files, whatever its scope or words. It changes the
    release rules of the Mac app protocol, as C does. Effort: Small.
- **Left out:** A list of single entries to hide: E hides the same past
  refreshes with one rule and no list. A filter on the words of an entry:
  B and E are better on every point. An edit of the past sections of
  `CHANGELOG.md`: the published releases never change, so the file would
  disagree with them for good, and E gives the same page without that
  cost. A page build that reads the files of each commit from Git: the
  deploy checks out one commit only, and G gives the same page. GitHub's
  generated release notes with path labels: C is better on every point. A
  scope rule in the release-please sections: its schema has none. An
  override block for each refresh: C does the same work by path. A fold of
  every bug fix: it also folds the product's own fixes, so it fails the
  goal. Fewer, batched refreshes: they break the `AGENTS.md` rule that a
  row changes in the same change as its feature.
- **Wider fix:** C, which G includes. It keeps the refreshes out of the
  release notes at their source, so the GitHub releases and the version
  follow too.
- **Previous examples:** 22 of the 24 `fix(marketing)` commits since 9
  November 2026 change only `src/marketing/from-conductor/`, such as #144,
  #212, and #237.
- **Recommendation:** G. E cleans the past releases and keeps the site
  features that B hides, and C stops each new refresh by its files. The
  first recommendation was B. The options check added E, F, and G, and
  changed it to G. When the release rules must stay as they are, E alone
  is next best.
- **Action:** ask the user, because the options trade a clean page against
  showing every entry, and C and G change the release rules of the Mac app
  protocol.

## Design

- **Source.** The root `CHANGELOG.md`, read once at each site build. A
  release changes the file when its release pull request merges. That
  merge is a push to `main`, which deploys the site, so the page shows each
  release when it lands. The Worker needs no change: it serves
  `changelog.html` at `/changelog` from the file list.
- **Entries.** release-please lists each `feat`, `fix`, `perf`, and
  `revert` commit, and the note of each breaking change. It leaves out
  `chore`, `docs`, `style`, `refactor`, `test`, `build`, and `ci`.
- **Model.** `src/marketing/changelog/model.ts` holds types only. A release
  has a version, a day, and sections. A section has a heading and entries.
  An entry has its text.
- **Parser.** `src/marketing/changelog/parse.ts` is a pure function from
  the text of the file to the releases and the warnings. It reads the
  release-please format: a version heading with or without its compare
  link, and its date. It reads each section heading and each bullet entry.
  It drops the bold scope, the pull request link, and the commit links, and
  it capitalizes the first letter. It also applies the answer to
  decision 2.
- **Build read.** `src/marketing/changelog/releases.ts` reads the file,
  parses it, and gives the releases to the page. The build log shows each
  warning.
- **Copy.** `src/marketing/changelog/copy.ts` holds the words of the page:
  its label, title, lead, description, footer link, and empty state. The
  site and the mockup read it.
- **Page.** `src/marketing/pages/changelog.astro` uses `SiteLayout` and the
  text-page head of the site. Each release has a heading with its version
  and a `time` element, then one list for each section. The page has its
  own title and description for link previews.
- **Mockup.** `marketing/changelog`, drawn by `ChangelogScreen`, with a
  sample of releases that uses the types of `model.ts`.

### Design calls

These are my calls, made on 11 November 2026.

| Call | Reason |
| --- | --- |
| The page lives at `/changelog`. | The Worker serves each built page at its own path, so the page needs no new route. |
| The Product column of the footer links the page. The header keeps its links. | The comparison page made the same call, because the header has no free width on a phone. |
| An entry shows the subject of its commit, without its scope and without links. | Decision 1 makes the subject public copy. A scope such as `runner` is a code name, which the copy rules keep out of user text. |
| The past sections of `CHANGELOG.md` stay as they are. | Decision 1 chose the file as the source. The file and the published GitHub releases then agree. |
| A new rule in `## Repository rules` of `AGENTS.md`: the subjects of `feat`, `fix`, `perf`, and `revert` commits and the notes of breaking changes are public copy. Write each one for users, so that it makes sense without its scope, with no internal names, and under the naming rules. Decision 2 says which site changes use these types. | The naming rules and the copy rules apply to user-facing text, and the page shows these words. |
| The person who merges a release pull request first reads its new section of `CHANGELOG.md`. To fix a line, they add a `BEGIN_COMMIT_OVERRIDE` block to the body of the merged pull request of that line. | release-please rebuilds the release pull request, so a hand edit there can be lost. Its README documents the override. The override does not work for a plain merge. |
| No new check fails a build or a pull request on a banned name or a broken subject rule. | A new check needs the user's approval. The rule and the read of the release pull request cover it for now. |
| The parser leaves out a line that it cannot read, with a warning. A file without a release gives the empty state. | The always-on rules prefer a warning over a failure. A new build error needs the user's approval. |
| Section headings keep the words of the file, in sentence case, such as "Bug fixes". | The page changes the source words as little as it can. |
| A day uses the day words of the comparison page. | Each page of the site then writes a day the same way. |
| One page shows every release, without pages of its own. | The file is short today. A later change can split the page. |
| No feed, email signup, or pictures. | Each one can come later without rework. |
| The web app and the Mac app get no link to the page. | The task names the website. |
| The mockup draws a sample of releases and does not read the file. | A mockup can use sample data, as the docs mockups do. The shared types keep its shape the same as the page, so no later mockup milestone is needed. |
| The new protocol doc is `docs/protocol/website-changelog.md`. | It sits beside `website-docs.md`. The comparison page and the pricing page also have their own docs. |
| The protocol doc names each choice by its date, not by a decision number. | Decision numbers collide across parallel plans, as `plans/follow-ups/decision-numbers-across-plans.md` says. |
| The comparison row `product-changelog` changes to Available in Milestone 4, with a new note. | `AGENTS.md` asks the change that ships a listed feature to update its row. This branch reaches `main` only with the page. |

### Known limits

- Some entries of the past releases use internal words, such as "pass
  signing secrets to the reusable release job". They stay, because
  decision 1 accepts the commit subjects. A move to C or D of decision 1
  replaces them.
- The page lists only released versions. A change on `main` after the last
  release shows with the next release, also when the web app has it.
- The merge of a release pull request deploys the site before the release
  workflow publishes the Mac files. So the page can list a version whose
  Mac files are still on the way. The web app already has each change of
  that version.

## Milestone 1: Mockups

Tags: mockup

Depends on: decision 2

The `ui implementor` draws the changelog page, and it adds the footer link
to every page of the site.

- [ ] Add `src/marketing/changelog/model.ts`, with the types of a release,
      a section, and an entry. Add `src/marketing/changelog/copy.ts`, with
      the words of the page. Follow the copy rules of the `product-ui`
      skill and the naming rules of `AGENTS.md`.
- [ ] Add `ChangelogScreen` in `docs/mockups/src/screens/` and the entry
      `marketing/changelog`, for desktop and phone. Draw it on `SitePage`
      and `TextPage`.
  - [ ] Use a sample of four releases from the current `CHANGELOG.md`, as
        the page shows them under the answer to decision 2. Add one
        release with fixes only, and one section of breaking changes.
        Under option F, draw the fold closed and open.
  - [ ] Add the empty state as a second state of the entry.
- [ ] Add the page key `changelog` to `sitePaths` and `pageHrefs` in
      `src/marketing/links.ts`, to `src/marketing/request-values.ts`, and
      to `docs/mockups/src/paths.ts`. Update `SiteLinks` in
      `SiteHeader.tsx`, `SitePage.tsx`, `CatalogueText.tsx`, and every
      other map of the site pages.
- [ ] Add the Changelog link to the Product column of the mockup footer.
- [ ] Update the home page sentence of `docs/mockups/marketing-site.md`
      that lists "changelog", and the rationale of
      `docs/mockups/src/entries/marketing/index.mockup.tsx`. The home page
      still shows no changelog itself, and its footer links the changelog
      page.
- [ ] Describe the page in `docs/mockups/marketing-site.md`,
      `docs/mockups/catalogue.md`, and the marketing site part of
      `docs/mockups/README.md`.
- [ ] Run `npm run mockups:check` and the early checks of `AGENTS.md`.
      Smoke-test the new page and a changed footer on both layouts and in
      both colour schemes.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [ ] Commit the milestone with the `git-commit` skill.

## Milestone 2: Documentation and protocol

Depends on: 1

The `docs implementor` writes the requirements and the decisions in force
for the work below.

- [ ] Write `docs/protocol/website-changelog.md`, in about 60 lines. State:
  - [ ] The address, no sign-in, the site header and footer, no script, no
        cookie, the footer link, and the link preview. The mockup
        `marketing/changelog` is the visual spec.
  - [ ] Each released version, newest first, with its day and the
        sections and entries of its release notes. An entry is the subject
        of a commit that the release notes list, or the note of a breaking
        change, without its scope or links. The page lists no change that
        is not released.
  - [ ] The entries that the page leaves out, under the answer to
        decision 2.
  - [ ] The page changes with each release and needs no writing step.
  - [ ] The empty state, and a line that the page cannot read.
  - [ ] The decision in force: release notes from the commits of each
        release won over a link to the GitHub releases, notes for each
        release, and a note in each pull request. Name the date of the
        choice.
- [ ] Name the page in `docs/architecture/marketing-site.md` and in the
      hostnames table of `docs/architecture.md`. Link the new doc from
      `docs/architecture/protocol-docs.md`.
- [ ] Under option C or G of decision 2, add the skipped commits to the
      release rules of `docs/protocol/desktop-packages-and-updates.md`.
- [ ] Add the rule for public commit subjects to `## Repository rules` in
      `AGENTS.md`. Under option D of decision 2, add the type rule for site
      changes too.
- [ ] Add the read of the new `CHANGELOG.md` section and the override
      block to the release steps of `desktop/RELEASES.md`.
- [ ] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each
      public guide in `src/marketing/docs/` in full. Change only a sentence
      that restates a changed fact. The new static page adds no processing
      and no cookie.
- [ ] Check each relative link of each changed Markdown file. Commit.

## Milestone 3: Release notes source

Depends on: 2

The `non-ui implementor` writes the parser and its tests. The work lands
with its first importer, the page of Milestone 4, so that no checkpoint
has an unused export.

- [ ] Write `src/marketing/changelog/parse.ts` with the types of
      `model.ts`.
  - [ ] Read a version heading with and without its compare link, and its
        date.
  - [ ] Read each section heading and each entry. Drop the bold scope, the
        pull request link, and the commit links. Capitalize the first
        letter.
  - [ ] Apply the answer to decision 2: leave out or mark the entries that
        it names.
  - [ ] Leave out a line that it cannot read, and give a warning with its
        line number.
- [ ] Write `src/marketing/changelog/releases.ts`. It reads the root
      `CHANGELOG.md` at build time and parses it. The build log shows each
      warning.
- [ ] Write `parse.test.ts` with the cases of the format, from short sample
      texts. Follow the `testing` skill.
- [ ] Under option C or G of decision 2, set `exclude-paths` in
      `release-please-config.json`. Check the setting once with the
      release-please version that the release workflow pins.
- [ ] Run the targeted tests.

## Milestone 4: Public page

Tags: ui

Depends on: 3

- [ ] Before the page exists, the `non-ui implementor` extends
      `worker/marketing/built-site.test.ts` with one focused case.
  - [ ] Follow the footer link from the home page to `/changelog`. Check
        status 200, the title, and the newest version of the root
        `CHANGELOG.md`.
  - [ ] Add the path to the existing script, style-hash, asset, and link
        preview checks.
  - [ ] See the case fail on its expected 404.
- [ ] The `ui implementor` adds `src/marketing/pages/changelog.astro` on
      `SiteLayout`, with `styles/changelog.css` in the cascade of
      `layouts/Document.astro`. Use the shared copy, the releases, and the
      day words. Give the page its title and description for link
      previews. Under option F of decision 2, fold the site entries in a
      `details` element. Add no script, inline style, or accent edge.
- [ ] Add the Changelog link to the Product column of `SiteFooter.astro`.
- [ ] Set the row `product-changelog` in
      `src/marketing/from-conductor/areas/apps-and-devices.ts` to Available,
      with a note under the claim rules of the comparison protocol.
- [ ] Run the marketing tests. Run the new case 10 times, without retries
      or longer time limits.
- [ ] Run the mockup check and the early checks. Keep each map of the site
      pages complete. Add no new gate.
- [ ] Smoke-test the built page through the Worker with `npm run build` and
      `npm run preview`. Compare it with the mockup in both colour schemes
      at 320, 390, 760, and 1440 px. Check the links and the keyboard
      order.
- [ ] Write `src/marketing/changelog-page.md` and link it from
      `src/marketing/README.md`, with a link to the protocol doc. Add the
      new files to `src/marketing/key-code.md`.
- [ ] Add `/changelog` and its footer link to the task of
      `plans/follow-ups/marketing-site-deployed-smoke-test.md`.
- [ ] Commit the page with the work of Milestone 3.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
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

- [ ] After the next release pull request merges and its deploy passes,
      open `https://conductive.build/changelog`. Check that it shows the
      new version at the top, with the entries of its section in
      `CHANGELOG.md`.
