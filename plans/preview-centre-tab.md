# Preview in a centre tab

Status: Active. On branch `calummoore/seoul-m0i6`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Preview tool shows the previewed page in a frame inside the small tools
panel of the right column. The panel is too small to use the page. On
desktop, the page moves to one Preview tab in the centre tab row, beside
the session, file, and diff tabs. The panel stays. It always shows the tabs
of the open previews and the port form, so the user can open many previews
with a click on each port. A click on a preview tab in the panel loads that
preview into the centre tab. Reload in the panel reloads the page in the
centre tab. Open still opens the preview in a new browser tab. A phone has
no centre tab row, so its Preview page keeps its frame as today.

The change does not cover more than one centre tab for previews, a tab
toolbar in the centre, or a change to the preview access rules.

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
- **Open.** A new preview from the port form, and a click on a panel tab,
  go to `preview/<previewId>`. So the centre tab opens and shows at once,
  as the user asked. A port that has a preview goes to that preview with no
  request, as today.
- **Panel on desktop.** The panel shows the tabs of the open previews, with
  Reload and Open of the preview in the centre tab, then the port form. The
  panel tab of that preview is the current one. "+" goes on desktop, because
  the form always shows (decision 290). A phone keeps "+" and its frame.
  My call.
- **Reload and Open.** Reload reloads the page in the centre tab, also when
  another centre tab shows, and moves no address. Open opens the launch page
  of that preview in a new browser tab, as today. My call.
- **One store.** The panel and the centre tab read one previews store for
  each shown workspace, so a reload, an open, or a revoke reaches both. The
  workspace screen keeps the store and connects it while the sandbox runs.
  My call.
- **Kept page.** The frame of the centre tab mounts at its first show. It
  stays mounted and hidden while another centre tab shows, so the page does
  not load again on return. A change of preview in the tab loads the new
  preview. My call.
- **Centre tab label.** The tab shows the label of its preview, as the
  panel tab does, such as `5173 vite`, after a globe icon. Its tooltip and
  its accessible name give the full name and the folder. The tab moves by
  drag and by its tab menu, as a file tab does. The mockup milestone
  confirms the drawing. My call.
- **No Preview tab in the row.** After a Close of the centre tab, no tab
  of the panel is current, and Reload and Open do not show, because no
  centre tab holds a preview. The mockups showed this case at
  `app/tools/preview-tab/closed`. A click on a panel tab or on a server
  opens the centre tab again at the end of the row. My call.
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

## Milestone 2: Documentation and protocol

Depends on: 1

Summary: the docs state the new place of the page, the centre tab, and the
panel.

- [ ] Update `docs/protocol/port-previews.md`: on desktop the page shows in
      one centre Preview tab (decision 288). Close of that tab ends no
      preview (decision 289). The panel always shows its tabs and the port
      form (decision 290). The phone keeps its frame.
- [ ] Update [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row):
      the row also holds the one Preview tab.
- [ ] Check `docs/protocol/desktop-app.md`, `terminal-previews-and-desktop.md`,
      and the architecture docs for sentences that place the frame in the
      panel. Update each one.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update
      `terminal-and-previews.md`: the centre tab, the panel list, and "+"
      on a phone only.
- [ ] Check the rows of `src/marketing/from-conductor/` that name previews.
      Update a status or a note that the change makes wrong.
- [ ] Update `src/previews/README.md`, `src/shell/workspace/screen-parts.md`,
      and `src/shared/README.md` for the new tab kind.

## Milestone 3: Saved Preview tab

Depends on: 2

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

## Milestone 4: Centre tab and panel

Tags: ui

Depends on: 3

Summary: the desktop screen shows the Preview tab in the centre row, and
the panel loads previews into it.

- [ ] Move the previews store to the workspace screen, so the panel and the
      centre tab read one store. Keep its connection rules.
- [ ] Draw the Preview tab in the centre row through `renderTab`, with its
      label, tooltip, Close, and the key of Close tab.
- [ ] Show the frame of the tab's preview in the centre at
      `preview/<previewId>`, kept mounted while hidden. Save the tab as open
      and active on a visit.
- [ ] Show the sandbox panel in place of the frame while the sandbox does
      not run. Show no Preview tab in an archived workspace.
- [ ] Change the desktop panel: tabs, Reload, and Open, then the port form,
      with no frame and no "+". Keep the phone Preview page as today.
- [ ] Follow the first remaining preview when the shown preview ends, and
      remove the tab when none is left.
- [ ] Add DOM and wiring tests: open from the form, a click on a panel tab,
      Reload, Close of the centre tab, a revoke, a session click, and the
      phone page.
- [ ] Check the screen in a browser with `npm run dev`. Save screenshots
      under `.context/preview-centre-tab/`.

## Milestone 5: Verification, commit, review, and pull request

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
