# Conductor Cloud feature comparison page

Status: Active. On branch `calummoore/conductor-feature-parity-list`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductor is a Mac app for parallel coding agents at `conductor.build`.
Conductor Cloud, its set of cloud workspaces, turns read-only on
13 November 2026 and shuts down on 20 November 2026. Its users need to see
which of its features they keep in Conductive. This change adds a public
page at `conductive.build/from-conductor`. One table lists each Conductor
Cloud feature with its status, a real due date when one exists, and a short
note. The home page and the site footer link to the page.

The change does not build missing features, cover local Conductor
workspaces, or add an import tool. The 320 px overflow of the site header
stays with `plans/follow-ups/marketing-header-overflows-small-phones.md`.

Contract owners:

- `docs/protocol/conductor-cloud-comparison.md` and
  `docs/architecture/marketing-site.md`, which Milestone 2 writes.
- The [architecture doc](../docs/architecture.md), the
  [marketing site README](../src/marketing/README.md), and the mockup
  `marketing/from-conductor/one-table` with [its notes](../docs/mockups/marketing-site.md).

Replaced ways:

- The sample fixture `docs/mockups/src/fixtures/conductorParity.ts`, with
  its 24 rows, example dates, and `parityStudyNote` → the dataset in
  `src/marketing/from-conductor/`. Consumers: `parityStatus.ts`,
  `ParityIntro.tsx`, `ParityMarks.tsx`, `FeatureCells.tsx`, and
  `ParityOneTable.tsx` in `docs/mockups/src/components/parity/`, the
  one-table entry, the `index.md` of its folder, and
  `docs/mockups/marketing-site.md`. Moved and deleted in Milestone 3.
- The status words, order, due rule, and day words of `parityStatus.ts` →
  a status module beside the dataset. The page copy of the mockup → a copy
  module there. Consumers: `ParityIntro.tsx`, `FromConductorScreen.tsx`,
  `MarketingScreen.tsx`, `SiteFooter.tsx`, `ParityMarks.tsx`, and
  `ParityLegend.tsx`. Moved and deleted in Milestone 3.

## Decisions

Cal made these choices on 9 November 2026. The quotes are Cal's words. Cal
also authorized the remaining milestones without a further plan approval.

| Question | Chosen | Rejected | Reason |
| --- | --- | --- | --- |
| Where the list lives | A public page at `/from-conductor`, built from one typed data source ("1 = B"). | A Markdown page, a GitHub board, and a view in the app. | Visitors decide before they sign up, and links and searches reach the site. |
| Audience | Conductor Cloud features only, with a note that says so ("2. = A - but we should have some mention that we only refer to the cloud stuff"). | All Conductor features, which the brainstorm recommended, and two lists. | Conductive replaces Conductor Cloud, as the README says. Cal gave no other reason. |
| Promises | Several statuses, with an optional firm due date ("3 = we could have different statuses, some will have hard dates"). Cal gave no delivery date. | The earlier design call to show no dates. The answer chose a direction, not one of the brainstorm options. | The page must reassure Conductor users that missing features can come. |
| Layout | One table with an Area column, `marketing/from-conductor/one-table`, chosen from a mockup comparison. | By area, by status, and by task. The change removes them. | From the mockup notes: a visitor reads every feature in one run and compares statuses down one column. |
| Area cells | On a computer, one merged Area cell spans the rows of its area. The other columns keep a line under each feature. | The area name on the first row only. | None recorded. |
| Status colours | Not planned is red, In progress is amber, and Works differently is green. | The grey, blue, and text colours of the study. | None recorded. |

## Design

- **Page.** Astro builds `src/marketing/pages/from-conductor.astro` into
  `from-conductor.html`, which the Worker already serves at its path. The
  page draws the parts of the mockup: the intro, the legend, the table, the
  line about Conductor, and the closing call. Below 760 px, each row stacks
  its cells with its area on top. Like each page of the site, it runs no
  script and sets no cookie, so it has no search or filter control.
- **Dataset.** `src/marketing/from-conductor/` holds the areas, the
  statuses, the copy, one file for each area, and one module with the
  ordered rows. Each file stays under 300 lines. The modules import nothing
  that only the site, Node, or the app can load.
- **Rows.** A row has a stable id, the Conductor name, a status, a note,
  and a due date only on In progress and Planned rows. It has no evidence
  or audit field. The status data names lucide icons, which the site draws
  from `icon-shapes.ts`. The mockup maps them to lucide-react components,
  as `FeatureGrid.tsx` does.

