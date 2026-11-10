# Check time and row links on the comparison page

Status: Active. On branch `calummoore/from-conductor-timestamp-and-links`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The comparison page at `conductive.build/from-conductor` lists about 170
Conductor Cloud features and the status of each in Conductive. Its top
gives the day of the last full check of the rows, as the last sentence of
a grey paragraph, and no link can point at one row. On 9 November 2026,
Cal asked for "a date/time last updated" on the page, and for a subtle way
"to copy a link to a specific item/row".

This change shows the date and the time of the last full check on its own
line. It gives each row an address and a quiet link icon. The page still
runs no script. The change does not change a row, a status, or a note.

Contract owners:

- [Conductor Cloud comparison](../docs/protocol/conductor-cloud-comparison.md).
- The [marketing site README](../src/marketing/README.md).
- The mockup notes in [the marketing site mockups](../docs/mockups/marketing-site.md)
  and in [the From Conductor page](../docs/mockups/src/entries/marketing/from-conductor/index.md).

Replaced ways:

- The check day `parityCheckedOn`, a day as `YYYY-MM-DD` in the shared
  sentence `checked` → the check time `parityCheckedAt`, a day and a time
  in UTC as `YYYY-MM-DDTHH:MMZ`, in the shared line `lastCheck`.
  Consumers: the mockup intro, moved in Milestone 1. The README rule and
  the protocol requirement, moved in Milestone 2. The site intro, moved in
  Milestone 3. Deleted in Milestone 3.

## Decisions

### 1. The page gives no time of its last check

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/marketing/from-conductor/features.ts`, `src/marketing/components/ParityIntro.astro`, `docs/protocol/conductor-cloud-comparison.md` under "Scope".
- **Background:** The protocol doc requires the page to show the day of the last full check of its rows. The check day holds no time. It is the last sentence of a grey paragraph.
- **Problem:** The page gives no time, and its day is easy to miss. A visitor cannot see how current the list is.
- **Impact if no action:** A visitor cannot judge how far to trust a status when they plan a move from Conductor Cloud.
- **Root question:** How does a visitor tell how current the list is?
- **Options:**
  - **A.** The check day becomes a date and a time in UTC. The agent or the routine that checks every row sets it, as now. The page shows "Last checked 9 November 2026 at 19:17 UTC" on its own line. A row change between two checks does not move it. If an agent forgets to set it, it goes stale. Effort: Small.
  - **B.** At build, the site reads from Git the time of the last commit that changed the content of the page. The page shows "Last updated" and that time. The deploy job must fetch the full Git history, and the mockup needs the value at build. A check that changes no row does not move it. Effort: Medium.
  - **C.** Each row keeps the day of its last change, and the top shows the newest day. Each row change must set its day, so 164 days need upkeep. The table gets more marks. Effort: Medium.
  - **D.** The check line gives both times: "Last checked" as in A, and "Last changed" as in B. It has the build and deploy work of B. In a clone without history, the build warns and leaves out "Last changed". A visitor reads two times, and a change of wording also moves "Last changed". Effort: Medium.
  - **E.** A short list of recent row changes under the check line, such as "File tree is now Available", each with its day and a link to its row. Each pull request that changes a status adds an entry, so the row rule in `AGENTS.md` changes too. Parallel branches add entries at the same place and conflict. Effort: Large.
- **Left out:**
  - The build time of the site: it fails the goal, because each deploy moves it, also when no row changes.
  - A change time set by hand that each row change must move: it fails the goal, because an author sets it when a row is edited, not when the row reaches the page. B and D also avoid conflicts on its one line.
  - The time of each request, in the Worker: it only adds an age, such as "3 days ago", to the moment that an option picks.
- **Wider fix:** None. This is a new feature, not a class of defect.
- **Previous examples:** Pull request #129 (`8999b4b`) added the check day with the page.
- **Recommendation:** A. "Last checked" stays true after each check, also when no row changes, and it needs no change to the build or the deploy. The options check recommended D, because feature pull requests change rows between two checks. A stays the recommendation, because the request asks for one date and time, and D adds the build and deploy work of B. D can come later without rework.
- **Action:** ask the user, because each option changes a protocol requirement, and A and B say different things.
- **Decision:** A. Cal chose it on 9 November 2026: "1 = A", before the options check added D and E. Cal gave no other reason.

### 2. No link can point at one row

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/marketing/components/ParityTable.astro`, `docs/protocol/conductor-cloud-comparison.md` under "The page".
- **Terms:**
  - **No-script rule:** the protocol doc says that the page runs no script. The security policy of the site blocks every script, and the built-site test fails on a script tag.
