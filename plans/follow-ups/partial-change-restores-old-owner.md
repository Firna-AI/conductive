# Partial changes restore older workspace fields

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/workspace-status-icons`, review round 1. The check of finding 1 found it outside the scope of that branch.
- **Location:** `src/app/workspace-detail-order.ts:127` and `:193`, `src/app/workspace-model.ts:220`, `src/app/list-changes.ts:21`, `worker/members/ownership.ts:27` and `:50`, `worker/members/membership.ts:66`, and `worker/lifecycle/ownership-maintenance.ts:3`.
- **Reason:** The owner case exists on main. The new summary case needs rare reply ordering. One later field-specific update fix covers both without holding the workspace-mark merge.

- **Terms:**
  - **Workspace:** a Conductive workspace has one branch at a time, a cloud computer, and chat sessions.
  - **Kept record:** the record of the open workspace that `DetailOrder` in `src/app/workspace-detail-order.ts` holds for one tab.
  - **Partial change:** a change of one part of the kept record: a `workspace.title` event, a `start.updated` event, or a read mark that clears unread output.
  - **List read:** the read of the sections and workspaces of an org, every 5 to 30 seconds and when the person comes back to the window.
  - **Reassign:** the change of the workspace owner, from the owner picker of the header or Reassign to in the row menu.
- **Background:**
  - An admin reassigns a workspace through `reassignWorkspace` in `worker/members/ownership.ts`. A member removal or a leave moves each workspace of that member through `worker/members/membership.ts:66`.
  - Both paths call `workspaceOwnerChanged`. Its hook in `worker/lifecycle/ownership-maintenance.ts` reruns the access check of the workspace object. It publishes no `workspace.updated` event.
  - Renames, moves, and section deletes publish that event through `publishWorkspaceMetadata` in `worker/workspace.ts`. So every open tab follows them.
  - The owner write sets `updated_at` to the later of the old time and the write time, in `worker/members/ownership-data.ts`.
  - The tab that reassigns puts the new owner into its own kept record, at `src/app/workspace-model.ts:167`. Every other tab of the workspace gets no change.
  - A list read in such a tab shows the new owner. `DetailOrder` follows the list only for the archive fields, through `syncLifecycle`. So the kept record keeps the old owner.
  - `DetailOrder.event` and `DetailOrder.local` pass each partial change to `show`. `show` sends the whole kept record to `OrgModel.putWorkspace`, at `src/app/workspace-detail-order.ts:193`. The read mark of `clearUnread` in `src/app/workspace-model.ts:220` takes the same path.
  - `workspaceUpdated` in `src/app/list-changes.ts` puts that record into the list row. It keeps the section and the GitHub summary on the same branch. A record for another branch brings its own summary. It takes every other field, also the owner and `updatedAt`.
  - `Resource.confirm` keeps that put over each list read that started before it. The next list read that starts after it shows the new owner again.
  - `docs/protocol/workspace-menu.md` says that each action changes only its own part of the workspace. It also says that the reply to an action does not bring back an older value of another part.
  - On 11 November 2026, the workspace-mark integration added Continue. Its D1 branch move clears the summary, summary writes match the committed snapshot branch, and full list updates take a record's summary when branches differ.
  - A separate confirmed Medium/Rare occurrence remains. Hold a read-mark reply from old unread detail. Let a list poll show the new Continue branch with `github: null`, before its `workspace.updated` event reaches that tab. Release the old mark. `clearUnread` calls `DetailOrder.local`, `show` sends the whole old record, and `workspaceUpdated` restores its old branch and summary. The list, palette, and linked chips can show the old check or merge colour until the event or a later poll corrects it.
  - The rare summary path is established at `src/app/workspace-model.ts:220`, `src/app/workspace-detail-order.ts:193`, and `src/app/list-changes.ts:35`. The tab follows list archive fields only. `Resource.confirm` keeps the stale put over reads started before it. Existing `src/app/workspace-summary-order.test.ts` covers same-branch read marks and a new-branch event, but not this delayed mark order.
  - A fresh independent check confirmed Medium/Rare for the summary occurrence. Ordinary stream/list order does not create a lasting window: unread exists near an open, and Continue normally emits its event milliseconds after D1. The case needs a delayed open mark or hidden unread detail plus a dropped stream or late publication. It is deferred under the rare-product-bug rule. The older owner case has no owner-change event and a longer stale-record window.
- **Problem:** Another person reassigns a workspace that is open in a tab. A later partial change can put its old owner and activity time back into the list. A title or start-step event takes that full-record path. A read mark can do so only while the kept record is unread, normally between the open reply and its first confirmed mark. Returning to a hidden tab after stream output does not by itself reach that read-mark path: stored stream records never carry the per-viewer unread state. The values stay until a later list read, up to 30 seconds.
- **Impact if no action:** For that time, the row shows the wrong owner: Reassign to in its menu marks the old owner. The menu can also offer Archive to the old owner and hide it from the new owner. The server refuses a wrong Archive with `archive_forbidden`, so no data changes. The Leave org count of owned workspaces can also be wrong. This is the same visible harm as an older GitHub colour in a row, with the server refusal as the workaround.
- **Root question:** How does a partial update change only its own list fields, while newer owner, branch, summary, and activity fields stay?
- **Options:**
  - **A.** Send only the owned fields of a partial change to the list. A title sends the name, a read mark sends the state, and a start step sends nothing. Replace the generic `updateList` flag with an explicit list change and map each partial event to its owned field. Give each field change its own resource key, so it cannot replace the layer of a newer full record. Reuse the field changes of `src/app/list-changes.ts`, such as `workspaceRenamed`. Keep full records for reads, Resume replies, and `workspace.updated` events. Extend existing tests: after a new-owner list read, a title keeps that owner. Hold an old read-mark reply, poll the continued branch with a null summary, release the mark before the event, and verify that the branch and summary stay. Keep the valid new-branch event and same-branch summary cases. Effort: Small.
  - **B.** Follow the listed owner into the kept record before a partial change, as `syncLifecycle` follows the archive fields. The header then also shows the new owner after the next list read. Cost: a second sync rule, which must not put the record back into the list. It covers the owner only. Effort: Small.
  - **C.** Publish the existing `workspace.updated` event after each owner change, as `publishWorkspaceMetadata` does after a rename. Every open tab, its header, and its kept record then show the new owner at once. Cost: a Worker change in the reassign and member removal paths. No protocol requirement names an event for a reassign, so the user reviews the new event first. Effort: Small.
- **Left out:**
  - A merge that keeps the newer record by `updatedAt` stays out. A read mark changes the state of an older kept record, so the merge would keep unread output in the list. The GitHub summary also changes without a new time.
  - Changing nothing stays out, because the row keeps going back to the old owner.
- **Wider fix:** A. A partial change that sends only its own fields cannot bring back any field that changed without an event.
- **Previous examples:** Commit `8eaf4b21` added field merges for Archive and Restore in `src/app/list-changes.ts`, so their replies keep newer names, owners, and sections. Commit `ebfc286b` added the flag that keeps the menu's own name and owner changes of the kept record out of the list. Branch `calummoore/workspace-status-icons` keeps the GitHub summary of a row in `workspaceUpdated` for the same class.
- **Related:** `plans/follow-ups/workspace-menu-state-after-actions-change.md` also covers list changes after a reassign. Its cause is the focus and the busy state of an open menu, so it stays a separate item.
- **Recommendation:** A. It enforces the protocol rule that a change touches only its own part, with a small change in the app. C also refreshes the header of other tabs, but it adds an event that needs the user.
- **Action:** fix after merge, apply A. It covers the existing owner class and the new rare summary ordering occurrence in one later branch.

## Additional option from the independent check

- **D.** Order only branch and summary changes by `updatedAt`. Take a different branch only when its time is strictly newer, and make Continue raise its time strictly. Add the delayed mark and older full-read cases to the summary-order test, plus a Continue timestamp assertion. Effort: Small. This also covers old full records, but it adds a Worker ordering rule and leaves owner/activity copying unresolved. A remains the recommended structural fix.
