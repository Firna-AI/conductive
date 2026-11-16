# Preview in a centre tab

Status: Active. On branch `calummoore/seoul-m0i6`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Preview tool shows the previewed page in a frame inside the small tools
panel of the right column. The panel is too small to use the page. On
desktop, each previewed port gets its own Preview tab in the centre tab
row, beside the session, file, and diff tabs. A bar over the page in that
tab holds Reload and Open. The tool in the panel has no bar on desktop. It
lists the ports, and a click on a port shows its tab, or opens one. A
preview ends by itself after a time without use, and the app opens a new
one without notice the next time the user shows its tab. A phone has no
centre tab row, so its Preview page keeps its bar and its frame as today.

The change does not cover a change to the preview access rules.

Contract owners:

- [Port previews](../docs/protocol/port-previews.md).
- [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row).
- [Stop and resume](../docs/protocol/workspace-life.md#stop-and-resume).
- [Access and security of port previews](../docs/protocol/terminal-previews-and-desktop.md#port-previews).
- The [previews README](../src/previews/README.md),
  the [workspace screen parts](../src/shell/workspace/screen-parts.md), and
  the [preview proxy README](../worker/previews/README.md).

## Decisions

Cal answered each decision on the day that it was asked. The protocol docs
number them from 288. Another open branch can take the same numbers first.
Check the numbers on `main` before the merge.

### 288. One centre tab per preview, or one shared tab

- **Asked:** 13 November 2026.
- **Choice:** First A, one shared Preview tab. Cal changed it on 16 November
  2026 with the answer to item 291: each port has its own centre tab, so
  the row can show more than one.
- **Alternatives:** B, one centre tab for each preview, was the first
  recommendation. A tab only on request was left out.
- **Reason:** A tab is a place that a preview loads into. The tool opens
  many ports at the same time.

### 289. What Close on the centre tab does

- **Asked:** 13 November 2026.
- **Choice:** A. Close removes only the centre tab, and ends no preview.
- **Alternatives:** B, Close ends the preview. No Close was left out.
- **Reason:** A tab is a view of the preview. Item 292 later made the end
  of a preview automatic.

### 290. What the tool shows

- **Asked:** 13 November 2026.
- **Choice:** The tool always shows its normal view: the list of ports,
  where a click on each port opens it.
- **Alternatives:** A line that names the centre tab, with Show tab. The
  port form with "+" kept.
- **Reason:** The tool stays useful as the list of ports.

### Request of 13 November 2026: a bar in the Preview tab

- **Choice:** Cal asked to remove the bar of the tool on desktop: the tabs
  of the open previews, Reload, and Open. Reload and Open move to a bar of
  the centre Preview tab. Only the Preview tab has this bar.
- **Reason:** The tool bar is not needed when the page lives in the centre.

### 291. How the user switches between open previews on desktop

- **Asked:** 13 November 2026. **Answered:** 16 November 2026.
- **Choice:** Each port has its own centre tab. A click on a port in the
  tool focuses its tab when it has one, and else opens a tab for it. So the
  tool opens many ports at the same time, and the centre row switches
  between them.
- **Alternatives:** A, an "Open previews" group in the tool. B, one list of
  ports, with one shared tab. C, a menu in the centre bar. D, the preview
  tabs in the centre bar. The options check added D.
- **Reason:** Cal's answer. A tab is "just a tab that gets loaded".

### 292. How the user ends a preview on desktop

- **Asked:** 13 November 2026. **Answered:** 16 November 2026.
- **Choice:** The user does not end a preview. A preview ends by itself
  after a time without use. A preview never keeps the cloud computer
  running. No screen shows the time left. When a preview has ended, the app
  opens a new one without notice the next time the user shows its tab or
  clicks its port.
- **Alternatives:** A, Close on each port of the tool. B, Close preview in
  the centre bar. C, no control, with the 24-hour end of today. D, Close on
  tabs in the centre bar. E, End preview in the tab menu. The options check
  added D and E.
- **Reason:** Cal's answer. The app reopens a preview at no cost to the
  user, so an end needs no control and no notice.

### 293. Whether use of a preview keeps the cloud computer running

Open. Asked on 16 November 2026.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/previews/proxy.ts:103`
- **Background:** A cloud computer stops after 30 minutes without user
  activity and without an agent turn, as
  [Stop and resume](../docs/protocol/workspace-life.md#stop-and-resume)
  says. A stop ends every process, also the dev server, and every preview.
  Today each request and each socket handshake of a preview counts as
  activity. Cal wrote that previews "should never keep the cloud computer
  alive/awake".
- **Problem:** To the server, a request from the user's click looks the
  same as a request from a page that polls by itself. A page that polls
  keeps the computer running for up to 24 hours. Kept pages of hidden tabs
  make this worse.
- **Impact if no action:** A forgotten page can keep a computer running
  for a day.
- **Root question:** How does the app tell the user's own work in a
  preview from a page that runs by itself, so that only the user's work
  keeps the computer running?
- **Options:**
  - **A.** No preview request counts. The computer stops 30 minutes after
    the last other input, also while the user clicks through the page. The
    stop ends the dev server and the preview, with its cookies. Effort:
    Small.
  - **B.** Only a page load that the user starts counts: a request with
    `Sec-Fetch-User: ?1`. A click in a single-page app that loads no page
    does not count. Effort: Small.
  - **C.** Keep today: each request and each handshake counts. A page that
    polls keeps the computer running. Effort: Small.
  - **D.** Count the user's input in the preview, not its traffic. The
    browser tells the app page when the user clicks or types in a frame.
    The app counts that as its own input, as it counts terminal keys. In a
    separate browser tab, B's rule applies. The browsers must be checked
    for this signal. Scrolling alone does not count. Effort: Medium. Added
    by the options check.
  - **E.** A, and the app warns a few minutes before an idle stop, with
    Keep running. It adds a notice to every workspace. Effort: Large.
    Added by the options check.
- **Left out:** A report from the app while a page shows. An open tab
  alone is not activity, by the rule of Stop and resume.
- **Wider fix:** E. It covers all quiet work that the app cannot see.
- **Previous examples:** The terminal counts the user's keys, not its
  socket frames.
- **Recommendation:** D. Only the user's own clicks and keys in a preview
  keep the computer running, and no page keeps it running by itself. If
  the browser check fails, use B. The first recommendation was A.
- **Action:** ask the user, because the options have real trade-offs and
  the words "never keep the cloud computer awake" fit A and D.

### 294. Whether a preview has its own end before the computer stops

Open. Asked on 16 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/previews/actions.ts:88`
- **Background:** Today a preview ends at a stop of the computer, after 24
  hours, or when a user or an agent closes it. Cal chose an end after a
  time without use, with no notice (item 292). A new preview gets a new
  address. So a reopen loads the page again and loses the cookies, the
  storage, and the sign-in of the previewed app.
- **Problem:** No rule says whether a preview needs its own clock, or what
  use keeps it open.
- **Impact if no action:** Previews end only at a stop, after 24 hours, or
  by an agent. That is option D.
- **Root question:** Does a preview need its own end before the computer
  stops? If it does, what use keeps it open?
- **Options:**
  - **A.** Each request and each handshake through the preview resets a
    clock of 30 minutes. A user who reads one page for 30 minutes finds a
    dead page. A hidden page that polls keeps its preview. Effort: Medium.
  - **B.** A, and the app also reports while the tab of the preview shows.
    The report keeps only the preview open, not the computer. Effort:
    Large.
  - **C.** A, and each socket message counts too. Effort: Medium.
  - **D.** No clock for each preview. A preview ends when the computer
    stops, after 24 hours, or when an agent closes it. The stop already
    follows 30 minutes without use, so the preview ends after a time
    without use. Only docs change. With 293 C, a page that polls keeps
    both running. Effort: Small. Added by the options check.
  - **E.** One address for each port of a workspace, kept across reopens.
    A reopen keeps the cookies and the sign-in of the previewed app. It
    changes an access rule. Effort: Large. Added by the options check.
- **Left out:** A plain 30 minutes with no use signal. It ends pages in use.
- **Wider fix:** E. It removes the main cost of every end, also of the end
  at a stop. It is out of the scope of this change.
- **Previous examples:** None found.
- **Related:** Item 293. D fits 293 A, B, D, and E, not 293 C.
- **Recommendation:** D. It meets item 292 through the stop, needs no new
  code, and never reloads a page in use while the computer runs. The first
  recommendation was B.
- **Action:** ask the user, because the options have real trade-offs and
  the answer depends on item 293.

## Design

Design calls are mine, dated 16 November 2026, unless a decision above
covers them.

- **Saved tabs.** The workspace view gets a new tab kind,
  `{ kind: 'preview'; port: number }`. A tab names a port, not a preview,
  because a preview ends and a new one takes its place. The key of the tab
  is `preview:<port>`, so a port has at most one tab. The server keeps the
  tabs for each member, so they stay after a reload and on the other
  devices of the member. The Worker accepts the new kind with a port from 1
  to 65535. It rejects nothing that it accepts today. My call.
- **Addresses.** `preview/<port>` names a port, on desktop and on a phone.
  On desktop it shows the centre tab of that port and saves it as open and
  active, as a file address does. On a phone it shows the Preview page with
  that port. `preview` alone shows the tool. My call.
- **The tool on desktop.** The tool has no bar, no frame, and no "+". It
  lists each port: each server of the report, then each port with a tab or
  an open preview that the report does not name, as `Port 8080`. The Other
  port field stays. The row of the port whose tab shows is the current one.
  My call for the list.
- **A click on a port.** A port with a tab shows its tab. Else a new tab
  opens at the end of the row and shows. The tab uses an open preview of
  the port when one exists, and else the app opens one (decision 291).
- **A preview for a tab.** When a tab shows and its port has no open
  preview, the app opens one and loads it, with no notice (decision 292).
  A show is a click on the tab or on its port, a visit to its address, or
  Reload. Two open previews of one port, such as one that an agent opened,
  use the oldest. My call for the oldest.
- **A stopped computer.** A show of a preview tab resumes a stopped
  computer, as the show of a file tab does (decision 247), and then opens
  the preview. While the computer does not run, the tab shows the state of
  the computer in place of the bar and the page. My call.
- **Reload and Open.** A bar over the page of each Preview tab holds Reload
  and Open at its end. Reload loads the page again, and first opens a new
  preview when the old one ended. Open opens the launch page in a new
  browser tab. My call for the place.
- **Kept pages.** The frame of each Preview tab mounts at its first show,
  and stays mounted and hidden while another tab shows. So a page does not
  load again on return while its preview lives. My call.
- **Tab label.** A tab shows the label of its port, such as
  `3000 next dev`, after a globe icon. Its tooltip and its accessible name
  give the full name and the folder. The tab moves by drag and by its tab
  menu, as a file tab does.
- **Close.** Close on a Preview tab removes the tab and ends no preview
  (decision 289). The preview ends by itself later. When the tab shows,
  the next tab of the row shows after the close. The key of Close tab does
  the same.
- **The phone.** A phone keeps its Preview page as today: the bar with the
  tabs, "+", Reload, Open, and the frame. A tab there shows a port. Close on
  a phone tab ends the preview, as today. My call.
- **Archived.** An archived workspace shows no Preview tab.
- **Frame rules.** The centre frame keeps the sandbox flags, the referrer
  rules, and the launch address of the frame of today. The access rules of
  previews do not change.
- **The 24-hour limit.** A preview still ends 24 hours after it opened, as
  the access rules say, and the app opens a new one at the next show. My
  call.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Summary: the workspace screen on desktop shows the Preview tab in the
centre row with the page, and the panel with its preview tabs and the port
form. The phone Preview page does not change.

- [x] Add the Preview tab kind to the centre tab row of the mockups, with
      its globe icon, label, tooltip, Close, and tab menu.
- [x] Show the page of the preview in the centre when that tab shows.
- [x] Change the desktop Preview panel states: tabs, Reload, and Open, then
      the port form. Remove "+" on desktop only. Keep the phone states.
- [x] Add a mockup state with the centre Preview tab shown, and one with a
      session shown while the Preview tab stays in the row.
- [x] Record decisions 288, 289, and 290 in the rationale of the changed
      mockup pages.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
      Screenshots: `.context/preview-centre-tab/shots/`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Mockups of the Preview tab bar

Tags: mockup

Depends on: 1

Summary: Cal asked on 13 November 2026 to remove the bar of the tool on
desktop, and to move Reload and Open to a bar of the centre Preview tab.

- [x] Add a bar with Reload and Open over the page of the centre Preview
      tab. Hide it while the sandbox does not run.
- [x] Remove the bar of the tool on desktop. Keep the phone bar.
- [x] Update the notes of the changed pages and the catalogue.
- [x] Draw a Preview tab for each port in the centre row: two tabs, ports
      3000 and 6006, with the tab of 3000 shown.
- [x] Draw the desktop tool as the list of each port, with the row of the
      shown tab as the current one. Remove the Close of the tool on
      desktop.
- [x] Update the notes of the changed pages for decisions 291 and 292.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
      Screenshots: `.context/preview-centre-tab/shots/ports_*.png`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 3: Documentation and protocol

Depends on: 2, and the answers to items 293 and 294

Summary: the docs state the Preview tabs, the tool list, the end of a
preview, and the activity rule.

- [ ] Update `docs/protocol/port-previews.md`: a centre tab for each port
      (decisions 288 and 291), Close of a tab ends no preview (decision
      289), the tool list (decision 290), the bar of the tab (the request),
      and the end and the reopen of a preview (decision 292). The phone
      keeps its frame.
- [ ] Update [Stop and resume](../docs/protocol/workspace-life.md#stop-and-resume)
      with the answer to item 293.
- [ ] Update the revoke rules in
      `docs/protocol/terminal-previews-and-desktop.md` with the answer to
      item 294.
- [ ] Update [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row):
      the row also holds Preview tabs.
- [ ] Check `docs/protocol/desktop-app.md`,
      `docs/protocol/section-and-preview-calls.md`, and the architecture docs
      for sentences on the frame in the panel, on the 24-hour end, and on
      Close. Update each one.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update
      `terminal-and-previews.md`: the tabs and their bar, the tool list,
      the end of a preview, and "+" on a phone only.
- [ ] Check the rows of `src/marketing/from-conductor/` that name previews.
      Update a status or a note that the change makes wrong.
- [ ] Update `src/previews/README.md`, `src/shell/workspace/screen-parts.md`,
      `src/shared/README.md`, and `worker/previews/README.md`.

## Milestone 4: Saved Preview tabs

Depends on: 3

Summary: the shared type and the Worker accept Preview tabs. No screen
shows them yet.

- [ ] Add `{ kind: 'preview'; port: number }` to `WorkspaceTab` in
      `src/shared/workspace-view.ts`.
- [ ] Accept the kind in `viewTab` of `worker/app-api/workspace-view.ts`,
      with a port from 1 to 65535, with a test of a save and a read.
- [ ] Give the kind its key `preview:<port>` in
      `src/chat/state/tab-order.ts`, and handle it in each `switch` over the
      tab kinds, such as `equalTabs` of `view-tabs.ts`. Add tests.
- [ ] Run `npm run typecheck` and the targeted tests.

## Milestone 5: The end of a preview

Depends on: 3

Summary: a preview ends by itself after a time without use, and its use
follows the activity rule of item 293.

- [ ] Change the activity report of `worker/previews/access.ts` to the
      answer to item 293, with tests.
- [ ] End a preview after the time without use of item 294, through the
      alarm of the workspace object, with its `preview.revoked` event.
      Keep the 24-hour limit. Add tests.
- [ ] When item 294 is B, add the report of a shown tab: a route that only
      a viewer of the workspace may call, which resets the clock of one
      preview. Add tests of its access.
- [ ] Run `npm run typecheck` and the targeted tests.

## Milestone 6: Preview tabs and the tool

Tags: ui

Depends on: 4 and 5

Summary: the desktop screen shows a Preview tab for each port, and the tool
lists the ports.

- [ ] Move the previews store to the workspace screen, so the tool and the
      tabs read one store. Keep its connection rules.
- [ ] Draw each Preview tab in the centre row through `renderTab`, with its
      label, tooltip, Close, and the key of Close tab.
- [ ] Draw the bar of a Preview tab with Reload and Open.
- [ ] Show the frame of a tab at `preview/<port>`, kept mounted while
      hidden. Save the tab as open and active on a visit.
- [ ] Open a preview for a shown tab whose port has none, with no notice.
      Use the oldest open preview of a port.
- [ ] Resume a stopped computer at the show of a tab. Show the state of the
      computer in place of the bar and the page while it does not run. Show
      no Preview tab in an archived workspace.
- [ ] Change the desktop tool: the list of each port, with no bar, no
      frame, no "+", and no Close. Keep the phone Preview page as today.
- [ ] When item 294 is B, report the shown tab while its window has the
      focus.
- [ ] Add DOM and wiring tests: a click on a port with and without a tab,
      Reload and Open, Close of a tab, a revoke and the reopen at the next
      show, a session click, and the phone page.
- [ ] Check the screen in a browser with `npm run dev`. Save screenshots
      under `.context/preview-centre-tab/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      complete gate, `npm run check`.
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