- **Background:** Each row has a unique id in its data, such as `file-tree`. The rows in the HTML have no id.
- **Problem:** A visitor cannot share one row. A shared link always opens the top of the page.
- **Impact if no action:** A visitor must share the whole page and name the row in words.
- **Root question:** How does a visitor copy a link that leads to one feature of the list?
- **Options:**
  - **A.** Each row gets its id in the HTML. A small link icon beside the feature name links to the address of the row, such as `/from-conductor#file-tree`. A visitor copies it with the menu of the browser, or from the address bar after a click. The opened row gets a quiet fill. There is no one-click copy and no "Copied" message. Effort: Small.
  - **B.** A, plus a small script: a click copies the address of the row and shows "Link copied" for a moment. Without the script, the icon works as in A. This is the first script of the site. It changes the no-script rule, the security policy of the page, the README, and the test. Effort: Medium.
  - **C.** The feature name links to the address of its own row, with no icon. Names that look like links suggest another page. Names that look like plain text are hard to find. Effort: Small.
  - **D.** Each feature gets a page of its own at `/from-conductor/<id>`, built from the shared rows by one template. The page shows the area, the status, the due date, and the note, with its own title, and links back to its row. The link icon of each row leads to it, so a chat app shows the feature in the preview of a shared link. Cost: 164 short pages, a new mockup screen, and a new protocol section. A visitor sees one row without the rows around it. Effort: Large.
- **Left out:**
  - A link for each area: it fails the goal of a link to one row.
  - The browser's "Copy link to highlight" alone: it fails the goal, because the page shows no control.
  - A share button that opens the system share sheet: it is B with another call in the same script, not a distinct approach.
  - A Worker path that redirects to the row, such as `/from-conductor/file-tree`: a chat app follows the redirect and shows the whole page, so it gives nothing over A.
- **Wider fix:** None. This is a new feature, not a class of defect.
- **Previous examples:** The home page gives its features section an id, and the site header links to it.
- **Recommendation:** A. It gives each row a lasting address and a quiet control, and the page stays free of scripts. B can add one-click copy later, and D can add a page for each feature, on the same ids. The options check also recommended A.
- **Action:** ask the user, because B gives the one-click copy that the request names, but it reverses the no-script rule.
- **Decision:** A. Cal chose it on 9 November 2026: "2 = A", before the options check added D. Cal gave no other reason.

The options check of both decisions ran on 10 November 2026. Its report is
`.context/from-conductor-check-time-and-row-links/options-check.md`.

## Design

These are agent calls of 10 November 2026.

