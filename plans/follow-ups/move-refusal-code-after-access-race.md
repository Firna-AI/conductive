# Move refusal code after an access race

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from branch `calummoore/conductive-mcp-nested-agents-iet3`, the check of review finding 3.
- **Location:** `worker/app-api/workspace-metadata.ts:54`
- **Reason:** The same recheck already serves section-only tool moves on `main`, so the fix belongs in its own branch.

- **Terms:**
  - **Recheck:** the reads in `changeWorkspaceMetadata` that run after a move batch changed nothing, to choose the error of the reply.
- **Background:** A workspace move through the tools checks the sender's access, then writes in one D1 batch that repeats the check. When the batch changes nothing, `changeWorkspaceMetadata` runs `requireShellWriter` and `requireWritableWorkspace` again to pick the error. `docs/protocol/agent-tool-access.md` says that a tool sender who lost membership gets 403 `membership_required`.
- **Problem:** When the sender loses membership or is suspended between the early check and the batch, the recheck gives 404 `org_not_found` or 403 `user_suspended`, not 403 `membership_required`.
- **Impact if no action:** In a rare race, an agent gets an error code that the protocol does not name for this case. Nothing changes in the data.
- **Root question:** Which error does a tool move give when the sender lost access during the call?
- **Options:**
  - **A.** Map the recheck errors of a tool call to `membership_required`, as the early tool check does. Add a race test. Effort: Small.
  - **B.** Use the same access reader for the tool call before and after the batch. Effort: Small.
  - **C.** Change the protocol to accept the recheck codes. Effort: Small.
- **Left out:** None.
- **Wider fix:** None found. It is one recheck.
- **Previous examples:** None found.
- **Recommendation:** B. One reader gives one error rule.
- **Action:** fix after merge, apply B, because the problem is on `main` already and outside this change.
