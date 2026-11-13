# Preview in a centre tab

Status: Active. On branch `calummoore/seoul-m0i6`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Preview tool shows the previewed page in a frame inside the small tools
panel of the right column. The panel is too small to use the page. On
desktop, the page moves to one Preview tab in the centre tab row, beside
the session, file, and diff tabs. A bar over the page in that tab holds
Reload, which reloads the page, and Open, which opens the preview in a new
browser tab. The tool in the panel has no bar on desktop. It always shows
the port form, so the user can open many previews with a click on each
port. Items 291 and 292 choose how the tool lists and ends open previews.
A phone has no centre tab row, so its Preview page keeps its bar and its
frame as today.

The change does not cover more than one centre tab for previews, or a
change to the preview access rules.

Contract owners:

- [Port previews](../docs/protocol/port-previews.md).
- [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row).
- The [previews README](../src/previews/README.md) and the
  [workspace screen parts](../src/shell/workspace/screen-parts.md).

## Decisions

All three decisions were asked on 13 November 2026 and answered by Cal on
the same day. The protocol docs number them 288, 289, and 290. Another open
branch can take the same numbers first. Check the numbers on `main` before
the merge.

### 288. One centre tab per preview, or one shared tab

- **Choice:** A. One shared "Preview" centre tab. A click on a preview tab
  in the panel changes what it shows.
- **Alternatives:** B, one centre tab for each preview, like file tabs, was
  the recommendation. A centre tab only on request was left out, because the
  panel frame stays too small.
- **Reason:** The user chose A. The panel already holds one tab for each
  preview, so the centre needs only one place for the page.

### 289. What Close on the centre tab does

- **Choice:** A. Close removes only the centre tab. The preview stays open
  in the panel. A click on its panel tab opens the centre tab again.
- **Alternatives:** B, Close ends the preview as the panel Close does. No
  Close at all was left out, because every other centre tab has one.
- **Reason:** A centre tab is a view of the preview. A server preview that
  the user may want again stays open.

### 290. What the panel shows

- **Choice:** The panel always shows its normal view: the tabs of the open
  previews and the port form below them. The user opens many previews by a
  click on each port.
- **Alternatives:** A short line that names the centre tab, with a Show tab
  button. The port form, with "+" kept.
- **Reason:** The user chose the normal view, so the panel stays useful as
  the list of ports.

### Request of 13 November 2026: a bar in the Preview tab

- **Choice:** After the first mockups, Cal asked to remove the bar of the
  Preview tool on desktop: the tabs of the open previews, Reload, and
  Open. Reload and Open move to a bar of the centre Preview tab. Only the
  Preview tab has this bar.
- **Reason:** The tool bar is not needed when the page lives in the centre.

### 291. How the user switches between open previews on desktop

Open. Asked on 13 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/mockups/src/components/tools/PortPreview.tsx`
- **Background:** The tool bar held a tab for each open preview, and a
  click on a tab loaded that preview into the centre tab. The request above
  removes the bar on desktop. The port form lists only the servers that
  have no preview yet, as
  [Port previews](../docs/protocol/port-previews.md) says.
- **Problem:** On desktop, nothing now lists the open previews, so the user
  cannot load another open preview into the centre tab.
- **Impact if no action:** A second open preview is unreachable on desktop,
  except by its address.
- **Root question:** On desktop, where does the user see each server and
  each open preview, and pick the one that the Preview tab shows?
- **Options:**
  - **A.** The tool shows an "Open previews" group above the servers. Each
    open preview is a row. The row of the preview in the centre tab is the
    current one. The server list keeps its rule. Effort: Small.
  - **B.** One list of ports in port order. A port with an open preview
    stays in the list, with a mark that it is open. The row of the centre
    preview is the current one. A click on any row shows its preview, and
    opens one first when it has none. An open port that the report does not
    name joins the list as `Port 8080`. The server can hold two previews
    of one port, such as one that an agent opened. Such a port has one row,
    which shows its oldest preview. Effort: Small.
  - **C.** A menu in the bar of the centre tab names the shown preview and
    lists the other open previews. The tool lists only the servers with no
    preview. After a Close of the Preview tab, nothing lists the open
    previews, so the tool must keep them too, as B does. Effort: Medium.
  - **D.** The bar of the centre tab holds the tabs of the open previews,
    each with its Close, then Reload and Open, as the phone bar does
    without "+". The tool lists every port, as B does. It brings back the
    removed tabs in a new place, and puts a tab row inside a tab. It also
    answers item 292, and works while the right column is hidden. Effort:
    Medium. Added by the options check.
- **Left out:** One centre tab for each preview. Decision 288 chose one
  shared tab. Under decision 289 a closed tab leaves its preview open, so
  the tool must still list it.
- **Wider fix:** B, with its rule on the phone form too, so the form has one
  rule: from the tool, one click reaches each server and each open preview.
- **Previous examples:** The tool tabs on a phone.
- **Recommendation:** B. It matches the request for "the list of
  ports/previews available", where a click on each port opens it, and it
  reaches every open preview also when the row has no Preview tab. With A
  or B, a user who hides the right column must show it again to switch.
- **Action:** ask the user, because B changes the requirement that an open
  port leaves the list, and no option is clearly best.

### 292. How the user ends a preview on desktop

Open. Asked on 13 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/mockups/src/components/tools/PortPreview.tsx`
- **Background:** Close on a tool tab ended its preview on the server. The
  bar with those tabs is gone on desktop. Close on the centre tab ends no
  preview (decision 289). A preview also ends after 24 hours, at a stop of
  the cloud computer, or when an agent closes it.