| Call | Reason |
| --- | --- |
| **UTC.** The check time shows in UTC on the 24-hour clock, with "UTC" in the words: "9 November 2026 at 19:17 UTC". The `time` element holds the value. | Without a script, the page cannot read the time zone of the visitor. The site already gives each day in UTC. |
| **The check line.** It is the last line of the top of the page, after the days of Conductor Cloud, in the quiet type of that paragraph: "Last checked 9 November 2026 at 19:17 UTC". | Its own line makes it easy to find, and its place keeps the reading order of the top. |
| **The first check time.** `2026-11-09T19:17Z`: the time of commit `0f65e84` on the branch of pull request #129. That commit recorded the checked rows and the current check day. A full check that merges before this change replaces it. | The repository records no other time of that check. The squash merge at 21:29 UTC came after later product merges that the check did not cover. |
| **A row address.** The id of the row, as in `/from-conductor#file-tree`. The row element holds the id. A row keeps its id, and every id of the page is unique. | The README already says to keep each id. Short, readable addresses survive a change of a name. |
| **The link icon.** The lucide `link` icon, 14 px, after the name in the row header, in the muted colour. On a device that can hover, it shows while the pointer is over the row, while the link has the keyboard focus, and on the opened row. On a device without hover, it always shows. In the phone layout, its touch area grows to the touch size of the site without moving the text. | It stays quiet until a visitor looks for it, as the request asks. A phone has no hover. The site gives each phone touch target 44 px. |
| **Accessible names.** The link is named "Link to" and the name of the feature, such as "Link to File tree". The row header keeps the name of the feature as its only accessible name. | A header cell names every cell of its row, so extra words there repeat for each cell. A link name must say where it leads. |
| **The opened row.** Its cells get a quiet fill, except the merged Area cell. It keeps a small gap above it when the page scrolls to it. No coloured edge. | The visitor sees which row the link meant. The `product-ui` skill forbids an accent edge. |
| **Shared content first.** Milestone 1 adds the check time, its words, the name of a row link, and the `link` icon to the shared modules. The site keeps the check day until Milestone 3. | The mockup reads the modules of the site and has no copy of its own content. Additions keep the site working. |
| **Parallel work.** This change does not edit the row files or `statuses.ts`. | The "align from-conductor page #1" workspace edits them now. Only `features.ts` can conflict, on one line. |
| **Tests.** One unit test for the words of a time. The built-site case of the page checks the check line, the id and the link of each row, the row headers, and unique ids. The build setup of `built-site.test.ts` moves to a test support module, so that the file stays under 300 lines and the site still builds once. A one-time check in Chrome covers hover, focus, the opened row, and the accessibility tree. | Each requirement gets one test at the lowest level. The test file has 294 lines. A second test file would build the site twice. The repository has no browser test harness for the site, and a new one is out of scope. |
| **Delegation.** The milestones run one after the other in this workspace. Mockup and UI work runs as the `ui implementor`, docs as the `docs implementor`, and tests as the `non-ui implementor`. | The milestones depend on each other and touch few files. |

These are agent calls of 10 November 2026, from the mockups of
Milestone 1.

| Call | Reason |
| --- | --- |
| **The fill.** The opened row uses `--ui-selected`, the colour of a selected row. On a computer, the fill is square between two hairlines. On a phone, it is one block with rounded corners that covers the whole row and its hairlines. | All text on it keeps at least 5.1 to 1, and each status icon at least 3.8 to 1, in both schemes. Against the page, the fill is only 1.23 to 1 in light and 1.17 to 1 in dark, so it stays quiet. |
| **Space inside the fill.** On a computer, the name and the note keep 10 px from the ends of the fill. So every name, and the title of its column, sits 10 px further right than before. On a phone, the fill reaches 10 px past the text, and the text does not move. | Without that space, the fill touched the text. |
| **The icon stays with the name.** A `nowrap` span holds a no-break space and the link. | In Chrome, a no-break space alone still let the icon wrap alone onto a new line. |
| **Hover only over the cells of the feature.** The icon shows when the pointer is over the name, the status, or the note of its row, not over the merged Area cell. | The merged Area cell belongs to the first row of its area, so a pointer over it showed the link of that row only. |
| **The hidden link.** At rest, the icon has no opacity and no fade. It keeps the 2 px focus ring of the other links of the site, 3 px from the name. Under the pointer, it takes the ink colour. | The keyboard and screen readers still reach a link with no opacity. The ring touched the last letter of the name without the gap. |
| **The words of a time.** `timeWords` formats only a value of the form `YYYY-MM-DDTHH:MMZ`. Any other value shows as it is. | A time without `Z` would read as local time and show a wrong time labelled UTC. Showing the value as it is fails no build. |
| **No area name for a lower opened row.** When the opened row is not the first of its area, the name of the area stays above the window on a computer. The page does not change for this. | The opened row names the feature, and the feature is what the link points at. A sticky area name or a second label would change the page for every visitor. |

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockup `marketing/from-conductor/one-table` shows the check line on
its own line and the link of each row, at both sizes and in both colour
schemes.

