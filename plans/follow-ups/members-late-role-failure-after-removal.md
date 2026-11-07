# Late role errors survive member removal

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #36, review finding 1.
- **Location:** `src/members/membersStore.ts:166`, `src/members/membersStore.ts:113`, `src/members/membersStore.ts:135`, `src/members/MembersTab.tsx:70`.
- **Reason:** The defect needs a role reply that fails after the removal of its member, and it changes no saved data.

- **Terms:**
  - **Members tab:** the org settings screen in `src/members/MembersTab.tsx` where an admin invites people, changes roles, removes members, and cancels invites.
  - **Members store:** the state in `src/members/membersStore.ts` that applies each API reply of the Members tab, and holds its failures and its open removal dialog.
  - **Pending key:** the key of one change, such as `role:priya`, which `pendingKey` builds from the action and its target.
  - **Owner:** the member or the invite in the loaded list that a change acts on, such as Priya for `role:priya`.
  - **Write path:** the `update` function of the members store at `src/members/membersStore.ts:135`, which each change of the loaded state goes through.
- **Background:** The members store keeps each failure under its pending key. A change that starts drops only its own failure, so the replies of other changes keep it. A removal that works also drops the earlier role failure of its member, because the admin cannot retry that change. The Remove button at `src/members/MemberList.tsx:55` has no busy state. So an admin can remove a member while the role change of that member runs.
- **Problem:** Start Priya's role change, then remove her before the role request fails. The failure branch of the store's `run` function then adds `role:priya` at `src/members/membersStore.ts:166`, after the removal cleared it. The tab shows the danger notice "The role did not change" with no name, because `failureTitle` at `src/members/MembersTab.tsx:44` finds no member.
- **Impact if no action:** The notice stays until the tab loads again, because the same change cannot run again after the departure. The admin cannot retry the change to clear it, because Priya's row is gone.
- **Root question:** How does the state of a member's change end when the member leaves, in any reply order?
- **Options:**
  - **A.** Drop a late role failure in `run` when its member is no longer in the list. Add a regression with a held role reply. The special case in `withoutMember` stays for an earlier failure. It does not cover a later way to leave, such as a member list that the app shell gives. Effort: Small.
  - **B.** Queue the role changes and the removals of each member. Send a removal only after the role request of that member ends. This delays the removal, and it covers only this overlap. Effort: Medium.
  - **C.** Give each member one store entry that owns its role state and its removal state. Delete that entry when the member leaves, so that a late reply cannot make it again. Include the regression. This changes the state shape and its readers. It also moves member failures out of the pending-key map. Effort: Medium.
  - **D.** End the state of each change when its owner leaves, in the write path:
    - A typed table names the owner of each action. Role and remove belong to a member. Cancel belongs to an invite. A new invitation has no existing owner.
    - After each change of the state, `update` keeps only the failures and the open removal dialog whose owner is still in the list.
    - A failure that has no existing owner, such as a failed invitation, stays.
    - Each reply of `run` goes through `update`. So an earlier failure, a late failure, and a later way to leave all end in the same way.
    - `withoutMember` then changes only the members and the workspace counts. Its doc at `src/members/membersStore.ts:94` changes to match.
    - Add the held-reply regression that the steps below give.
    - Add the owner rule to the doc of `failures` at `src/members/membersStore.ts:30` and to the Scope section of `src/members/README.md`.
    - The state shape and its readers stay as they are.
    - Risk: the store has 272 of the 300 lines that the file-length check allows. So the pure helpers may need a new file beside the store.
    - Effort: Small.
- **Left out:**
  - Change nothing: it fails the goal, because the notice stays.
  - Abort the browser request: D is better on every point. An aborted request still reaches the failure branch of `run`, so it still needs the owner check of D. The abort also needs a signal through `src/members/api/client.ts`.
  - Disable Remove while the role change of that member runs: D is better on every point. It changes the visible controls in `src/members/MemberList.tsx`, and it covers only this overlap.
  - Hide the failures of a departed member in `src/members/MembersTab.tsx`: D is better on every point. The store then keeps failures that no reader may show, and each reader must repeat the filter.
  - A dismiss control on each list notice: it fails the goal, because the obsolete notice still shows after a removal that worked.
  - Load the members again after a late reply: a load resets every failure. So it also drops the failures of other changes, which the store must keep.
  - A request library with keyed changes: D is better on every point. The library adds a dependency and a store rewrite for the same rule.
  - An owner check only when a reply comes, in `run`: this is not a separate approach. It is a wider form of A in the same place, and `withoutMember` keeps its special case.
