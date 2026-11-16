# Preview in a centre tab

Status: Active. On branch `calummoore/seoul-m0i6`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Preview tool shows the previewed page in a frame inside the small tools
panel of the right column. The panel is too small to use the page. On
desktop, each previewed port gets its own Preview tab in the centre tab
row, beside the session, file, and diff tabs. A bar over the page in that
tab holds Reload and Open. The tool in the panel has no bar on desktop. It
lists the ports, and a click on a port shows its tab, or opens one. A
preview stays open until the cloud computer stops, and its use never keeps
the computer running. The app opens a new preview without notice the next
time the user shows its tab. A phone has no
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

- **Asked and answered:** 16 November 2026.
- **Choice:** A. No use of a preview counts as activity. A preview works
  for as long as the computer runs, but it never makes the computer run
  longer. Cal: "the preview can keep running so long as the machine is
  open, it just doesn't make the machine stay open for longer".
- **Alternatives:** B, only page loads that the user starts count. C, keep
  today, where each request counts. D, count the user's clicks and keys in
  the frame. E, A with a warning before the idle stop. The options check
  added D and E, and recommended D.
- **Reason:** Cal's answer. A page must never extend the life of the
  computer.

### 294. Whether a preview has its own end before the computer stops

- **Asked and answered:** 16 November 2026.
- **Choice:** D. No clock for each preview. A preview stays open until the
  computer stops. Cal: "it keeps alive until the computer stops".
- **Alternatives:** A, a 30-minute clock that each request resets. B, A
  with a report of the shown tab. C, A with socket messages. E, one address
  for each port across reopens. The options check added D and E.
- **Reason:** Cal's answer. The stop already follows a time without use.

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
- **Addresses.** `preview/port/<port>`, which `main` added for local
  addresses in chat and the terminal, is the address of the Preview tab of
  a port on desktop. It shows that tab, saves it as open and active, as a
  file address does, and keeps naming the port. `preview/<previewId>` on
  desktop shows the tab of the port of that preview. On a phone both
  addresses keep their meaning of today. `preview` alone shows the tool.
  My call, dated 16 November 2026.
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
  the access rules say, and the app opens a new one at the next show. The
  answer to item 294 adds no new end, and removes none of the access rules.
  An agent can still close a preview. My call, dated 16 November 2026.

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

Depends on: 2

Summary: the docs state the Preview tabs, the tool list, the end of a
preview, and the activity rule.

- [x] Update `docs/protocol/port-previews.md`: a centre tab for each port
      (decisions 288 and 291), Close of a tab ends no preview (decision
      289), the tool list (decision 290), the bar of the tab (the request),
      and the end and the reopen of a preview (decision 292). The phone
      keeps its frame.
- [x] Update [Stop and resume](../docs/protocol/workspace-life.md#stop-and-resume):
      requests to a port preview are no longer activity (decision 293).
- [x] Update the revoke rules in
      `docs/protocol/terminal-previews-and-desktop.md`: a preview stays open
      until the computer stops, 24 hours pass, or an agent closes it
      (decision 294). Users close no preview on desktop (decision 292).
- [x] Update [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row):
      the row also holds Preview tabs.
- [x] Check `docs/protocol/desktop-app.md`,
      `docs/protocol/section-and-preview-calls.md`, and the architecture docs
      for sentences on the frame in the panel, on the 24-hour end, and on
      Close. Update each one.
- [x] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update
      `terminal-and-previews.md`: the tabs and their bar, the tool list,
      the end of a preview, and "+" on a phone only.
- [x] Check the rows of `src/marketing/from-conductor/` that name previews.
      Not needed: `main` removed the comparison page in #380.
- [x] Move the README updates to the milestones that change their code,
      so that each README matches its code.

## Milestone 4: Saved Preview tabs

Depends on: 3

Summary: the shared type and the Worker accept Preview tabs. No screen
shows them yet.

- [x] Add `{ kind: 'preview'; port: number }` to `WorkspaceTab` in
      `src/shared/workspace-view.ts`.
- [x] Accept the kind in `viewTab` of `worker/app-api/workspace-view.ts`,
      with a port from 1 to 65535, with a test of a save and a read.
- [x] Give the kind its key `preview:<port>` in
      `src/chat/state/tab-order.ts`, and handle it in each `switch` over the
      tab kinds, such as `equalTabs` of `view-tabs.ts`. Add tests.
- [x] Update `src/shared/README.md` for the new tab kind.
- [x] Run `npm run typecheck` and the targeted tests.

## Milestone 5: Preview use is not activity

Depends on: 3

Summary: a request through a preview no longer keeps the computer running
(decision 293). A preview keeps its ends of today (decision 294).

- [x] Remove the activity report of the preview proxy at
      `worker/previews/proxy.ts`, and its wiring when nothing else uses it.
      Change the tests that expect it.
- [x] Update `worker/previews/README.md` and the lifecycle docs that name
      preview activity.
- [x] Run `npm run typecheck` and the targeted tests.

## Milestone 6: Preview tabs and the tool

Tags: ui

Depends on: 4

Summary: the desktop screen shows a Preview tab for each port, and the tool
lists the ports.

- [x] Move the previews store to the workspace screen, so the tool and the
      tabs read one store. Keep its connection rules.
- [x] Draw each Preview tab in the centre row through `renderTab`, with its
      label, tooltip, Close, and the key of Close tab.
- [x] Draw the bar of a Preview tab with Reload and Open.
- [x] Show the frame of a tab at `preview/port/<port>`, kept mounted while
      hidden. Save the tab as open and active on a visit.
- [x] Open a preview for a shown tab whose port has none, with no notice.
      Use the oldest open preview of a port.
- [x] Resume a stopped computer at the show of a tab. Show the state of the
      computer in place of the bar and the page while it does not run. Show
      no Preview tab in an archived workspace.
- [x] Change the desktop tool: the list of each port, with no bar, no
      frame, no "+", and no Close. Keep the phone Preview page as today.
- [x] Add DOM and wiring tests: a click on a port with and without a tab,
      Reload and Open, Close of a tab, a revoke and the reopen at the next
      show, a session click, and the phone page.
- [x] Update `src/previews/README.md` and
      `src/shell/workspace/screen-parts.md`.
- [x] Check the screen in a browser with the workspace development page.
      Screenshots: `.context/preview-centre-tab/app/`.

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