- **Problem:** On desktop, the user has no control that ends a preview.
  The public guide tells the user to close a failed preview before opening
  it again.
- **Impact if no action:** An open preview stays until it expires, the
  computer stops, or an agent closes it.
- **Root question:** On desktop, how does the user end an open preview,
  also one that the Preview tab does not show?
- **Options:**
  - **A.** Each open preview in the tool list has a Close button, with the
    rule of the tabs today: it shows on the current row, on hover, and
    while the focus is in the row. Effort: Small.
  - **B.** The bar of the centre tab has a Close preview button that ends
    the shown preview. Effort: Small.
  - **C.** No control on desktop. The user ends a preview through an agent,
    a stop, or the 24-hour expiry. It removes a control that is on `main`,
    and it breaks the recovery step of the guide. Effort: Small.
  - **D.** Close on each tab in the centre bar, with item 291 D. A Close that
    ends a preview sits under the Close of the tab, which only hides the
    page. Effort: Small with 291 D. Added by the options check.
  - **E.** End preview in the tab menu of the Preview tab, in its own group.
    The bar keeps only Reload and Open. The menu is hidden, and it ends only
    the shown preview. Effort: Medium. Added by the options check.
- **Left out:** Close of the centre tab ends the preview. Decision 289
  chose that it ends none.
- **Wider fix:** None.
- **Previous examples:** Close on the tool tabs today.
- **Recommendation:** A. It ends any preview without showing it first, and
  it keeps the Close of today. A needs the rows of 291 A or 291 B. With
  291 C or 291 D, D is the better choice. A close ends the preview for
  every member and agent that uses it.
- **Related:** Item 291. Option A needs a row for each open preview, which
  291 A and 291 B both give. Option D needs 291 D.
- **Action:** ask the user, because the options have real trade-offs, and
  ending a preview from the centre bar next to the tab's own Close can
  confuse.

## Design

Design calls are mine, dated 13 November 2026, unless a decision above
covers them.

- **Saved tab.** The workspace view gets a new tab kind,
  `{ kind: 'preview'; previewId: string }`. The server already keeps the
  centre tabs for each member, so the tab stays after a reload and on the
  other devices of the member. The row has at most one preview tab. Its key
  is `preview`, so a new preview replaces the tab in its place. The Worker
  accepts the new kind with the same checks as the other tabs. It rejects
  nothing that it accepts today. My call.
- **Addresses.** On desktop, `preview/<previewId>` shows the centre
  Preview tab with that preview, and the Preview tool in the panel. The
  visit saves the tab as open and active, as a file address does. The
  address `preview` keeps its meaning: the Preview tool in the panel, and
  the centre keeps its tab. On a phone both addresses keep the Preview page.
  My call.
- **Open.** A new preview from the port form goes to
  `preview/<previewId>`. So the centre tab opens and shows at once, as the
  user asked. A port that has a preview goes to that preview with no
  request, as today. How the user picks an open preview waits for item 291.
- **Panel on desktop.** The tool has no bar on desktop, as Cal asked. It
  shows the port form. "+" goes, because the form always shows (decision
  290). A phone keeps its bar, with the tabs, "+", Reload, and Open, and its
  frame, because a phone has no centre tab row. My call for the phone.
- **Reload and Open.** A bar over the page of the centre Preview tab holds
  Reload and Open, at its end, as the actions on the header of a file page.
  Only the Preview tab has this bar, as Cal asked. Reload loads the page of
  the tab again. Open opens the launch page of that preview in a new browser
  tab, as today. While the sandbox does not run, the bar does not show,
  because no page loads. My call for the place and the sandbox case.
- **One store.** The panel and the centre tab read one previews store for
  each shown workspace, so a reload, an open, or a revoke reaches both. The
  workspace screen keeps the store and connects it while the sandbox runs.
  My call.
- **Kept page.** The frame of the centre tab mounts at its first show. It
  stays mounted and hidden while another centre tab shows, so the page does
  not load again on return. A change of preview in the tab loads the new
  preview. My call.
