# The wrap mode of LinkTabs is dead

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2.
- **Location:** `src/shell/ui/links.tsx:16-35`, `docs/mockups/src/components/common/LinkTabs.tsx:21-40`, `docs/mockups/src/components/common/LinkTabs.module.css:10-18`.
- **Reason:** The review of the Settings branch came after its last fix round.

- **Background:** `LinkTabs` draws a row of tab links. Its `wrap` mode put the org settings tabs in three columns on a phone. Settings replaced those tabs with a list on 20 November 2026, and deleted the app and mockup screens that passed `wrap`. Searches for `wrap={` find no `LinkTabs` caller, only the segmented control of `AgentConnectForm`. No test, plan, or protocol doc names the mode.
- **Problem:** The `wrap` mode and its `.wrap` style are dead code.
- **Impact if no action:** Readers keep a layout mode that nothing draws.
- **Root question:** Which layout modes does a row of tab links need?
- **Options:**
  - **A.** Delete the `wrap` mode of both `LinkTabs`, its comments, and the `.wrap` rule. Keep `flow`, which the operator page uses. Effort: Small.
- **Left out:** Fewer than three approaches are real, because nothing uses the mode.
- **Wider fix:** None. Only a new lint would catch the class, and that needs the user.
- **Previous examples:** The Settings branch dropped other exports that nothing imported.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the review came after the last fix round of the Settings branch.
