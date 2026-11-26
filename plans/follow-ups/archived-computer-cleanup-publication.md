# Cleanup leaves archived computer evidence stale

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-21, from branch `calummoore/follow-up-archived-computer-certainty-irrm`, review finding 1. A finding check of the same day confirmed it, corrected its severity to Low, and added the options D, E, and F.
- **Location:** `worker/lifecycle/archive-state.ts:225-247` (the publication of the Archive owner, and its alarm delete at line 238), `worker/data/archived-computer.ts:6-17` (`archivedComputerColumn`), `worker/lifecycle/workspace-alarm.ts:240-262` (`advanceCleanup`), `worker/lifecycle/start-failure.ts:138-195`, `worker/lifecycle/start-allocation-cleanup.ts:16-85`, `worker/lifecycle/allocation-recovery.ts:15-21`, `worker/lifecycle/cleanup.ts:89-102`, `worker/lifecycle/archive-retry.ts:6-30`, `src/app/workspace-detail.ts:62-82` (`lifecycleReplyDetail`), and `src/app/workspace-detail-order.ts:129-195`.
- **Reason:** The defect is rare and costs little, and its fix changes the Archive owner, outside the files of the branch that found it.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Archive owner:** `WorkspaceArchive` in `worker/lifecycle/archive-state.ts`, which keeps or deletes the cloud computer of an archived workspace and publishes its record.
  - **Computer ledger:** the D1 table `computer_ledger`, with one row for each create request of a cloud computer, its ID, its `deleted_at` date, and its `create_rejected` flag.
  - **`archivedComputer`:** the field of an archived workspace record that says what the Worker knows of its cloud computer: `may-exist`, `deleted`, or `unknown`.
  - **Failed-start cleanup:** the retried delete of the cloud computer of a failed first start, which the `lifecycle:cleanup` alarm of the workspace Durable Object runs.
  - **`workspace.updated`:** the event that gives each open tab the current workspace record, whose `updatedAt` timestamp orders list records and lifecycle replies.
- **Background:**
  - Archive makes a workspace read-only and keeps its cloud computer for 14 days. Restore brings the workspace back, stopped, during those days.
  - An archived workspace whose row names no computer offers no Restore. The app refuses such a Restore with HTTP 409.
  - `archivedComputerColumn` computes the state in D1 at each read. Only ledger rows with the org, the purpose `workspace`, and the workspace ID count.
    - `may-exist`: the workspace row has a computer ID, or a ledger row has no `deleted_at` and no refusal.
    - `deleted`: not `may-exist`, and a ledger row with a computer ID has a `deleted_at`.
    - `unknown`: neither of these.
  - The state is not stored. The task for the branch that added `archivedComputer` required the read-time projection of option B. It required no stored computer outcome. This records the task's scope, not a choice by Cal.
  - The bar words of the known states live in `src/shell/workspace/notice-copy.ts:75-120`. The standalone chat bar uses the same words, at `src/chat/components/SandboxState.tsx:104-144`.
    - `may-exist` before the last day, without Restore: "Your chat history is available. It leaves the list on <day>."
    - `may-exist` after the last day: the title "Removed on <day>", and "It left the list. Its cloud computer is being deleted, and the chat is read-only."
    - `deleted` before the last day: "Its cloud computer is deleted, and the chat is read-only. It leaves the list on <day>."
    - `deleted` after the last day: the title "Removed on <day>", and "It left the list. Its cloud computer is deleted, and the chat is read-only."
  - `unknown`, and a record without `archivedComputer`, keep the reading of `origin/main`: Restore from the legacy `Workspace.restoreUntil` alone. With a null legacy value, the bar says that the cloud computer is deleted. `plans/follow-ups/archived-computer-unknown-outcome.md` owns those words.
  - Before `archivedComputer`, a record with no computer ID said "Its cloud computer is deleted" at once. The `may-exist` stage adds a later change of the bar, and nothing publishes that change.
  - The Archive section of `docs/protocol/workspace-life.md:151-158` gives two requirements:
    - "The bar says that the cloud computer is deleted only after the delete. Before that, the bar of a removed workspace says that the cloud computer is being deleted."
    - "An archived workspace can have no kept sandbox while a create or a delete of its cloud computer is still open." Until Restore ends, its bar then promises only its chat history.
  - How an open tab learns of a new record:
    - The detail reads the workspace only at open and at Resume, at `src/app/workspace-model.ts:118-147`.
    - The list reads again every 30 seconds while a screen shows it, at `src/app/org-waits.ts:19`.
    - `lifecycleReplyDetail` drops a list record whose `updatedAt` is not greater than the shown one, at `src/app/workspace-detail.ts:66`.
    - A `workspace.updated` event with an equal `updatedAt` already updates the open detail and the list. Events apply in the order of their event numbers, at `src/app/workspace-detail-order.ts:129-146`.
    - `updatedAt` stops only a record below the newest shown Archive or Restore, or from the other side of that boundary, at `src/app/workspace-detail-order.ts:189-195`. The list takes the event record at `src/app/list-changes.ts:33-49`. So an event needs no timestamp bump.
    - A bump of `updatedAt` also shows a recent time on the archived list row, at `src/shell/list/RowContent.tsx:74`.
  - Which code can publish the change:
    - The Archive owner publishes `workspace.updated` when the whole record differs from its last published copy, at `worker/lifecycle/archive-state.ts:225-237`. A failed publication uses its retry.
    - The lifecycle journal dedupes on the state, the start, and the error only, at `worker/lifecycle/durable-journal.ts:35-40`. `persistLifecycleState` skips archived rows, at `worker/lifecycle/workspace-data.ts:243`. So that path drops a change of `archivedComputer` alone.
    - The repair Cron Trigger wakes only archived rows that name a computer, at `worker/lifecycle/repair-data.ts:10`. It never wakes the Archive owner of this case.
    - The Archive owner backs off after failures: 30 seconds, doubled after each failure, up to one hour, at `worker/lifecycle/archive-retry.ts:6-30`. A successful pass clears that count, at `worker/lifecycle/archive-state.ts:221-224`.
    - In one alarm run, the Archive pass runs before the failed-start cleanup, at `worker/lifecycle/workspace-alarm.ts:84` and `:104-107`.
