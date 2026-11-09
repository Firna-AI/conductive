# Workspace context menu

Status: Active. On branch `calummoore/workspace-context-menu`, no pull request yet. The pull request that completes the work deletes this plan.

The user chose the menu scope on 9 November 2026. The user approved implementation of Milestone 1 on 9 November 2026. Milestone 1 is complete. Milestones 2 to 5 wait for a further instruction.

Conductive lists each task as a workspace in the desktop sidebar and the
phone list. A workspace already moves between sections, gets a new owner,
and archives through existing controls. The server accepts a new workspace
name, but the app has no workspace name editor.

The change adds one workspace menu with Move to section, Reassign to,
Rename, and Archive. It opens from a right-click or a More button on a row.
It uses the existing actions and permission rules. Copy link and the other
actions in the reference screenshot stay outside the chosen scope.

Contract owners:

- [Orgs, sections, and members](../docs/protocol/orgs-and-members.md).
- [Workspace lifecycle and Archive](../docs/protocol/workspaces-and-sandboxes.md).
- [Workspace and session names](../docs/protocol/chat-and-events.md#workspace-and-session-names).
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
- **Action:** Apply D in Milestone 1, as the user instructed on 9 November
  2026. The remaining implementation milestones wait for a further instruction.
- **Chosen:** D, by the user on 9 November 2026: "1 = A + rename".

All options assume a menu on a workspace row. The task message requires it.
They keep the existing role limits and Archive check. The protocol docs
require those limits. None needs new storage, a migration, or a new API.

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

## Milestone 2: Document the chosen behavior

Depends on: 1

Action: `docs implementor`.

The protocol states the menu behavior. Area READMEs name useful entry points.

- [ ] Add the workspace menu and Rename requirements to the owning protocol
      docs. Keep the existing role, automatic naming, and Archive rules.
- [ ] Read both `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update any sentence that restates a changed protocol fact.
- [ ] Update the app, workspace, and mockup READMEs where the change adds
      useful behavior or entry points. Check all changed relative links.

## Milestone 3: Workspace row actions

Depends on: 2

Action: `non-ui implementor`.

Use the existing workspace PATCH, member, and Archive routes. Keep data
writes and response handling in the app model and action layer. This
milestone adds no backend route or schema change.

- [ ] Add the rename action and a field-specific confirmed list update.
- [ ] Keep newer unrelated workspace fields when a rename reply arrives.
      Keep the existing open-workspace metadata and saved-view behavior.
- [ ] Add an owner-only list update for a Reassign reply. Keep newer name,
      state, and section changes when that reply arrives.
- [ ] Give an unopened row a list-level Archive flow with `ArchiveModel`.
      Apply its confirmed archive state to the list without opening a
      workspace. Use the open workspace's existing flow for its own row.
- [ ] Check the development fake's existing rename route and align it only
      where it differs from the real route.
- [ ] Add a focused test for the rename write and preservation of a newer
      unrelated workspace update. Use the existing test services.
- [ ] Cover the owner-only confirmation and an unopened row's Archive result
      at the model layer. Keep only cases not covered by existing tests.
- [ ] Run the targeted tests, typecheck, lint, and format checks.

## Milestone 4: Workspace row menu

Tags: ui

Depends on: 3

Action: `ui implementor`.

Implement the approved mockups for the shared row in the sidebar and list.
Reuse the existing move, member, rename, and Archive actions.

- [ ] Check `@firna/ui`, then the existing menu and point-menu components.
      Reuse suitable parts and avoid a second workspace menu definition.
- [ ] Add right-click and More entry points with keyboard focus, Escape,
      outside-press dismissal, window bounds, and no sidebar clipping.
- [ ] Add submenus to the reused app menu. Cover pointer hover, the right
      and left arrow keys, Escape, and choices that replace a phone sheet.
- [ ] Reuse the row-control styles for More and Rename. Draw the real menu
      above the page. The mockup point offsets only place static examples.
- [ ] Show More on hoverless screens as well as phone layouts, including
      touch screens that use the desktop layout.
- [ ] Add the existing local menu keys. Use `ownPress` on More. Let the
      shared drag context handler end mouse presses and keep touch presses.
      Cover that shared change in the existing pointer-drag tests.
- [ ] Connect section choices, member choices, Rename, and Archive to the
      target workspace. Keep the current workspace open when the menu opens.
- [ ] Reuse the existing permission checks, active and archived rules, and
      org suspension handling. Close obsolete choices when access changes.
- [ ] Keep drag, touch hold, modified-click navigation, and palette layer
      behavior. Restore focus to the row or More button after dismissal.
- [ ] Add focused interaction tests for target identity, permissions,
      Rename save, cancel, empty draft, and failure, and the existing Archive
      confirmation flow. Check a failed saved-work read without bypassing
      confirmation. Keep each requirement at one test layer.
- [ ] Extend an existing drag regression test only if the new menu changes
      an interaction that it does not already cover.
- [ ] Run new asynchronous and DOM tests ten times, as the testing skill
      requires. Record their times and the failures seen before the fix.
- [ ] Run the targeted checks and smoke-test the menu in the browser.
      Check pointer placement, keyboard access, a phone layout, and a
      scrolled sidebar. Save evidence under `.context/workspace-context-menu/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

Action: `default orchestrator`.

- [ ] Run the early checks and `npm run check` on the complete implementation.
      Install root, desktop, and runner dependencies as `AGENTS.md` requires.
- [ ] Review the final diff for scope, preserved functionality, protocol
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

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, use Archive from a stopped workspace's row.
      Check that any failed saved-work read leaves the workspace intact and
      offers useful recovery. Record the provider's actual reply. Propose a
      separate fix if needed. Add no automatic resume without a user decision.
