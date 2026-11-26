# One shared set of running workspace states

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/clickable-dropdown-restart-server-6gn7`, review item 6.
- **Location:** `worker/terminal/handler.ts:67`, `worker/lifecycle/runner-lifecycle.ts:56`, `worker/chat/workspace-integration.ts:154`, `worker/data/sandbox-access.ts:12`, `src/app/dev/attachment-message-routes.ts:58`, `src/chat/dev/dev-routes.ts:68`, `src/ui/components/workspace/restartCopy.ts:8`.
- **Reason:** The change reaches files outside the purpose of the Restart branch.

- **Terms:**
  - **Running states:** the workspace states whose cloud computer software runs: ready, working, input, and unread.
- **Background:** Several checks need to know whether the software of a workspace runs. The Restart menu and the Worker check of Restart share `restartableStates` in `restartCopy.ts`. The terminal handler, the runner lifecycle, the chat integration, the SQL access rule, and two dev fakes each keep their own copy of the same four states.
- **Problem:** When one copy changes and another does not, one part allows an action that another part refuses.
- **Impact if no action:** A later change can, for example, offer an action that always fails, or let a terminal connect in a state that the runner rejects.
- **Root question:** Where does the one rule live that says when the software of a workspace runs?
- **Options:**
  - **A.** Keep the separate lists. Effort: Small.
  - **B.** Move the set to `src/shared/workspaces.ts` and use it in each TypeScript check. Build the SQL list of `sandboxAccessPredicate` from the same set. Effort: Medium.
- **Left out:** A test that the lists are equal, because B removes the copies.
- **Wider fix:** B.
- **Previous examples:** Review items 2 and 6 of the Restart branch.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because it changes files outside the Restart branch.
