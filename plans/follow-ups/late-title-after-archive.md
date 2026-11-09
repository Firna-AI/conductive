# A late title renames an archived workspace's chat

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from review round 3, finding 5, on the branch `calummoore/chat-title-rename`, which names new workspaces with a Workers AI model.
- **Location:** `worker/chat/workspace-titles.ts:75`, the completion of the title request, and `worker/chat/workspace-title.ts`, `storeWorkspaceTitle`.
- **Reason:** The bug needs an Archive in the second after a workspace is created, before the model answers, and the fix is no harder after the merge.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Title request:** the call that the Worker makes to a small Workers AI model when it accepts the first message of a new workspace. The user chose it on 8 November 2026 as decision 146 C of the workspace title plan.
  - **D1:** the Cloudflare database that holds the workspace names that the lists show.
- **Background:** The Worker asks for the title in the background, after the create answers. The model answers in about a second, at most 15 seconds. The completion then saves a `workspace.title` event in the chat, renames the first session, and writes the D1 name. The D1 write only changes a workspace that is not archived. "An archived workspace shows its chat read-only (decision 16)", as `docs/protocol/chat-and-events.md` says. A review reproduced the case through the production Archive route: after Archive returned HTTP 200, the list showed `delft`, and the detail view and the first session showed `Fix archived chat title`.
- **Problem:** A title reply that arrives after Archive still changes the archived chat and the first session, but not the D1 name.
- **Impact if no action:** The Archived list and the workspace detail show different names for that workspace, for good.
- **Root question:** How does a title reply that arrives after Archive leave one name in the Archived list, the workspace detail, and the first session tab, and no change in the archived chat?
- **Options:**
  - **A.** Check the archive state inside the queued completion, and discard a late reply before it saves. Add a regression test. Effort: Small.
  - **C.** Give both title sources, the Worker request and a runner `workspace.title`, one completion operation. It checks the target state before it saves the title and the session update, with the same condition as the D1 title write in `worker/chat/queries.ts`: not archived, and an active org. Add the regression test in `worker/chat/integration/workspace-title-request.test.ts`, whose fixture holds the model reply until the test releases it. Effort: Medium.
  - **D.** Archive aborts the pending model call and sets a flag that the queued completion reads. Archive then must know the title code. Effort: Small.
  - **E.** The Worker completion writes the D1 name first, with its guard, and saves the chat title only when that write changed a row. The two title sources then save in different orders. Effort: Medium.
  - **F.** The chat store gets a read-only state after Archive, for every writer. It adds a refusal, which needs the user. Effort: Large.
- **Left out:** Cancellation alone, because a reply can already wait in the chat queue. A filter in the readers, because the open tabs apply the live events at once.
- **Wider fix:** C. One completion rule for every title source.
- **Previous examples:** None of a title after Archive. Commit `2eda9a1` checks the current access of a workspace before a write.
- **Related:** Decision 144 of the workspace title plan, still open, adds a second rule for when a title applies. C is the place for both rules. The follow-up item `plans/follow-ups/workspace-title-from-sandbox-unchecked.md` can remove the runner title source, and C then has one caller.
- **Recommendation:** C. It follows the existing pattern of a D1 check in the chat queue before a save, and it keeps the chat-first recovery that `origin/main` tests.
- **Action:** fix after merge, apply C, because the bug needs unusual Archive timing and the fix is no harder after the merge.