- **Wider fix:** D. It is a structural fix. One owner rule in the write path ends earlier and late failures, for each action and each way to leave.
- **Previous examples:** No earlier case of this exact defect was found. Commit `754705c` recorded a related late-reply defect. A late removal reply closed the removal dialog of another member and hid that member's failure. Commit `5774dc4` fixed it with a store-owned dialog and failures by pending key. In that fix, `withoutMember` clears an earlier role failure after the departure, but it cannot end a failure that comes later.
- **Recommendation:** D. It ends the state of a member's change in one shared place, in either reply order and for each action, at Small cost. The first review pass recommended C. C also prevents the class, but it costs Medium, and it changes the state shape and its readers.
- **Action:** fix after merge, apply D.

The fix keeps these decisions:

- 6 November 2026, recorded option of an earlier item: the members store, not a screen component, owns the open removal dialog and each failure. Commit `5774dc4` applied it on 7 November 2026.
- 7 November 2026, agent call: each stored failure stays under its own pending key. The invite notice shows only the failure of the last submitted email.
- 7 November 2026, agent call: a removal that works drops the earlier role failure of its member. The admin cannot retry that role change after the departure.
- 7 November 2026, agent call: each close request is keyed to its member. A late close request then keeps the removal dialog of another member open.

Add this regression with D:

1. Add one Node test to `src/members/membersStore.test.ts`. Use the existing `holdingFetch` helper.
2. Make Priya's role reply fail, and hold it.
3. Start her role change. Then remove her, and wait for the removal to end.
4. Release the role reply, and wait for the role change to end.
5. Assert that the store has neither Priya nor a failure under `role:priya`.
6. Before you apply D, check that the test fails on the current code.

Keep the two store tests of this area. `a_removal_changes_only_its_own_member_in_either_reply_order` covers an earlier role failure. `other_changes_keep_the_failure_of_the_open_removal_question` covers a late role failure of a member who stays. It also keeps a failed invitation, which has no existing owner.

The fix belongs to the browser. The Worker already answers a role change after the departure with 404 `member_not_found` and the message "The member is not available." `changeMemberRole` in `worker/members/membership.ts` checks the member before the write. `guardedMembersWrite` at `worker/members/guarded-write.ts:18` checks it again after a refused write. `src/members/MembersTab.tsx` keeps reading the store state as it does now. `src/members/MemberList.tsx` keeps its current controls.

The app shell does not mount `src/members/MembersTab.tsx` yet. The dev page and the mounted tests use it. The shell's own tab at `src/shell/settings/MembersTab.tsx` is read-only and does not use the members store. When the shell mounts the tab, it may feed the tab from its member reads in `src/app/org-model.ts`. Those reads run again at entry and at focus. D covers that new way to leave when the new list goes through `update`, but A does not.

Evidence:

- Before commit `5774dc4`, the store kept one failure slot. Each new change and each opened removal dialog cleared it. So the same late failure showed only until the next change.
- Now each failure stays under its pending key until the same change runs again or its member leaves. After the departure, neither can happen.
- The doc of `remove` at `src/members/membersStore.ts:57` and the doc of `failures` at `src/members/membersStore.ts:30` say that the failures of a removed member go. The late reply order breaks both.
- The notice at `src/members/MembersTab.tsx:76` gets no `action`, so it has no dismiss control. A danger notice is an alert, so a screen reader also reads it after a removal that worked.
- No test releases a role reply after the removal of its own member.
- Medium fits, because a reload of the tab clears the notice. Rare fits, because the role reply must fail after a removal that the admin opens and confirms.
