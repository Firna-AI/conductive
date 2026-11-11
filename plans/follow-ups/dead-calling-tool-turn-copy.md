# A dead copy of callingToolTurn stays

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from review round 5 of pull request #176, branch `calummoore/github-status-bar-actions`, finding 8.
- **Location:** `worker/workspace-lifecycle.ts:91` and `worker/tools/workspace.ts:38`.
- **Reason:** both review fix rounds of pull request #176 were used, so this Low cleanup waits for a later branch.

- **Terms:**
  - **Workspace object:** the Cloudflare Durable Object of one workspace. Its class `Workspace` in `worker/workspace.ts` extends `AgentSessionWorkspace` in `worker/tools/workspace.ts`, which extends `AttachmentWorkspace` in `worker/chat/attachment-workspace.ts`, which extends `WorkspaceLifecycle` in `worker/workspace-lifecycle.ts`.
  - **callingToolTurn:** the method of the workspace object that checks a running agent turn for the agent tools, and returns its workspace, turn, sender, and session.
- **Background:**
  - The agent tools call `callingToolTurn` through `worker/tools/composition.ts:47`. The `CallingTurn` type in `worker/tools/services.ts` requires `sessionId`, and `worker/tools/calling-turn.ts` refuses a turn without it with HTTP 403.
  - A merge of `main` into pull request #176 moved the full method, with `sessionId`, into `AgentSessionWorkspace`, so that `worker/workspace.ts` stays within 300 lines.
- **Problem:** The older copy in `WorkspaceLifecycle`, without `sessionId`, stayed. The copy in `AgentSessionWorkspace` overrides it, and no subclass or `super` call reaches the older copy. So it is dead code, and the class chain holds two versions of one method.
- **Impact if no action:** A reader must check both methods to find the live one, and a later change can edit the dead copy by mistake.
- **Root question:** How do the agent tools get the running turn from one implementation of the workspace object?
- **Options:**
  - **A.** Delete the copy in `WorkspaceLifecycle` and its unused import. Keep the copy in `AgentSessionWorkspace`. `worker/workspace-lifecycle.ts` then equals its version on `main` before that merge, at 287 lines. Keep every test. Effort: Small.
  - **B.** Add `sessionId` to the copy in `WorkspaceLifecycle`, and delete the copy in `AgentSessionWorkspace`. A body copied as it is gives the file 304 lines, so it needs a shorter body to stay within 300. Effort: Small.
  - **C.** Keep the only copy in `Workspace`, as `main` had it, and move another part of `worker/workspace.ts` out to keep it within 300 lines. Effort: Medium.
  - **D.** Apply A, then set the TypeScript option `noImplicitOverride` in `tsconfig.worker.json`, and add `override` to the 18 intended overrides in 10 files. A method that hides an ancestor method without `override` then fails to compile. This adds a compile error, so it needs the user's approval. Effort: Small.
- **Left out:**
  - Change nothing: two versions of one method stay.
  - A shared helper behind both methods: A is better on every point, because one method is enough.
  - One class body for all workspace methods: it breaks the 300-line rule, which is the reason for the class chain.
- **Wider fix:** D. It is blocked until the user approves a new compile error.
- **Previous examples:** None found.
- **Recommendation:** A. It deletes only the copy that never runs. `worker/features/agent-session-writes.test.ts` and `worker/tools/handler.scope.test.ts` already reach the live method, and their 7 tests pass with A.
- **Action:** fix after merge, apply A, because both review fix rounds of pull request #176 were used and the finding is not critical. D waits for the user.
