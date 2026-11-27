# Three docs call Account settings the account screen

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2, outside its scope.
- **Location:** `src/shell/workspace/kept-workspace.md:20`, `src/shell/workspace/shown-workspaces.ts:44`, `src/chat/integration.md:215`.
- **Reason:** The Settings branch searched for "account page", and these lines say "account screen".

- **Background:** On 20 November 2026 the Account page became Account settings, a group of the one Settings place. On a desktop, Settings is a dialog over the page below, which stays mounted.
- **Problem:** These lines still call it "the account screen", and some describe a workspace that hides while it shows, which no longer holds on a desktop.
- **Impact if no action:** A developer reads about a screen that no longer exists, and a wrong rule about when a workspace hides.
- **Root question:** How do these docs name Account settings and what happens to the page below?
- **Options:**
  - **A.** Name Account settings in each line, and say that a desktop keeps the workspace mounted under Settings. Effort: Small.
- **Left out:** Fewer than three approaches are real, because the lines must match the code.
- **Wider fix:** None. The search rule of the `documentation` skill already covers renames; a search for every word of the old name was missed.
- **Previous examples:** `plans/follow-ups/settings-open-signup-notice-wording.md` is another missed line of the same rename.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the lines are outside the scope of the Settings branch.
