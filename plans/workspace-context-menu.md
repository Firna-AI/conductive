# Workspace context menu

Status: Active. On branch `calummoore/workspace-context-menu`, no pull request yet. The pull request that completes the work deletes this plan.

The user chose the menu scope on 9 November 2026. The user approved implementation of Milestone 1 on 9 November 2026. Milestone 1 is complete. The user approved all remaining milestones and tasks on 9 November 2026.

Conductive lists each task as a workspace in the desktop sidebar and the
phone list. A workspace already moves between sections, gets a new owner,
and archives through existing controls. The server accepts a new workspace
name, but the app has no workspace name editor.

The change adds one workspace menu with Move to section, Reassign to,
Rename, and Archive. A right-click or the menu keys open it on a row, as
Decision 2 F chose. No row has a More button. The row keeps main's hover
Archive shortcut. It uses the existing actions and permission rules. Copy
link and the other actions in the reference screenshot stay outside the
chosen scope.

Contract owners:

- [Workspace menu](../docs/protocol/workspace-menu.md).
- [Orgs, sections, and members](../docs/protocol/orgs-and-members.md).
- [Workspace lifecycle and Archive](../docs/protocol/workspaces-and-sandboxes.md).
- [Workspace and session names](../docs/protocol/agents-and-sessions.md#workspace-and-session-names).
- [Command palette and layers](../docs/protocol/command-palette.md).
- [Web app data and composition](../src/app/README.md).
- [Workspace screen](../src/shell/workspace/README.md).
- [Mockup catalogue](../docs/mockups/README.md).

## Decision 1: Choose the first menu's actions

This number refers to item 1 of the workspace menu discussion.

- **Severity:** Medium. **Effort:** Large for the chosen scope.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/list/WorkspaceRow.tsx`.
- **Terms:** A section groups workspace rows. A workspace is one task with
  its own branch and cloud computer.
- **Background:** Conductive already has visible controls for section moves,
  reassignment, and Archive. The workspace update route accepts a new name.
- **Problem:** The workspace row has no app menu. Rename has no input control.
- **Impact if no action:** People must use separate controls to manage a
  workspace. They cannot rename a workspace through the app.
- **Root question:** Which actions should the first workspace menu contain?
- **Options:**
  - **A.** Move to section, Reassign to, and Archive. Reuse the three visible
    features. Effort: Medium.
  - **B.** A, plus Copy link. Preserve the browser's copy action in the new
    menu. Effort: Medium.
  - **C.** B, plus Rename. Add a workspace name editor. Effort: Large.
  - **D.** A, plus Rename. Add the name editor and keep Copy link outside the
    scope. Effort: Large. The user supplied this option.
- **Left out:** Mark as unread, Pin, Set status, Copy SSH command, and
  Transfer to local need new features that the user excluded.
- **Wider fix:** None. This decision sets menu contents.
- **Previous examples:** The section menu in `src/shell/list/SectionHeader.tsx`
  and the owner picker in `src/members/OwnerPicker.tsx`. The tab context menu
  uses `src/chat/components/useTabMenu.ts` and `src/chat/ui/Menu.tsx`.
- **Recommendation:** D. The user chose D on 9 November 2026. The first
  recommendation was B.
- **Action:** Apply D in every milestone, as the user instructed on
  9 November 2026.
- **Chosen:** D, by the user on 9 November 2026: "1 = A + rename".

All options assume a menu on a workspace row. The task message requires it.
They keep the existing role limits and Archive check. The protocol docs
require those limits. None needs new storage, a migration, or a new API.

## Decision 2: Combine the row action controls

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/list/WorkspaceRow.tsx`.
- **Terms:**
  - **More:** The button that opens the four-action workspace menu.
  - **Archive shortcut:** The separate icon that archives a workspace from its row.
- **Background:** The approved plan adds More beside each row link. Main
  now has a separate Archive shortcut from PR #124, merged on 9 November
  2026. The shortcut appears only on hover. The header has no Archive.
- **Problem:** The two controls use the same space over the row's time.
  The approved menu and the new shortcut need one combined row design.
- **Impact if no action:** A blind merge can overlap controls or lose the
  new shortcut. The final merge and pull request must wait.
- **Root question:** Which row controls should appear on hover, on keyboard
  focus, on selected rows, and on touch?
- **Options:**
  - **A.** Keep both controls on desktop. Keep Archive on hover and the
    approved More entry points. Reserve room for both. Keep the time
    visible on selected and focused rows. This adds a second icon.
    Effort: Medium.
  - **B.** Put Archive in the menu only. Keep the approved More behavior
    and the four menu actions. This keeps one row control but removes the
    new direct shortcut. Effort: Medium.
  - **C.** Keep the Archive shortcut on mouse desktops. Open the menu there
    by right click or the menu keys. Show More on phones and hoverless
    screens. This keeps one control but makes the desktop menu less visible.
    Effort: Medium.
  - **D.** Keep C. Also reveal More when it has keyboard focus and while its
    menu is open. Place it over the end of the name so the time stays
    visible. This keeps the hover shortcut and a visible keyboard path.
    Each row has another Tab stop. Effort: Medium.
  - **E.** Show More on every row, after the time, on every screen. Keep
    Archive over the time on hover. The menu is always visible, but every
    workspace name has less room. Effort: Medium.
  - **F.** Keep Archive as on main. Remove the workspace More button on
    every screen. Open the menu by right click and the existing local
    menu keys. Add no replacement touch control. Effort: Medium.
    The user supplied this option.
- **Left out:** Restore Archive in the header, because the new user
  decision on main removed it. Remove the row menu, because the current
  task requires it. Change nothing, because the two changes must coexist.
- **Wider fix:** None. This is a choice of product controls.
- **Previous examples:** `origin/main` commit `c02744f`, PR #124, adds the
  shortcut and removes Archive from the header. Decision 1 of this plan
  chooses the four menu actions. The completed mockups show More.
- **Recommendation:** F. The user chose a right-click menu with the
  existing Archive control. Earlier recommendations were B, then D.
- **Action:** Apply F. The user answered on 9 November 2026.
- **Chosen:** F, by the user on 9 November 2026: "we should not have the
  3 dot menu, have the archive as it was before, just right click loads
  the menu".

All options keep the four menu actions, the role rules, the Archive check,
main's header without Archive, and its archive-state and focus fixes. They
keep More on phones and hoverless screens. The task and protocol docs
require those behaviors. A, C, D, and E keep main's time on selection and
keyboard focus. B removes the shortcut and overrides that visibility rule,
so it needs explicit approval. C, D, and E change the agent's desktop More
design call. A touch laptop can hover while More shows, so every option
except B needs space for both icons. These were the assumptions of the
earlier options check. The user's F supersedes the assumption that More
stays on touch. No workspace row shows More. The Archive shortcut keeps
main's hover-only behavior and permissions. Section menu buttons stay.

The options check recommended D before the user's answer. Its record is
`.context/workspace-context-menu/decision2/options-check.md`.

Integration after the answer must preserve main's keyboard moves and
focus from every row control. The menu and any retained shortcut must use
one Archive flow. It must also remove stale comparisons with header
Archive from the menu protocol and catalogue. The hoverless comment must
describe More without changing the shortcut's hover-only rule.

## Design calls

These are agent design calls from 9 November 2026.

- One action list serves right-click and the More button. Section menus
  already use a visible button. The button also gives touch and keyboard
  users a way to open the menu.
- Use the existing dense menu style. Right-click opens beside the pointer.
  More opens beside its button. A phone shows the same choices in a sheet.
  The menu stays within the window and outside the sidebar's clipping area.
- Shift+F10 and the Menu key on a focused row open the menu below that row,
  as the current tab menu does. These are local menu controls.
- More sits beside the row link. It shows on hover, focus, and the current
  row, and while open. It always shows on a screen without hover.
- Opening the menu does not navigate, resume a cloud computer, or mark the
  target workspace as read. Actions use the clicked row, even when another
  workspace is open. A right-click starts no drag press. More keeps its own
  press through the existing `ownPress` helper. The shared context handler
  ends a pending mouse press. It keeps a touch press for drag, and the menu
  skips a context event that the drag handler stopped.
- Keep the existing mouse drag, touch hold for drag, Alt with an arrow key,
  and modified clicks on row links. Add no global action shortcuts.
- Move to section lists the current sections and marks the current one.
  Choosing the current section changes nothing. A move to another section
  puts the workspace at its start, as the existing list write supports.
  Hide Move to section when there is no other section.
- Reassign to opens the existing member choices for an admin. Keep their
  loading, failure, saving, and refusal handling. Reuse the member API and
  the existing rule for suspended recipients.
- Rename edits the name in its row, as the section rename does. Select the
  current name. Enter or blur saves. Escape cancels. An empty or unchanged
  draft cancels without a request. For an unnamed workspace, start empty.
  A failed save keeps the draft available for retry and uses the list's
  error feedback. Keep the existing server name rules and the branch name.
- Archive uses the existing saved-work check, question, and explicit
  confirmation before it deletes a computer. A stopped computer can refuse
  the command that checks its work. Preserve the current failed-check flow
  and any instruction the server provides. Add no automatic resume or
  alternate archive route. Check the real stopped case after deployment.
- Apply existing role and state rules. Members can move and rename an
  unarchived workspace. Only admins reassign. Only the owner and admins
  archive. An admin's archived row offers only Reassign to. Other people
  keep the browser's menu on an archived row. A suspended org offers no writes.
- Hide an action the person cannot use. When no action remains, show no
  empty app menu or More button. Keep the browser's native menu in that case.
- Confirm only the fields that an action changes. A rename reply must not
  replace newer activity, owner, section, or sandbox state. Update an open
  workspace through its existing metadata path and preserve its saved view.
- Give unopened rows a list-level owner for Reassign and Archive replies.
  Reuse `ArchiveModel` for the target ID without opening `WorkspaceModel`.
  Update the owner only for Reassign and the archive state for Archive.
  For the currently open workspace, use its existing owner and Archive
  flows. Show only one Archive question for one action.
- A touch hold keeps the existing row drag. A hold that ends without a move
  opens no menu. More is the touch entry point.
- Reuse the shared pointer drag and point-menu work already on `main`.
  Reuse a suitable existing menu surface. Keep any extraction limited to
  the consumers this change needs. Do not migrate every app menu here.

### Mockup design calls, 9 November 2026

These are agent calls from the completed mockup milestone.

- Desktop More replaces the time while it shows. A phone keeps the time,
  then More. An open menu keeps its row marked and More pressed.
- Right-click puts the menu at the pointer. More aligns the menu below its
  button, at its end. Menu keys open it below the row.
- Desktop section and owner choices open beside their parent item. A phone
  replaces the sheet choices under the workspace name. Dismissal returns
  to the list. Another action starts from More again.
- Rename replaces the name and time with the selected field. More stays
  hidden during Rename. A failed save keeps the draft and shows a toast.
- Archive from an unopened row shows the existing question over the current
  page. Cancel keeps that page. A completed archive leaves the Archived
  group collapsed with its count. A failed check offers Cancel and Try again.
- A lifted row has no More. Its faint phone placeholder keeps More so its
  time stays aligned. Phone views draw no hover state.
- The Archive flow derives its final rows from its initial snapshot. It
  adds only the workspace that the action archived.
- The General-only case uses Acme after deletion of its custom sections,
  which moves their workspaces to General. It keeps the shared fixture model.

### Documentation design calls, 9 November 2026

These are agent calls from the documentation milestone.

- The menu requirements live on a new protocol page, Workspace menu, which
  belongs to Workspaces and sandboxes. The owner docs link to it. Reason:
  the menu needs about 150 lines, so each owner doc would pass the length
  target of about 250 lines. One page also keeps the menu rules together,
  as Workspace links does for Copy link and the chips.
- The architecture doc does not list the new page. Reason: it passes the
  length target, so a change needs a split outside this milestone. Its
  list names Workspaces and sandboxes, which links the page, as Access and
  security links GitHub tokens.
- The protocol cites no number for Decision 1. It gives the choice, the
  rejected actions, and the reason. Reason: the number 1 belongs to this
  plan only, and `plans/follow-ups/decision-numbers-across-plans.md` still
  waits for the numbering rule of the user.
- The protocol now states two behaviors that the app already has. Every
  member moves and renames a workspace that is not archived. The Archive
  question names a check that does not finish, with Try again and Cancel.
  Reason: the menu offers both from every row, and the design calls above
  keep both. Neither adds behavior.

### App guide design call, 9 November 2026

This is an agent call from Milestone 2a.

- The body of Key code in the web app README moves, unchanged, to
  `src/app/key-code.md`. The README keeps the Key code heading and a short
  paragraph that links the page. Reason: the waitlist merge and the menu
  docs brought the README to 390 lines, past the limit of 300. Key code
  was its largest section, with 181 lines, so the README now has 214
  lines. The page sits beside the README, so each path and link stays
  correct. A move of Run it alone was left out, because the README would
  still pass 300 lines.

### Workspace action design calls, 9 November 2026

These are agent calls from Milestone 3.

- `OrgModel.workspaceActions` owns the row writes and the Archive flows
  of unopened rows. `ShownWorkspaces` joins those actions to an existing
  kept model. Reason: the row must change without opening its workspace
  or making a workspace model for it.
- A kept but closed workspace reuses its model's Archive flow and owner
  callback, as the open workspace does. Reason: its cached header must
  show the new fields on a return, without a read or a new model.
- A name reply confirms only `name`. An owner reply confirms only
  `owner`. An Archive reply confirms only `state` and `archivedAt` in the
  list. Its kept detail also takes `start` and `error` from the reply.
  Reason: an older action reply must keep newer activity and other fields.
- Local action fields stay over pending first-open replies as well as
  Resume replies. Reason: a first read can start before a row action,
  and its older reply must keep that action's confirmed fields.
- The UI uses the screen's Archive question for its current row. It draws
  that same question during the first detail load too. For another row,
  it draws one list-owned question over the current page. Reason: each
  action must show one question, including while the current row loads.

### Workspace menu UI design calls, 9 November 2026

These are agent calls from Milestone 4.

- The app reads the actions of the menu from `workspaceMenuItems` in the
  mockups' `workspaceMenu.ts`, which no longer imports a fixture. The
  mockup section choices moved to `rowControls.ts`. Reason: one list of
  the actions, their order, words, icons, and role rules serves the
  mockups and every entry point. The rules match `mayArchive` and the
  owner picker. The list's suspension check removes every action.
- The menu extends the shell's menu list with items that show choices,
  and adds `PointMenu`, a menu at a point in a fixed layer on the page.
  Firna's dropdown and context menu were left out: they have no
  submenus, and their rows are taller than the dense design. The chat's
  point menu stays. Only its menu keys move to the shared `opensMenu`.
  Reason: the list, its sheets, and its layers use the shell kit, and
  this change migrates no other menu.
- A hover shows the choices of an item at once, and the item under the
  pointer takes the focus, so one row shows the highlight. A key or a
  press moves the focus into the choices. A hover leaves it in the menu.
  Reason: the mockups show one highlighted row, as native menus do.
- Reassign to reuses the state of the owner picker through
  `useOwnerChoices` and its panel. While a change runs, the menu refuses
  Escape, Left, a press outside, Tab, and the palette key. The owner
  choices stay, and the other items and actions do nothing. Reason: the
  protocol asks for the states of the owner picker, which refuses to
  close in the same way, so its result or its error stays in view.
- More shows at all times when the main pointer cannot hover or any
  pointer is coarse. Reason: a finger on the touch screen of a laptop
  cannot hover, and its long press drags the row.
- A second press on More closes its menu, and a press on More is no press
  outside. Reason: More toggles its menu, as the other menu buttons do.
- The list cancels its own Archive flow when its row becomes the current
  page or the list closes. Reason: a question must never show twice or
  return after its owner closed.
- The Rename field stays open and read-only while its save runs, so
  Enter, a blur, and Escape send nothing more. Its border shows its focus,
  without the focus ring of the browser, as the mockups draw it. Reason:
  the field saves once, and closes after the confirmed reply.

### Mockup guide design call, 9 November 2026

Each guide keeps its entry page, with linked chat and operator pages
beside it. The split keeps every original line. These are the largest
contiguous groups with one topic. It brings both guides below 300 lines
with the fewest pages. Moving only the catalogue's operator details would
leave little room. A third design page is unnecessary.

### Right-click documentation design calls, 9 November 2026

These are agent calls from Milestone 4c.

- Decision 2 F supersedes each earlier design call above that gives More
  a place, a visibility, a touch role, or a toggle. Those calls stay as
  dated records. The protocol and the guides state F.
- The protocol names the layout, not the device, for the sheet. Reason: a
  narrow window shows the phone layout, where a right click opens the
  sheet. A touch screen gets no way to open the menu, as F chose.
- The design guide keeps the saved sentence that the app reads the action
  list of `workspaceMenu.ts`, so that file imports no fixture. Reason: the
  rule names no More, and it guards the list that Milestone 4d shares
  with the app again.
- The key code page names one Archive flow for the row shortcut and the
  menu, `ShownWorkspaces.archive`, and no separate list Archive hook. It
  does not name the hook that draws the question. Reason: Milestone 4d
  joins main's row Archive and the menu in one flow and chooses that hook.

### Model integration design calls, 9 November 2026

These are agent calls from the model part of Milestone 4d.

- `ShownWorkspaces.archive` stays the entry point for the row shortcut
  and the menu. Reason: it reuses the kept workspace's flow and gives an
  unopened row a list-owned flow without opening that workspace.
- The kept Archive callback projects the detail before it confirms the
  list. Reason: the list's immediate Archive follow must not replace the
  detail's newer name or owner with a different list snapshot.
- A confirmed Archive keeps its detail over older open and Resume
  replies and over replayed start, title, and non-archived state events.
  An actual archived detail read still applies. Reason: replayed records
  cannot undo Archive or replace newer metadata.
- Activity reporting moves to `WorkspaceActivity`. The detail helper
  owns archive protection and local metadata projections. Reason: each
  responsibility stays separate and the combined model stays below the
  file-length limit.
- Archive also advances `updatedAt` when its reply is newer than the
  current activity time. It keeps a newer current time in the list and
  detail. This replaces M3's state-only projection detail. Reason: main
  records the Archive time as activity, and the user chose to keep Archive.

### Workspace menu UI integration design calls, 9 November 2026

These are agent calls from the UI part of Milestone 4d.

- `useRowMenus` gives each row its menu and its Archive shortcut. Both
  start the flow of `ShownWorkspaces.archive`, so main's `useListArchive`
  is gone. The shortcut keeps main's `mayArchive` check. Reason: one
  action shows one question, with main's permissions.
- The open menu, the Rename field, and the list's own question belong to
  the org of the list. A change of the org closes them and cancels the
  list's own check, as main did. Reason: the sidebar keeps one list while
  the org changes.
- The list owns the flow of its question only while its row is not the
  current page. Reason: the page draws its own question, and closes its
  flow when it closes.
- A closing menu gives the focus to the current link of its row through
  the link refs of `useRowFocus`. An archived row falls back to its own
  link. Reason: a move can replace the row in the render that closes the
  menu.
- The row of an open menu keeps the fill of a hover, without the Archive
  shortcut. Reason: the person sees which row the menu changes, and only a
  real hover shows the shortcut.
- The Rename field takes the focus in an effect after the cleanups of the
  closed menu. Reason: a phone sheet keeps the page inert until its own
  cleanup, so an earlier focus would not take.
- Rename leaves Enter and Escape to an input method that composes a word,
  as the command palette does. Reason: the input method owns those keys.
- The menu keys also work from the Archive shortcut, and give the focus
  back to the link of the row. Reason: the shortcut hides when the pointer
  leaves the row.
- Each section choice uses the ID of its section as its key. Reason: two
  sections can have the same name.

### Phone sheet focus design call, 9 November 2026

This is an agent call from Milestone 4e.

- A sheet can take an optional `returnFocus` callback, which
  `useModalLayer` passes to `useLayerFocus`. The row menu sheet passes the
  same row callback as the menu at a point. The callback runs after the
  sheet releases inert, and only when the focus is lost or stayed in the
  sheet. An address change still sends the focus to the new screen. When
  the callback places no focus, the element that had the focus before the
  sheet takes it back. Reason: a move from the sheet replaces the row that
  opened it, and every other sheet and dialog keeps its behavior.

## Milestone 1: Workspace menu mockups

Tags: mockup

Depends on: none

Action: `ui implementor`.

Show the chosen menu in the workspace list and the sidebar. Use the current
Mokly catalogue and shared parts. Every new view has desktop and phone
variants. A screen-spec page holds at most five screens.

- [x] Add the four-action menu and More button to the relevant mockups.
- [x] Show section choices, member choices, and inline Rename with its
      failure and retry state.
- [x] Show the role, archived, and read-only variants without unavailable
      actions. Include a list with only the General section.
- [x] Reuse the Archive screens for confirmation and failure. Show their
      route from the list without a new archive design.
- [x] Run `npm run mockups:check`. View the changed pages in light and dark.
      Save screenshots under `.context/workspace-context-menu/`.
- [x] Refresh marketing captures only where the changed mockups affect them.
- [x] Update this plan's design and TODOs for problems found in the mockups.

Evidence: `.context/workspace-context-menu/milestone1/ui-report.md`,
with screenshots, check logs, and the parent browser measurements beside it.

## Milestone 1a: Integrate current workspace mockups

Tags: mockup

Depends on: 1

Action: `ui implementor`.

- [x] Preserve the workspace menu beside the workspace numbers and links
      now on `main`. Resolve the catalogue merge and refresh affected pictures.
- [x] Check the combined mockups and record the merge resolutions under
      `.context/workspace-context-menu/integration/`.

Evidence: `.context/workspace-context-menu/integration/report.md`.

## Milestone 2: Document the chosen behavior

Depends on: 1, 1a

Action: `docs implementor`.

The protocol states the menu behavior. Area READMEs name useful entry points.

- [x] Add the workspace menu and Rename requirements to the owning protocol
      docs. Keep the existing role, automatic naming, and Archive rules.
- [x] Read both `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update any sentence that restates a changed protocol fact.
- [x] Update the app, workspace, and mockup READMEs where the change adds
      useful behavior or entry points. Check all changed relative links.

Evidence: `.context/workspace-context-menu/milestone2/report.md`.

## Milestone 2a: Keep app documentation short

Depends on: 2

Action: `docs implementor`.

- [x] Split the app README into linked pages. Keep all entry points and
      the current facts from the waitlist merge.
- [x] Check the links and the legal pages on the combined source.

Evidence: `.context/workspace-context-menu/milestone2a/report.md`.

## Milestone 3: Workspace row actions

Depends on: 2, 2a

Action: `non-ui implementor`.

Use the existing workspace PATCH, member, and Archive routes. Keep data
writes and response handling in the app model and action layer. This
milestone adds no backend route or schema change.

- [x] Add the rename action and a field-specific confirmed list update.
- [x] Keep newer unrelated workspace fields when a rename reply arrives.
      Keep the existing open-workspace metadata and saved-view behavior.
- [x] Add an owner-only list update for a Reassign reply. Keep newer name,
      state, and section changes when that reply arrives.
- [x] Give an unopened row a list-level Archive flow with `ArchiveModel`.
      Apply its confirmed archive state to the list without opening a
      workspace. Use the open workspace's existing flow for its own row.
- [x] Check the development fake's existing rename route and align it only
      where it differs from the real route.
- [x] Add a focused test for the rename write and preservation of a newer
      unrelated workspace update. Use the existing test services.
- [x] Cover the owner-only confirmation and an unopened row's Archive result
      at the model layer. Keep only cases not covered by existing tests.
- [x] Run the targeted tests, typecheck, lint, and format checks.

Evidence: `.context/workspace-context-menu/milestone3/report.md`.

## Milestone 3a: Integrate the current header mockups

Tags: mockup

Depends on: 3

Action: `ui implementor`.

- [x] Keep the workspace menu with main's current header. Resolve the
      design text and refresh the two conflicting desktop pictures.
- [x] Check the combined desktop and phone views in both schemes. Keep
      the one-row Archive result.

Evidence: `.context/workspace-context-menu/milestone3a/report.md`.

## Milestone 4: Workspace row menu

Tags: ui

Depends on: 3, 3a

Action: `ui implementor`.

Implement the approved mockups for the shared row in the sidebar and list.
Reuse the existing move, member, rename, and Archive actions.

- [x] Check `@firna/ui`, then the existing menu and point-menu components.
      Reuse suitable parts and avoid a second workspace menu definition.
- [x] Add right-click and More entry points with keyboard focus, Escape,
      outside-press dismissal, window bounds, and no sidebar clipping.
- [x] Add submenus to the reused app menu. Cover pointer hover, the right
      and left arrow keys, Escape, and choices that replace a phone sheet.
- [x] Reuse the row-control styles for More and Rename. Draw the real menu
      above the page. The mockup point offsets only place static examples.
- [x] Show More on hoverless screens as well as phone layouts, including
      touch screens that use the desktop layout.
- [x] Add the existing local menu keys. Use `ownPress` on More. Let the
      shared drag context handler end mouse presses and keep touch presses.
      Cover that shared change in the existing pointer-drag tests.
- [x] Connect section choices, member choices, Rename, and Archive to the
      target workspace. Keep the current workspace open when the menu opens.
      Render one Archive question, including during its first detail load.
- [x] Reuse the existing permission checks, active and archived rules, and
      org suspension handling. Close obsolete choices when access changes.
- [x] Keep drag, touch hold, modified-click navigation, and palette layer
      behavior. Restore focus to the row or More button after dismissal.
- [x] Add focused interaction tests for target identity, permissions,
      Rename save, cancel, empty draft, and failure, and the existing Archive
      confirmation flow. Check a failed saved-work read without bypassing
      confirmation. Keep each requirement at one test layer.
- [x] Extend an existing drag regression test only if the new menu changes
      an interaction that it does not already cover.
- [x] Run new asynchronous and DOM tests ten times, as the testing skill
      requires. Record their times and the failures seen before the fix.
- [x] Run the targeted checks and smoke-test the menu in the browser.
      Check pointer placement, keyboard access, a phone layout, and a
      scrolled sidebar. Save evidence under `.context/workspace-context-menu/`.

Evidence: `.context/workspace-context-menu/milestone4/report.md`.

## Milestone 4a: Keep the mockup guides short

Depends on: 4

Action: `docs implementor`.

- [x] Split the catalogue and design guides into linked pages. Preserve
      every current fact, catalogue path, and entry point.
- [x] Check the moved content and all affected links.

Evidence: `.context/workspace-context-menu/milestone4a/report.md`.

## Milestone 4b: Mockups for the chosen row controls

Tags: mockup

Depends on: 4a

Action: `ui implementor`.

- [x] Integrate main's hover-only Archive and its viewer permissions into
      the mockups. Keep the header without Archive.
- [x] Apply Decision 2 F. Remove workspace More, its examples, and its
      unused styles and metadata. Keep the four-action right-click menu.
- [x] Check desktop and phone views in both schemes. Refresh affected
      marketing pictures and keep the one-row Archive result.

Evidence: `.context/workspace-context-menu/resume-f/mockups/report.md`.

## Milestone 4c: Document right-click entry

Depends on: 4b

Action: `docs implementor`.

- [x] Update the menu protocol and live guides for F. Keep the existing
      menu keys and touch drag. Add no replacement button or gesture.
- [x] Read both legal pages in full and keep restated facts aligned.
      Check links and remove stale header-Archive and More references.

Evidence: `.context/workspace-context-menu/resume-f/docs/report.md`.

## Milestone 4d: Integrate the frontend behavior

Tags: ui

Depends on: 4c

Actions: `non-ui implementor` for model state, then `ui implementor` for
the components and interactions. This milestone changes no backend route.

- [x] Merge main's confirmed Archive state and older-read protections
      with the field-specific name, owner, and archive updates.
- [x] Keep Archive's immediate activity time as on main. A later reply
      must not roll back a newer activity time.
- [x] Use one Archive flow for the shortcut and the menu. Preserve the
      currently open workspace and the single question during its load.
- [x] Remove the workspace More control on every screen and its dead
      helpers. Keep the hover-only Archive, its permissions, and its layout.
- [x] Keep main's focus and keyboard moves from every row control. Keep
      right-click, local menu keys, drag, and modified-click navigation.
- [x] Preserve all main tests. Update tests of the explicitly removed
      More behavior. Verify new or changed asynchronous tests ten times.
- [x] Run the targeted checks and browser smoke test on the combined UI.

Model evidence: `.context/workspace-context-menu/resume-f/model/report.md`.
UI evidence: `.context/workspace-context-menu/resume-f/ui/report.md`.

## Milestone 4e: Keep focus after a sheet moves a row

Tags: ui

Depends on: 4d

Action: `ui implementor`.

- [x] Return focus to the current workspace link after a section choice
      in the phone sheet replaces the row. Keep other sheet behavior.
- [x] Extend the existing phone menu test, prove its failure, repeat it
      ten times, and check the real browser and affected layers.

Evidence: `.context/workspace-context-menu/resume-f/phone-focus/report.md`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 4a, 4b, 4c, 4d, 4e

Action: `default orchestrator`.

- [x] Resolve Decision 2 before integrating main's Archive row control.
      Then add the required integration milestones for its chosen approach.
- [x] Integrate the latest main changes before the complete check. Keep
      the comparison page's Rename row aligned with the finished feature.
- [x] Run the early checks and `npm run check` on the complete implementation.
      Install root, desktop, and runner dependencies as `AGENTS.md` requires.
- [x] Integrate main's later Mac download and comparison updates. Keep
      the finished Rename row and every unrelated main feature.
- [x] Run `npm run check` again on that combined tree before the review.
- [x] Review the final diff for scope, preserved functionality, protocol
      alignment, legal text, file length, and real data in product screens.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings.
      Apply its fix rule, record follow-up items for the remaining findings,
      and re-review once. Keep reports under `.context/`.
- [ ] Delete this plan when the plans skill permits it. Preserve its dated
      decisions and design calls in the pull request description.
- [ ] Open the pull request into `main`. Include the plan permalink and each
      follow-up item that this change adds. Wait for CI before the final report.

Evidence: `.context/workspace-context-menu/final-integration/`.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, use Archive from a stopped workspace's row.
      Check that any failed saved-work read leaves the workspace intact and
      offers useful recovery. Record the provider's actual reply. Propose a
      separate fix if needed. Add no automatic resume without a user decision.
