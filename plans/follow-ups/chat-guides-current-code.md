# Seven chat guides describe replaced code

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from PR #53, branch `conductor/boat-native-remote-workspaces-milestone-8m`, implementation item 9, with round 1 finding 12, which repeats it for four of the seven guides.
- **Location:** `worker/chat/tests.md:16-17`, `worker/chat/history.md:20-24`, `src/chat/transcript.md:49-51`, `src/chat/README.md:141-148`, `:237-238`, and `:253-254`, `src/chat/sessions.md:28-30`, `worker/chat/README.md:47`, and `worker/app-api/README.md:31-34`.
- **Reason:** The task that built this branch allowed doc edits only in four named docs. So these seven guides wait for an answer on the delivery scope.

- **Source:** Implementation, with a review that repeats it. **Category:** Docs or spec.
- **Terms:**
  - **Event number:** the server number that orders the stored changes of a workspace, which each reply, read, and event carries for its state.
  - **Pending edit:** a rename, or a model change of the same agent, that the chat shows at once, before its reply.
  - **Source link:** a relative Markdown link from a guide to the source file whose comment explains the mechanics.
- **Background:**
  - Conductive is a coding tool with chat tabs for agent sessions. This branch changed five things that these guides describe. They are the rollback test controls, the history pages, the record order, the reply record rule, and the ordered workspace read.
  - The task that built the branch had the rule "Change only the files that your scope owns". Its doc scope named four files: `src/app/README.md`, `worker/chat/integration/README.md`, `worker/lifecycle/README.md`, and `worker/lifecycle/workspace-object.md`. The branch updated those four.
  - So the seven guides below need a wider scope before any agent of that task edits them.
  - The protocol stays true: `docs/protocol/chat-and-events.md` says that a tab that opens gets the stored history first, then the live events. No protocol change is needed.
  - Only developers meet this drift. The type checker rejects the removed names, and the comments next to the code are correct.
  - Tests guard the current rules: `src/chat/state/stale-records.test.ts` for the record order, and `worker/chat/history-pages.test.ts`, `src/app/events.test.ts`, and `src/chat/state/history.test.ts` for the pages.
  - A review check confirmed the drift on 2026-11-08 and graded it Low.
  - Design call, 2026-11-08: the orchestrator of Milestone 8m chose one current record-order rule in `src/chat/README.md`, with source links for the mechanics. Reason: the documentation skill puts mechanics in the code. An in-place copy of the edit rule turns false when the fix in [chat-session-record-owner.md](chat-session-record-owner.md) lands.
- **Problem:** Each guide states a rule that the current code does not follow:
  1. `worker/chat/tests.md:16-17` says "Set `failCommit` or `beforeCommit` to test a failed or a late commit." `failCommit` is gone from `worker/chat/memory-storage.test-support.ts`. A rollback test now uses `checkCommitBoundaries` in `worker/chat/commit-boundary.test-support.ts`.
  2. `worker/chat/history.md:20-24` says that a tab gets "one `history` message", and that "the history read" runs in the queue. `subscribeBrowser` in `worker/chat/browser-subscription.ts` now sends one or more pages, until `hasMore` is false, in one queue task.
  3. `src/chat/transcript.md:49-51` names `SessionLog.takeListed`, which is gone. `SessionLog.offer` in `src/chat/state/session-log.ts` now takes the record of a read or a reply, with its event number.
  4. `src/chat/README.md:141-148` says that records "carry no order from the server", so that the chat counts a local version for each session. The chat now orders the records by event number, with pending edits, in `src/chat/state/session-records.ts`.
  5. `src/chat/README.md:237-238` and `:253-254`, two Key code entries, still name `takeListed` and "the local versions".
  6. `src/chat/sessions.md:28-30` says that a reply record of a linked session "shows only while no other record of it came". It adds "so a record from the stream or an action wins". `takeReply` in `src/chat/state/linked-replies.ts` now takes the reply record by its event number, for any session. So an older stream record loses.
  7. `worker/chat/README.md:47` says that `Workspace` has "two trusted RPCs with no HTTP path". `readChatWorkspaceResponse` in `worker/workspace.ts` is a third.
  8. `worker/app-api/README.md:31-34` says that `readChatWorkspaceSummary` gives the reader state of the lifecycle replies. A read or a Resume reply now takes the summary from the same `readChatWorkspaceResponse` call as its record, in `worker/app-api/lifecycle.ts`.