| Status | Icon colour | A row has it when |
| --- | --- | --- |
| Available | Green | Connected production code on `main` gives the main part of the feature to users with app access. A mockup alone does not count. |
| In progress | Amber | An active open pull request or pushed branch holds production code for it. |
| Planned | Blue | An approved plan or a recorded user decision includes it as future scope. A paused tool with an approved return counts, such as the Desktop tab. |
| Works differently | Green | A Conductive feature that works today meets the same need in another way. The note says how. |
| Under consideration | Grey | It has no approved plan, no open work, and no recorded exclusion. |
| Not planned | Red | A recorded decision leaves it out. The note says what to do instead. |

### Design calls

These are agent calls of 9 November 2026.

| Call | Reason |
| --- | --- |
| **Six statuses.** The statuses of the mockup study stay, each with a word and an icon. | They cover each claim rule, and Cal chose the layout and the colours with them. |
| **No invented deadlines.** Each due date stays `null` until the team records a dated commitment. Future rows without a commitment show "No date yet". | Cal gave no date, and a shown date reads as a promise. |
| **One dataset.** The page and the mockup read the same modules. | Copies drift. `features.ts` and the legal text already work this way. |
| **Private evidence.** The evidence and the scope audit stay in `.context/conductor-parity/full-data/`, not in the public dataset. | The repository and the site are public. The evidence serves the review only. |
| **Plain notes.** A note has at most 25 words. It says what Conductive does, or what to do instead. It names no sandbox provider, internal name, or decision number. It copies no Conductor text. | The naming rules of `AGENTS.md` and the copy rules of the `product-ui` skill. |
| **Planned needs an approval.** An unchosen proposal stays Under consideration. A row keeps the status that a recorded decision gives. | Only the user commits the team to a feature. |
| **Dates that stay true.** The Cloud dates read true after each date, such as "Read-only from 13 November 2026". | The mockup says "turns read-only on", which is wrong after that day. |
| **Conductor in plain text.** The page shows no Conductor logo. The line that Conductive is not affiliated with Conductor stays. | The page compares another product. |
| **Entry points.** A short link above the home headline and a Product link in the footer. The header keeps its actions. | The first decision links the page from the home page, and the phone header has no room. |
| **Responsive static table.** One HTML table has the merged Area header and a phone-only Area cell for each feature. CSS switches their visibility. Verify table roles and column associations in the browser. | The static site has no script or request-time viewport. Both layouts must show the area for each row. |
| **Current access flow.** Page actions use the site's Join the waitlist label and promise no immediate app access. | Main now requires approval, an invite code, or an org invitation. |
| **Shared imports stay green.** Data lands with its first mockup importer. New site path and icon keys update every exhaustive mockup map. | Unused exports and missing map keys must not wait until the full gate. |
| **Upkeep rule.** `AGENTS.md` gets one rule: a change that ships, starts, or drops a listed feature updates its row. | A stale public row misleads visitors. |
| **No decision numbers.** The protocol doc states these decisions without numbers. | Numbers collide across parallel plans while `plans/follow-ups/decision-numbers-across-plans.md` waits for the user. |
| **Tests.** One focused case in the real built-site test, and the new path in its existing page checks. The case does not restate each status. No new validation, browser harness, or gate. | The types check the data shape, and the real build shows the route. |

## Milestone 1: Chosen mockup

Tags: mockup

Depends on: none

The `ui implementor` kept only the one-table page, with Cal's area cells
and colours, and linked it from the home page and the footer.

- [x] Remove the by-area, by-status, and by-task layouts, with their parts,
      styles, state schema, helpers, and paths. Cal approved this. They
      exist only on this branch.
- [x] Simplify `FromConductorScreen` to the one table, with the merged Area
      cells and the stacked phone rows.
- [x] Colour the icons of Not planned with `--ui-rose`, In progress with
      `--ui-amber`, and Works differently with `--ui-success`.
- [x] Add "From Conductor Cloud? Compare the features" above the home
      headline, and "From Conductor Cloud" to the footer's Product column.
- [x] Describe the one page in `docs/mockups/catalogue.md`,
      `docs/mockups/marketing-site.md`, and the `index.md` of its folder.
- [x] Run `npm run mockups:check` and the early checks of `AGENTS.md` with
      `npm run exports:check`. Inspect the changed views on both layouts
      and in both schemes.
- [x] Update this plan for each problem that the mockups show. The wording
      of the Cloud dates and a check of the full table went to Milestone 3.
- [x] Commit the milestone with the `git-commit` skill. Commit `22f15e5d`
      records the removed layouts and Cal's approval.