- **Problem:** An Archive during the failed-start cleanup publishes `may-exist` once, then the Archive owner deletes its alarm. The cleanup later writes `deleted_at` or the refusal flag, with no change of `updatedAt` and no `workspace.updated`. The open tab keeps `may-exist`, because the list read drops a record with the same `updatedAt`.
  - The trace, from the source:
    1. A first start fails after its create call. The failed-start path clears the computer ID of the workspace row, at `worker/lifecycle/start-failure.ts:144-158`. With a known computer ID, it also records the cleanup.
    2. With a known ID, the immediate delete fails, at `worker/lifecycle/start-failure.ts:176-195`. Without an ID, because the create reply never came, the job waits for a deferred allocation cleanup, at `:138-142`.
    3. Either way, `retryFailedCreateCleanup` sets the `lifecycle:cleanup` alarm 5 seconds later, at `worker/lifecycle/workspace-controller.ts:244-249`. The alarm then retries every 30 seconds.
    4. `complete` in `worker/lifecycle/start-storage.ts:164-202` deletes the start job.
    5. The user archives the workspace while the delete retries. `beginWorkspaceArchive` finds no computer ID and no start job, at `worker/lifecycle/archive-begin.ts:29-36`.
    6. The Archive owner reads the record. The live ledger row gives `may-exist`. The owner publishes the record, then deletes its alarm because the row names no computer, at `worker/lifecycle/archive-state.ts:225-238`.
    7. The cleanup confirms the delete and writes `deleted_at`, at `worker/lifecycle/cleanup.ts:101`. The state becomes `deleted`.
    8. Or the deferred allocation cleanup gets the provider's proof that no computer exists. It writes `create_rejected = 1`, at `worker/lifecycle/allocation-recovery.ts:15-21`. The state becomes `unknown`, or `deleted` when an earlier attempt has a recorded delete.
    9. Both cleanups end at `worker/lifecycle/workspace-alarm.ts:248-256`, with no `updated_at` change and no event.
    10. The open bar keeps "Your chat history is available." until the last day. After the 14 days, the clock of the page moves it to "Its cloud computer is being deleted".
- **Impact if no action:** The open bar keeps the old evidence until a reload, a reopen, or another `workspace.updated`. A page that stays open past the 14 days says "being deleted" after the delete completed.
  - The severity is Low. Before the last day, the stale words stay true. Restore correctly stays unavailable, a reopen repairs the bar, and no data is lost.
- **Root question:** How does an open archived workspace learn each later change of its computer evidence?
- **Options:**
  - **A.** When the failed-start cleanup completes, advance the workspace `updatedAt` and publish the current record. Add a regression for an Archive followed by a successful cleanup.
    - It fixes this path only. Each other cleanup caller stays responsible for its own notice.
    - Like B, it must publish through the Archive owner. The bump shows a recent time on the archived list row.
    - Effort: Small.
  - **B.** Route each workspace cleanup completion through one shared operation. It advances `updatedAt` and uses the durable publication retry of the Archive owner.
    - Use it for recovered allocations and for the cleanup of a known computer. Add the same regression. Keep the legacy `Workspace.restoreUntil` as it is.
    - It adds no stored computer outcome and no migration. It must publish through the Archive owner, because the lifecycle journal drops a change of `archivedComputer` alone.
    - A later cleanup writer needs its own call. The bump shows a recent time on the archived list row.
    - Effort: Medium.
  - **C.** Read the detail of an open archived workspace again at an interval while its state is `may-exist`. Add a controller regression for the read.
    - It adds requests from each open tab. The bar changes only at the next read.
    - Effort: Medium.
  - **D.** When the failed-start cleanup ends, call the existing `WorkspaceArchive.repair` for its workspace, at `worker/lifecycle/archive-state.ts:49-60`.
    - The Archive owner then reads the record again. It publishes the record only when it changed, with its own retry.
    - It needs no timestamp bump and no new event code. Each writer outside this alarm must make the same call.
    - Effort: Small.
  - **E.** Let the Archive owner follow the evidence. While the row names no computer and its published record says `may-exist`, the owner keeps its alarm with a backoff.
    - This replaces the alarm delete at `worker/lifecycle/archive-state.ts:238`. Each pass publishes only a changed record.
    - It follows every writer, also a later cleanup driver of `plans/follow-ups/unresolved-computer-request-ownership.md`. It needs no timestamp bump and no change of cleanup ownership.
    - Its costs are a delay of up to one interval, and a periodic alarm with D1 work while the evidence stays open.
    - A live ledger row that no owner resolves keeps the alarm running, so it needs the backoff.
    - Effort: Medium.
  - **F.** Advance the `updated_at` of the archived workspace in the same D1 batch as each ledger write of `deleted_at` or a refusal.
    - The 30-second list read then repairs the open detail through `syncLifecycle`, at `src/app/workspace-detail-order.ts:174-183`.
    - It sends no event, so it reaches only a page whose screen shows the list.
    - Build, image, and Delete org cleanups use the same ledger helpers in `worker/lifecycle/computer-ledger.ts`. So the update must match only archived workspace rows.
    - The bump shows a recent time on the archived list row.
    - Effort: Medium.
