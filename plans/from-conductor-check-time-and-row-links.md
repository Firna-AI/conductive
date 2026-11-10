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
runs no script.

On 10 November 2026, Cal also asked to list the features of local Conductor
workspaces, to remove the note that the list covers Conductor Cloud only,
and to say "Conductor" instead of "Conductor Cloud". So this change also
adds rows, and it renames the page and its links. It does not change the
status or the note of an existing row.

Contract owners:

- [Conductor comparison](../docs/protocol/conductor-comparison.md).
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
- The scope note `parityPageCopy.scope` → no note. Consumers: the mockup
  intro, moved in Milestone 1a. The protocol requirement, moved in
  Milestone 2. The site intro and the built-site test, moved in
  Milestone 3. Deleted in Milestone 3.

## Decisions

### 1. The page gives no time of its last check

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/marketing/from-conductor/features.ts`, `src/marketing/components/ParityIntro.astro`, `docs/protocol/conductor-comparison.md` under "The check time".
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
- **Location:** `src/marketing/components/ParityTable.astro`, `docs/protocol/conductor-comparison.md` under "Row links".
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

### 3. The list leaves out local Conductor features

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/marketing/from-conductor/`, `docs/protocol/conductor-comparison.md` under "Scope".
- **Background:** The page lists Conductor Cloud features only, and a note at its top says so. The protocol doc records that scope, because Conductive replaces Conductor Cloud.
- **Problem:** A visitor who uses local Conductor workspaces on a Mac finds none of their features in the list.
- **Impact if no action:** That visitor cannot compare Conductor with Conductive.
- **Root question:** Which Conductor features does the list cover?
- **Options:**
  - **A.** Every Conductor feature, local and cloud, in one list, with no scope note. Effort: Medium.
  - **B.** Conductor Cloud features only, with the note. This was the decision in force. Effort: Small.
  - **C.** Two lists, one for each kind of Conductor user. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None. This is a change of scope, not a class of defect.
- **Previous examples:** Pull request #129 chose B on 9 November 2026.
- **Recommendation:** A, as Cal asked.
- **Action:** ask the user, because A reverses a decision in force.
- **Decision:** A. Cal chose it on 10 November 2026: "instead lets just add those non-cloud items to the list of feature comparison". Cal gave no other reason. No options check ran, because Cal chose the approach directly.

### 4. The page names Conductor Cloud

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `src/marketing/from-conductor/copy.ts`.
- **Background:** The title, the label, the lead, a column, the last call to action, and the two entry links of the page say "Conductor Cloud".
- **Problem:** With local features in the list, the page covers all of Conductor, not only its cloud.
- **Impact if no action:** The words of the page contradict its rows.
- **Root question:** Which name does the page give to the product that visitors come from?
- **Options:**
  - **A.** "Conductor" in each place. Effort: Small.
  - **B.** "Conductor Cloud", as before. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A, as Cal asked.
- **Action:** ask the user, because it changes the words of a public page.
- **Decision:** A. Cal chose it on 10 November 2026: "remove 'cloud' reference everywhere - just say 'Conductor' instead of 'Cloud Conductor'". Cal gave no other reason. No options check ran, because Cal chose the approach directly.

### 5. The page shows no progress at a glance

Asked as item 1 on 10 November 2026. It is open. Its options are in
`.context/from-conductor-progress-bar/notes.md`: A, a bar of how far the
visitor has scrolled. B, a progress bar of the features that work today,
which is the recommendation. C, a bar split into the six statuses in the
legend. D, a bar for each area. Until Cal answers, no milestone builds it.

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
| **Parallel work.** This change does not edit `statuses.ts` or an existing row. Milestone 1a adds 26 rows to nine area files. A merge test found no new conflict with a current `align-from-conductor-page` branch. | Routine workspaces edit the rows often. Only additions and `features.ts` can conflict. |
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

These are agent calls of 10 November 2026, for decisions 3 and 4.

| Call | Reason |
| --- | --- |
| **The check time moves.** `parityCheckedAt` becomes `2026-11-10T02:07Z`, the time of commit `552222e9`, which set the check day to 10 November 2026 on `main`. | It is the newest full check on `main`, as the design call "The first check time" says. |
| **The days of the shutdown.** The sentence becomes "Conductor's announcement gives the days of its cloud workspaces: read-only from 13 November 2026, and shut down from 20 November 2026." | The days belong to Conductor's cloud workspaces only. "The days of Conductor" would be false. |
| **Where "Conductor Cloud" stays.** The page, its entry links, and the docs of the page say "Conductor". Developer text that is about the cloud product itself keeps its name, such as the root README, which says that Conductive replaces Conductor Cloud. | Each kept sentence stays true. The page never names Conductor Cloud. |
| **The protocol doc.** It moves to `docs/protocol/conductor-comparison.md`, titled "Conductor comparison". Every link moves with it. | Its name must match its scope. |
| **The source of the new rows.** The local features that the audit of pull request #129 left out, and the public docs and release notes of Conductor, checked against the code of Conductive. The evidence stays under `.context/conductor-local-features/`. | The audit already sorted each release note into local and cloud. The public docs fill the gaps. |
| **Areas.** Each new row joins the area of its job. A new area comes only when no area fits. | One table with the same areas keeps the page easy to scan. |
| **Statuses.** No new row gets Not planned without a decision of Cal. A local feature that Conductive does on a cloud computer gets Works differently. | The claim rules give Not planned only for a standing product decision, and Cal decides those. |
| **The scope note.** The mockup drops it in Milestone 1a. The site keeps it until Milestone 3, which deletes the shared copy. | The mockup reads the shared copy of the site, so the copy can go only when the site stops using it. |

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