- **Centre tab label.** The tab shows the label of its preview, as the
  tool tab of a phone does, such as `5173 vite`, after a globe icon. Its tooltip and
  its accessible name give the full name and the folder. The tab moves by
  drag and by its tab menu, as a file tab does. The mockup milestone
  confirms the drawing. My call.
- **No Preview tab in the row.** After a Close of the centre tab, a click
  on a server in the tool opens the centre tab again at the end of the
  row. The mockups show this case at `app/tools/preview-tab/closed`.
- **Other screens with the panel.** The pull request bar pages of the
  mockups show the Preview tool with no Preview tab in the row. Their
  panel now shows the list of servers in place of the frame. No picture
  of the marketing site shows the Preview tool, so no new capture is
  needed.
- **Close.** Close on the centre tab removes the tab from the view, and
  ends no preview (decision 289). When the tab shows, the next tab of the
  row shows after the close, as for a file tab. The key of Close tab does
  the same.
- **A preview that ends.** When the preview of the centre tab closes or the
  server revokes it, the tab shows the first remaining preview, and the
  address follows it. With no preview left, the tab leaves the view, and
  the centre shows the chat of the active session. My call.
- **Sandbox down and archived.** While the sandbox does not run, the centre
  tab shows the sandbox panel in place of the frame, as a file page does.
  An archived workspace shows no preview tab. My call.
- **Frame rules.** The centre frame keeps the sandbox flags, the
  referrer rules, and the launch address of the panel frame today. The
  access rules of previews do not change.

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
- [ ] Draw the answer to item 291 in the tool list.
- [ ] Draw the answer to item 292 in the tool list or the centre bar.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 3: Documentation and protocol

Depends on: 2

Summary: the docs state the new place of the page, the centre tab, and the
panel.

- [ ] Update `docs/protocol/port-previews.md`: on desktop the page shows in
      one centre Preview tab (decision 288). Close of that tab ends no
      preview (decision 289). The tool always shows the port form, and on
      desktop it has no bar (decision 290 and the request). Reload and Open
      sit in the bar of the centre tab. Record the answers to items 291 and
      292. The phone keeps its frame.
- [ ] Update [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row):
      the row also holds the one Preview tab.
- [ ] Check `docs/protocol/desktop-app.md`, `terminal-previews-and-desktop.md`,
      and the architecture docs for sentences that place the frame in the
      panel. Update each one.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update
      `terminal-and-previews.md`: the centre tab and its bar, the tool
      list, and "+" on a phone only.
- [ ] Check the rows of `src/marketing/from-conductor/` that name previews.
      Update a status or a note that the change makes wrong.
- [ ] Update `src/previews/README.md`, `src/shell/workspace/screen-parts.md`,
      and `src/shared/README.md` for the new tab kind.

## Milestone 4: Saved Preview tab

Depends on: 3

Summary: the shared type and the Worker accept the Preview tab. No screen
shows it yet.

- [ ] Add `{ kind: 'preview'; previewId: string }` to `WorkspaceTab` in
      `src/shared/workspace-view.ts`.
- [ ] Accept the kind in `viewTab` of `worker/app-api/workspace-view.ts`,
      with a test of a save and a read.
- [ ] Give the kind its key `preview` in `src/chat/state/tab-order.ts`, and
      handle it in each `switch` over the tab kinds, such as `equalTabs` of
      `view-tabs.ts`. Add tests for the order and for a replace in place.
- [ ] Run `npm run typecheck` and the targeted tests.

## Milestone 5: Centre tab and panel

Tags: ui

Depends on: 4

Summary: the desktop screen shows the Preview tab in the centre row, and
the panel loads previews into it.

- [ ] Move the previews store to the workspace screen, so the panel and the
      centre tab read one store. Keep its connection rules.
- [ ] Draw the Preview tab in the centre row through `renderTab`, with its
      label, tooltip, Close, and the key of Close tab.
- [ ] Draw the bar of the Preview tab with Reload and Open.
- [ ] Show the frame of the tab's preview in the centre at
      `preview/<previewId>`, kept mounted while hidden. Save the tab as open
      and active on a visit.
- [ ] Show the sandbox panel in place of the frame while the sandbox does
      not run. Show no Preview tab in an archived workspace.
- [ ] Change the desktop tool: no bar, no frame, and no "+", with the list
      that items 291 and 292 choose. Keep the phone Preview page as today.
- [ ] Follow the first remaining preview when the shown preview ends, and
      remove the tab when none is left.
- [ ] Add DOM and wiring tests: open from the form, a pick of an open
      preview, Reload and Open in the centre bar, Close of the centre tab, a revoke, a session click, and the
      phone page.
- [ ] Check the screen in a browser with `npm run dev`. Save screenshots
      under `.context/preview-centre-tab/`.

## Milestone 6: Verification, commit, review, and pull request

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