- [x] Add the shared content that the mockup shows:
  - [x] `parityCheckedAt` in `features.ts`, from the design call.
  - [x] `timeWords` in `dates.ts`: the words of a time in UTC.
  - [x] `lastCheck` in `copy.ts`, with the label "Last checked" and the
        check time, and the name of a row link.
  - [x] The lucide `link` icon in `icon-shapes.ts` and in the mockup map
        `siteIcons.ts`.
- [x] Show the check line on its own line in the mockup intro. The facts
      paragraph keeps only the days of Conductor Cloud.
- [x] Give each mockup row its id and its link icon, with the hover,
      focus, opened, and phone states of the design. The link uses
      `ScreenLink` with the row id as its fragment.
- [x] Update the description and the rationale of the mockup entry, the
      From Conductor `index.md`, and `docs/mockups/marketing-site.md`.
- [x] Run `npm run mockups:check`. Smoke-test the page at both sizes, in
      both schemes, and with the address of a row.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/from-conductor-check-time-and-row-links/m1/` and
`.context/from-conductor-check-time-and-row-links/m1-verify/`.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol doc and the README state the requirements and the decisions
of this change.

- [ ] Update `docs/protocol/conductor-cloud-comparison.md`:
  - [ ] The check time: its date and time in UTC, on its own line at the
        top, with decision 1 and its reason.
  - [ ] Row links: the address of each row, the lasting id, when the
        icon shows, how a visitor copies the address, the opened row,
        and an unknown id, with decision 2 and its reason.
  - [ ] Accessibility: the name of each row link, and the row header
        that reads only the name of its feature.
- [ ] Update `src/marketing/README.md`: the rule for the check time, the
      id as the address of a row, and the key code of `features.ts`,
      `dates.ts`, and `copy.ts`.
- [ ] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.

## Milestone 3: Site

Tags: ui

Depends on: 2

The page shows the check line and the row links of the mockup.

- [ ] Show the check line on its own line in `ParityIntro.astro`. The
      facts paragraph keeps only the days of Conductor Cloud.
- [ ] Delete `parityCheckedOn` and the shared sentence `checked`.
- [ ] Give each row of `ParityTable.astro` its id, its link icon, the
      name of the link, and the name of the row header. Keep the icon in
      a `nowrap` span with a no-break space, as `FeatureCells.tsx` does.
- [ ] Style the check line, the states of the link, and the opened row in
      `comparison.css` and `comparison-table.css`, as
      `parityRows.module.css` and `ParityIntro.module.css` do. The mockup
      sets `.mobile` for both phone rules. The site splits them: the
      touch area and the rounded fill follow the phone width, and the
      icon that always shows follows `(hover: none)`.
- [ ] Move the build setup of `built-site.test.ts` to a test support
      module, with every assertion kept.
- [ ] Add the tests of the design call. See each new assertion fail
      first. Run each new test 10 times.
- [ ] Smoke-test in Chrome at 320, 390, 760, 1024, and 1440 px, in both
      schemes: hover, keyboard focus, a row address, an unknown id, and
      the accessibility tree. Save the evidence under
      `.context/from-conductor-check-time-and-row-links/`. Headless Chrome
      reports no hover. For the hover state, start it with
      `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Merge `origin/main` with the `git-merge` skill. When a full check
      of the rows merged first, use its time as the check time.
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

- [ ] After the deploy, open `https://conductive.build/from-conductor#file-tree`
      on a computer and a phone. Check the check line, the opened row,
      and the link icon. Add this to
      `plans/follow-ups/marketing-site-deployed-smoke-test.md`.
