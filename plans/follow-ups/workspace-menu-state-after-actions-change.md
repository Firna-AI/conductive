# Menu state outlives its available actions

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/workspace-context-menu`, review finding 1.
- **Location:** `src/shell/list/RowMenu.tsx:76`, `src/shell/list/RowMenu.tsx:80`, `src/shell/list/useRowMenus.tsx:183`, and `src/shell/ui/PointMenu.tsx:146`.
- **Reason:** The visible defect needs a list update to remove the focused item while its menu stays open.

- **Terms:**
  - **Workspace:** One coding task with its own branch and cloud computer.
  - **Org:** A group that shares workspaces and members.
  - **List read:** The refresh of sections and workspaces every 5 to 30 seconds, and when the person returns to the window.
  - **Reassign to:** The menu action that changes a workspace's owner.
  - **Menu lock:** The busy owner state that refuses menu dismissal and other actions until the owner request ends.
- **Background:**
  - Conductive gives workspace rows a right-click menu with Move to section, Reassign to, Rename, and Archive.
  - The user chose these four actions on 9 November 2026. The user also chose no workspace menu button and the existing hover Archive shortcut.
  - `docs/protocol/workspace-menu.md` requires unavailable actions and their choices to disappear. Available actions remain usable.
  - Reassign to keeps the header owner picker's loading, saving, error, and refusal states. A valid running change keeps its result visible.
  - `src/app/org-model.ts` and `src/app/refresh.ts` refresh the list. `src/app/org-waits.ts` gives its wait. A reply can remove a section, archive a row, or change its owner.
  - The org role loads at boot and after the person's own org actions in `src/app/app-model.ts:154` and `:235`. It has no automatic live refresh today.
- **Problem:**
  - `PointMenu` focuses the menu only when it mounts. The phone sheet restores choice focus only while its choices show.
  - A list read can leave only General and remove the focused Move to section item. Focus then falls to the page.
  - An archived-row update can also remove the focused action or its choices while Reassign to remains available.
  - When access removes Reassign to, `RowMenu` removes its choices but keeps the hook's busy state and error. A held request can then lock the surviving menu.
  - The lock case follows from the code and a role change in the existing access test. It has no live role-refresh trigger today.
  - Source inspection confirms both paths. No browser or test run reproduced them during the review.
- **Impact if no action:** Keyboard users must close and reopen a menu after it loses focus. A later live role update could expose the hidden lock.
- **Root question:** How should the menu stay usable when its available actions change?
- **Options:**
  - **A.** Include stable available action IDs in the key of `RowMenu`. Extend the existing access test with focused choices and a held reply. This also remounts on unrelated action changes and drops valid open choices and running results. It changes the current contract. Effort: Small.
  - **B.** Keep one menu instance. Explicitly reset removed submenu state and request ownership, then focus a surviving action. This needs separate recovery paths for the triggers. Add the same regression cases. Effort: Small.
  - **C.** Close the whole menu when available actions change, and focus its row. Require reopening and update the protocol for that behavior. Effort: Small.
  - **D.** Restore lost focus in the shared point menu and the phone sheet after each render. Act only when focus fell to the page. Scope owner state to Reassign to, as the header picker scopes it to `canReassign`. Removing that action clears its busy state and error. Its late reply changes nothing. Keep valid choices and running actions mounted. Extend the existing access test. Effort: Small.
  - **E.** D's focus recovery, with a lock owned by the running action. Release the lock when the action ends or its part unmounts. Scope owner state to the part that exists while Reassign to is available. This needs a restructure of `RowMenu` and the shared `useOwnerChoices`. Effort: Medium.
- **Left out:**
  - Change nothing, because live list reads can remove the focused item.
  - Freeze the actions until the menu closes, because the protocol requires unavailable actions to disappear.
  - Drop the lock and show owner results only in a toast, because the protocol retains the header picker's result states. This also leaves focus loss.
- **Wider fix:** D gives shared menus a correct focus default, whatever removes an item. E is the wider lock design, but only Reassign to sends a request today.
- **Previous examples:** No matching earlier defect was found. Commit `83d065e` scopes header owner state to `canReassign`. `useRowFocus.ts:21` restores row focus. `Overlay.tsx:46` provides an existing hold-and-release pattern.
- **Recommendation:** D. It fixes the known paths without dropping valid action state. The first review recommended A before the independent check.
- **Action:** fix after merge, apply D, because the visible defect needs an unusual list update while a menu is open.

The future fix must extend `src/shell/list/RowMenuAccess.test.tsx` rather than add one test for each trigger.
Check focus after the role change, the reload to one section, and the archived-row reload.
Hold an owner reply across loss of Reassign to and check that the remaining menu works.
Keep owner choices and their result when an unrelated action disappears.
Keep the existing behavior that a dropped owner's late reply changes nothing.
The list read shows the new owner within 30 seconds.
Prove the regression assertions fail before the fix, then repeat the changed asynchronous test ten times.
Check the point menu and phone sheet in a real browser.