Evidence: `.context/conductor-parity/canonical-mockup-report.md`. The main
merge `a8f8d0e`: `.context/conductor-parity/main-sync.json`.

## Milestone 2: Requirements and docs

Depends on: 1

The docs state the requirements and the decisions in force before the code
changes. The `docs implementor` does this work.

- [ ] Write `docs/protocol/conductor-cloud-comparison.md` in 150 lines or
      fewer. Put each decision in force beside its requirement, with its
      rejected alternatives and reason. State these requirements:
  - [ ] The address, no sign-in, the site header and footer, no script, no
        cookie, the two entry points, and the table. The mockup is the
        visual spec.
  - [ ] Conductor Cloud features only, with the scope note. A feature that
        controls only local Mac workspaces is out, also on another device,
        such as remote control. A cloud feature with a Mac client stays.
  - [ ] The six statuses with the meaning, claim rule, and colour of each.
        Only a recorded commitment gives a due date. Without one, an In
        progress or Planned row shows "No date yet".
  - [ ] The notes, the check date, the Cloud dates, and the line about
        Conductor.
- [ ] Keep the root architecture near its length target after the latest
      main integration. Move its marketing component and data/trust detail
      into linked area pages without losing new waitlist responsibilities.
      Name the comparison page and link the new protocol.
- [ ] Link the new doc and the new architecture page from `README.md`. Name
      the page in "The marketing site" of `docs/mockups/README.md`.
- [ ] Add the upkeep rule to `## Repository rules` in `AGENTS.md`.
      `CLAUDE.md` links to that file.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Change only a sentence that restates a changed fact. Use the merged privacy text, including
      waitlist records. The new static page adds no processing or cookie.
- [ ] Check each relative link of each changed Markdown file. Commit.

## Milestone 3: Shared content

Depends on: 2

The `non-ui implementor` writes the host-neutral typed dataset. It lands
with its first importer in Milestone 3a, so no checkpoint has unused data.

- [ ] Use the current research in `.context/conductor-parity/full-data/`.
      Its audit accounts for all 200 source rows. Preserve all current
      source functionality during main integration.
- [ ] Refresh statuses after main changes. Workspace numbers and links
      from pull request #118 are now implemented. Pull request #116 adds
      controlled access and waitlist behavior. Preserve those limits in
      public notes and the current Mac v0.2.0 workaround.
- [ ] Keep approved future scope for the paused Desktop. Recheck the
      still-unconnected attachment resolver and current PR #90 status.
- [ ] Write readonly typed rows, areas, status metadata, and date helpers
      under `src/marketing/from-conductor/`. Split by area, under 300 lines.
      A discriminated feature union permits dates only on coming rows.
- [ ] Leave every due date null. Keep private evidence and source-row
      audit fields out of production data. Set the real check date.
- [ ] Match the corrected research exactly and run targeted data checks.
      Global unused-export verification waits for the first importer.

Evidence: `.context/conductor-parity/shared-data-report.md` and the refreshed
research and audit under `.context/conductor-parity/full-data/`.

## Milestone 3a: Full-content mockup integration

Tags: mockup

Depends on: 3

The `ui implementor` migrates the chosen mockup to the shared content. The
full inventory needs a visual pass before the public page. This also owns
the shared copy and exhaustive map updates identified by the plan check.

- [ ] Create shared page and link copy. Use timeless Cloud date wording,
      the official announcement link, and the current waitlist actions.
      Move all column headers and closing copy from `ParityOneTable.tsx`
      and `FromConductorScreen.tsx`, as well as the other listed consumers.
- [ ] Migrate every consumer under Replaced ways to the canonical modules.
      Delete the sample fixture, its example dates, parityStudyNote, and
      duplicate mockup status/copy/date definitions. Keep no adapter.
- [ ] Add the six status SVG shapes and notice entries needed by the site.
      Update the exhaustive icon map in `FeatureGrid.tsx` in the same step.
- [ ] Add the public route key to sitePaths, pageHrefs, and siteOriginHrefs.
      Update `CatalogueText.tsx` and every other exhaustive SitePage map.
      The actual public page and links remain for Milestone 4.
- [ ] Update the chosen entry, index document, catalogue notes, and marketing
      README for real shared content. Remove all sample caveats.
- [ ] Run typecheck, mockup checks, formatting, lint, file length, and unused
      exports. Inspect the full table in both schemes and layouts.
- [ ] Verify one table, one header, complete row groups, requested colours,
      merged Area boundaries, no example dates, and accessible phone rows.