- **Left out:**
  - Doing nothing leaves the stale bar.
  - A bar that reads a delete from an unavailable Restore. An unavailable Restore proves no delete, so the bar would again claim a delete that the app did not record.
  - A stored computer outcome. It conflicts with the read-time projection that the task required.
  - A move of the pending failed-start cleanup into the Archive owner. It gives the same notice as E, and it also changes a live cleanup owner on `origin/main`.
  - A client that takes a list record with an equal `updatedAt`. It can show an older record over a newer event, which the detail order forbids, at `src/app/workspace-detail-order.ts:27-37`.
- **Wider fix:** E. The owner of the archived record follows its evidence for every writer, so a new writer needs no call. The first pass of the review named B.
- **Previous examples:** Commit `8eaf4b21e` set the pattern for a kept computer. `detachArchiveDisk` advances `updatedAt` when it detaches a deleted computer, at `worker/lifecycle/archive-data.ts:102-130`. The Archive owner then publishes the record, at `worker/lifecycle/archive-state.ts:225-237`. No earlier report of this cleanup omission was found.
- **Related:**
  - `plans/follow-ups/archived-computer-unknown-outcome.md` owns the words of `unknown` and of a record without `archivedComputer`. E publishes a move to `unknown`, and the bar then shows the words that that item keeps. Neither item waits for the other.
  - `plans/follow-ups/unresolved-computer-request-ownership.md` plans a shared cleanup driver, which is one more writer of `deleted_at` and refusals. E follows that writer with no extra call. Neither item waits for the other.
- **Recommendation:** E. It follows every writer through the existing Archive publisher, with no change of cleanup ownership or of `updatedAt`. The first pass of the review recommended B.
- **Action:** fix after merge, apply E, because this rare notice defect reaches Archive maintenance outside the branch that found it, and needs no wire-format change.
  - No user decision is needed. The fix rule selects E as the best structural option that is not blocked. E adds no requirement. It makes the bar follow the evidence that the requirements above describe.
  - The work keeps these limits:
    - Change only when the Worker publishes a record. Keep the words of every state.
    - Keep the words of `unknown`, and of a record without `archivedComputer`, exactly as on `origin/main`. This holds for the app bar and for the standalone chat bar.
    - Add no stored computer outcome, no wire field, and no migration. Keep each cleanup owner as it is.
    - Do not change `updatedAt` for a change of the evidence.
    - Publish through the Archive owner, not through the lifecycle journal.
    - Keep the pending-evidence backoff separate from the failure `retry`, which a successful pass clears. Use a cap. The one-hour cap of `worker/lifecycle/archive-retry.ts` is one choice.
    - End the alarm when the published record leaves `may-exist`, and when the Archive state ends. Keep the current alarm of a row that names a computer.
  - The regression requirement:
    - A Worker test beside `worker/lifecycle/archived-computer.test.ts`. It runs the Archive owner and the failed-start cleanup with local D1 and the fake provider servers.
      - A first start fails, and its immediate delete fails. Then the user archives the workspace. The published record says `may-exist`.
      - The failed-start cleanup confirms the delete. The next Archive pass publishes one `workspace.updated` with the state `deleted`. `updated_at` does not change, and the Archive alarm then ends.
      - A deferred allocation cleanup gets the provider's no-allocation proof. The next Archive pass publishes the state `unknown`, and the alarm ends.
      - A pass with no change publishes nothing. It moves the next pass later by the backoff.
    - A client test beside `src/app/workspace-restore-order.test.ts`. An open archived detail and its list row take a `workspace.updated` event with the same `updatedAt` and a new `archivedComputer`. E depends on this behaviour, and no client test found covers it.
  - The checks for that work: the new and changed tests with `npm run test -- <files>`, then `npm run check`.
