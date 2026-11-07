# The always-allowed commands of a Mac have no size limit

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, from PR #23, branch `conductor/boat-native-remote-workspaces-milestone-15f`, the wider fix D of round 1 finding 32. The user sees it as item 110.
- **Location:** the permission store of the Mac app in `desktop/src/`.
- **Reason:** the fix refuses a save, and a new refusal is the user's choice.

- **Background:** "Always allow" saves the exact command text on the Mac. PR #23 answers a settings reply that does not fit one device frame with a failure reply, so the connection stays open.
- **Problem:** The saved list can still grow past one frame. Then This Mac cannot load the list, so the user cannot remove commands from it.
- **Impact if no action:** In the rare case of very long or very many always-allowed commands, the list cannot be managed from the app.
- **Root question:** How does the always-allowed list stay small enough to load?
- **Options:**
  - **A.** Change nothing more. Effort: Small.
  - **C.** Before it saves "Always allow", the Mac measures the saved list with the new command. Above a fixed budget, such as 500,000 bytes, it refuses the save with a message, and Allow can still run the command once. Effort: Small.
  - **B.** Split settings replies into several frames, and join them in the Worker. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** None found.
- **Recommendation:** C.
- **Action:** ask the user, because C refuses a save.