- [ ] Commit the shared content and its importer together. Record the
      sample deletion. Evidence stays under `.context/`.

## Milestone 4: Public page

Tags: ui

Depends on: 3a

Astro builds the page from the dataset, as the mockup draws it. The home
page and the footer link to it. The `ui implementor` does this work.

- [ ] Extend `worker/marketing/built-site.test.ts`. Read each label and the
      path from the shared modules.
  - [ ] Add the new path to the checks of scripts, style hashes, named
        files, and the sandbox provider name.
  - [ ] Add one focused case. It follows the home and footer links to the
        public route, and it checks status 200 and the cloud scope note. It
        checks one table with four columns, a row group for each area, a
        row for each feature, and the fields of a few rows. It does not
        restate each status.
  - [ ] See the focused case fail before the page exists. Run
        `npm run test -- worker/marketing src/marketing`. Then run the case
        10 times, and record the pass count.
- [ ] Add `src/marketing/pages/from-conductor.astro` on `SiteLayout`, with
      the title and the description of the copy. Share each part that the
      home page also draws, such as the closing call.
  - [ ] Give each area a `tbody` and a merged `th` with `rowspan` and
        `scope="rowgroup"`. Give each feature a row `th`, and each due date
        a `time` element.
  - [ ] Use the responsive static table design call: desktop merged headers
        and phone-only Area cells, with CSS-only visibility. Check table
        roles and header associations in both layouts. Do not render two tables.
- [ ] Add the styles in the cascade order of `Document.astro`, with the
      `--ui-*` tokens. Add no inline `style` attribute and no accent edge.
- [ ] Keep the icon shapes and mockup maps green after any UI refinement.
      Run the mockup check and early checks before this milestone commits.
- [ ] Add the home link to `src/marketing/pages/index.astro` and the footer
      link to `src/marketing/components/SiteFooter.astro`.
- [ ] Smoke-test with `npm run build` and `npm run preview`, as the
      marketing README says. `npm run dev` cannot serve built pages yet,
      as `plans/follow-ups/development-built-site-unavailable.md` says.
      Open both links. Compare the page with the mockup in both schemes at
      320, 390, 430, 760, 1024, and 1440 px. Check the keyboard order and
      the accessibility tree of the table.
- [ ] Update `src/marketing/README.md`: the pages, the mockups, and
      `### Key code`. Run mockup and early checks before the checkpoint.
      Commit the milestone.

Evidence: the test runs, the screenshots, and the smoke-test notes go in
`.context/conductor-parity/checks/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

The branch takes the latest `main`, checks the statuses again, and opens
its pull request. Agent merges are off. Only the user merges and deploys.

- [ ] Merge `origin/main` with the `git-merge` skill. Keep the merged
      waitlist/access flow and workspace link functionality. No agent other
      than the orchestrator fetches or merges shared Git refs.
- [ ] Check each status again against the merged `main`. Update each row
      whose evidence changed, and the check date.
- [ ] Run `npm --prefix desktop ci`, `npm ci --prefix runner`, the targeted
      tests, and the complete gate, `npm run check`.
- [ ] Run the deletion audit of the `git-commit` skill. Commit with
      Conventional Commits, and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Add to its focus: the
      claims match the evidence in `.context/conductor-parity/full-data/`,
      with no example date, provider name, or script. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record follow-up
      items under `plans/follow-ups/` for the rest, re-review once, and
      report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan". Merge the post-merge task into
      `plans/follow-ups/marketing-site-deployed-smoke-test.md`.
- [ ] Open the pull request with `gh pr create --base main`. Give the dated
      decisions, the design calls, and a permalink to this plan. Give the
      removed layouts with Cal's approval, the deleted fixture, and the new
      follow-up items.
  - [ ] Watch CI with `scripts/ci-wait.sh` of the `finish-work` skill. Act
        on each failure as that skill says. Do not merge or deploy.
  - [ ] Give the final report of the `finish-work` skill, with the run
        time of each added test.

Evidence: the gate log goes in `.context/conductor-parity/checks/`, and
the reviews in `.context/reviews/calummoore/conductor-feature-parity-list/`.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, open `https://conductive.build/from-conductor` and
      the two links to it. Check status 200, no script, and the headers
      that `plans/follow-ups/marketing-site-deployed-smoke-test.md` lists.

Plan-check evidence: `.context/conductor-parity/plan-check-report.md`.
The 3ce7b65a main integration is recorded in
`.context/conductor-parity/access-sync.json`.