- **Impact if no action:** A developer can follow a removed test control or method, or build the wrong record order or history replay. The false text stays until a later change edits these guides.
- **Root question:** Do the fixes of these seven guides join this branch, or a separate documentation branch?
- **Options:**
  - **A.** Extend the scope of this branch to the seven guides, and apply the checked fix below. It writes one current record-order rule in `src/chat/README.md`, and source links for the mechanics. It changes docs only. Effort: Small.
  - **B.** Give the guide work to the primary orchestrator for a separate documentation branch. The guides stay false until that branch merges. Effort: Small.
- **Left out:**
  - Leave the guides unchanged: they keep false instructions.
  - Revert the code fixes that the guides no longer describe: it undoes approved work and fails the milestone.
  - A new protocol requirement for the record order: it answers another question, where the rule lives, and it needs its own user decision. The guide fix needs no requirement change.
  - Only these two delivery paths fix the guides, so the item has two options.
- **Wider fix:** None. The documentation skill already requires guides to match the changed code. This drift comes from the file scope of the task, not from a missing rule.
- **Previous examples:** The four named docs needed the same alignment, and this branch updated them.
- **Related:** [chat-session-record-owner.md](chat-session-record-owner.md): its fix changes the pending-edit rule in the header comment of `src/chat/state/session-records.ts`. The fix below links to that comment and copies no edit rule. So the guides stay current when that fix lands.
- **Recommendation:** A. It keeps the guide fixes with the code that they describe, in the same review.
- **Action:** ask the user, because only the user can widen the scope that the task rule "Change only the files that your scope owns" sets.

The checked fix of option A changes only false text, and it adds no new rule to the guides. On 2026-11-08 it applied cleanly to these seven guides at commit `4d21f1a`. Every relative link resolved, and no sentence passed 25 words. Check the links again when you apply it.

1. `src/chat/README.md`, under "Rules for this code": the "carry no order" bullet becomes one rule, with these new sentences.
   - "Each reply, read, and event with a session record, or with the workspace record and its start steps, carries the event number of its state."
   - "The newest number wins, whatever arrives first."
   - The sentences about a Resume reply and the steps after an action stay. The sentence about the retry message as an exception goes.
   - A last sentence links to `state/session-records.ts`: "The header of `state/session-records.ts` gives the pending edits of a rename or a model change."
2. `src/chat/README.md`, Key code: the entry of `state/session-log.ts` becomes two sentences.
   - "the event log of each session, with its records in event order and its newest record."
   - "`offer` takes the record of a read or a reply."
   - The `state/session-records.ts` entry becomes "the order of the session records and of the workspace record by event number, and the pending edits of a session."
3. `src/chat/transcript.md`: the `takeListed` bullet becomes two sentences. They link to `README.md#rules-for-this-code` and to `state/session-log.ts`.
   - "A record from a read or a reply counts at the event number of its state, as the record order rule says."
   - "`SessionLog.offer` in `state/session-log.ts` folds it at its place in the event order."
4. `src/chat/sessions.md`: the old reply rule becomes one sentence, with a link to `README.md#rules-for-this-code`. The rest of that bullet stays.
   - "The session record of the reply follows the record order rule."
5. `worker/chat/history.md`: two sentences change. The first links to `../../src/shared/events.ts`.
   - "It gets the stored events after that number in one or more `history` pages, in the shape of `ChatHistoryResponse` in `src/shared/events.ts`."
   - "The history pages and the new subscription run in one queue task."
   - The page loop in `worker/chat/browser-subscription.ts` has no comment to link to. So the guide keeps these corrected sentences.
6. `worker/chat/tests.md`: the `MemoryChatStorage` bullet changes, and a new bullet follows it, with a link to `commit-boundary.test-support.ts`.
   - "Set `beforeCommit` to delay a commit and test a late commit."
   - "To test that a failed commit rolls back the whole receipt of an action, use `checkCommitBoundaries` in `commit-boundary.test-support.ts`."
7. `worker/chat/README.md`: the count becomes "three trusted chat RPCs with no HTTP path". A third bullet links to `../lifecycle/README.md#browser-routes`, which gives the event number and the name of that reply.
   - "`readChatWorkspaceResponse(orgId, workspaceId)` returns the reply of a workspace read or Resume and that summary, as Browser routes says."
8. `worker/app-api/README.md`: the old sentence becomes three sentences, with the same link.
   - "Otherwise, the chat summary of the workspace object and the reader's read mark give working, unread, or ready."
   - "The list and a create reply read it with `readChatWorkspaceSummary`."
   - "A read or a Resume reply takes it from the same read as its record, as Browser routes says."