## Milestone 1a: Mockups for all Conductor features

Tags: mockup

Depends on: 1

The mockup lists the features of local Conductor workspaces too, says
"Conductor" instead of "Conductor Cloud", and has no scope note.

- [x] Build the list of new rows, with a status and a note for each, from
      the design call "The source of the new rows". Save it as
      `.context/conductor-local-features/proposal.md`.
- [x] Add the new rows to the area files, and a new area to `areas.ts`
      and `features.ts` only when the design call "Areas" allows it.
- [x] Set `parityCheckedAt` from the design call "The check time moves".
- [x] Say "Conductor" instead of "Conductor Cloud" in the shared copy:
      the document title, the description, the label, the title, the
      lead, the feature column, the last call to action, and the two
      entry links. Change the sentence of the shutdown days as the design
      call says. Keep `scope` until Milestone 3.
- [x] Remove the scope note from the mockup intro.
- [x] Update the description and the rationale of the mockup entry, the
      From Conductor `index.md`, `docs/mockups/marketing-site.md`, and
      `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the page at both sizes, in
      both schemes.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/conductor-local-features/` and
`.context/from-conductor-check-time-and-row-links/m1a/`. The rows added
26 features: 1 Available, 12 Works differently, and 13 Under
consideration. Six older notes have three sentences, which the row rules
do not allow. The follow-up item
`plans/follow-ups/comparison-notes-over-two-sentences.md` records them.

## Milestone 2: Documentation and protocol

Depends on: 1. It needs decisions 3 and 4, not the new rows of Milestone 1a.

The protocol doc and the README state the requirements and the decisions
of this change.

- [x] Move `docs/protocol/conductor-cloud-comparison.md` to
      `docs/protocol/conductor-comparison.md`, titled "Conductor
      comparison". Update every link to it, in `AGENTS.md`, the
      READMEs, the architecture docs, the mockup notes, the follow-up
      item of the deployed smoke test, and this plan.
- [x] Update the protocol doc:
  - [x] The scope: every Conductor feature, local and cloud, with no
        scope note, with decision 3 and its reason. The page says
        "Conductor", with decision 4.
  - [x] The check time: its date and time in UTC, on its own line at the
        top, with decision 1 and its reason.
  - [x] Row links: the address of each row, the lasting id, when the
        icon shows, how a visitor copies the address, the opened row,
        and an unknown id, with decision 2 and its reason.
  - [x] Accessibility: the name of each row link, and the row header
        that reads only the name of its feature.
- [x] Update `src/marketing/README.md` and its page
      `src/marketing/comparison.md`: the scope of the rows, the rule for
      the check time, the id as the address of a row, and the key code of
      `features.ts`, `dates.ts`, and `copy.ts`.
- [x] Say "Conductor" for the page in `AGENTS.md`, `README.md`,
      `docs/architecture.md` with its pages `protocol-docs.md` and
      `marketing-site.md`, as the design call "Where Conductor Cloud
      stays" says.
- [x] Read the Terms page, the Privacy page, and each public guide in
      full. Update each sentence that restates a changed fact.

Evidence: `.context/from-conductor-check-time-and-row-links/m2/`.

## Milestone 3: Site

Tags: ui

Depends on: 2

The page shows the check line and the row links of the mockup.

- [x] Show the check line on its own line in `ParityIntro.astro`. The
      facts paragraph keeps only the days of the shutdown. Remove the
      scope note.
- [x] Delete `parityCheckedOn`, the shared sentence `checked`, and the
      shared copy `scope`.
- [x] Say "Conductor" in the comments of the site files of the page.
- [x] Give each row of `ParityTable.astro` its id, its link icon, the
      name of the link, and the name of the row header. Keep the icon in
      a `nowrap` span with a no-break space, as `FeatureCells.tsx` does.
- [x] Style the check line, the states of the link, and the opened row in
      `comparison.css` and `comparison-table.css`, as
      `parityRows.module.css` and `ParityIntro.module.css` do. The mockup
      sets `.mobile` for both phone rules. The site splits them: the
      touch area and the rounded fill follow the phone width, and the
      icon that always shows follows `(hover: none)`.
- [x] Keep `built-site.test.ts` under 300 lines. `main` already moved its
      build setup to `built-site.test-support.ts`. Move the checks of the
      page to their own place when the file would pass the limit, with
      every assertion kept, and build the site once.
- [x] Add the tests of the design call. Move the scope check of the
      built-site test to the new words. See each new assertion fail
      first. Run each new test 10 times.
- [x] Smoke-test in Chrome at 320, 390, 760, 1024, and 1440 px, in both
      schemes: hover, keyboard focus, a row address, an unknown id, and
      the accessibility tree. Save the evidence under
      `.context/from-conductor-check-time-and-row-links/`. Headless Chrome
      reports no hover. For the hover state, start it with
      `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 1a, 2, 3

- [ ] Check four open facts of the new rows before the pull request, and
      fix a row when its fact fails: agents on a production cloud
      computer have a browser (`claude-agent-in-chrome`), Conductor still
      has Codex goals (`codex-goals-and-personalities`), the import of
      local workspaces is still planned (`local-workspaces`), and the web
      app follows the proxy of the browser (`proxy-support`).
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
