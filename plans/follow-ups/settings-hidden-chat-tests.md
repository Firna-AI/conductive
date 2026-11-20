# The hidden-chat session tests no longer hide

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2.
- **Location:** `src/shell/workspace/SessionAddress.test.tsx:89-110`, the helper `startWhileHidden`.
- **Reason:** The review of the Settings branch came after its last fix round.

- **Background:** `startWhileHidden` opens `/account/general` to hide the kept chat of a workspace, then starts a session that the hidden chat does not hear of. Three tests use it. Since Settings, a desktop shows `/account/general` as a dialog over the workspace, which stays mounted, so the chat never hides. A check found the session bar still mounted there. The workspace list does unmount it.
- **Problem:** The three tests no longer test a hidden chat.
- **Impact if no action:** A regression in how a returning chat shows a new session from its address still passes.
- **Root question:** How does a test that needs a hidden chat leave the workspace?
- **Options:**
  - **A.** Leave for `away` from `src/shell/workspace/kept-test-kit.tsx`, the workspace list of the org. All seven tests of the file then pass. Effort: Small.
- **Left out:** Fewer than three approaches are real, because the kit already names the page away from a workspace.
- **Wider fix:** None. The shared `away` address already serves the class.
- **Previous examples:** The Settings branch renamed a `KeptWorkspace.test.tsx` test for the same cause.
- **Related:** `plans/follow-ups/settings-below-address-writers.md`, the same cause.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the review came after the last fix round of the Settings branch.
