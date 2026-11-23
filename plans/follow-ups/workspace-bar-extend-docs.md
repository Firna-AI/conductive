# Docs say the workspace bar offers Extend

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/mac-permission-issue-o7fv`, review round 1, a finding check.
- **Location:** `docs/protocol/desktop-commands.md` ("The choices", the bar of the 15 minutes), `src/marketing/docs/security.md` (the bar of the 15 minutes), `src/chat/device/AllowAllBar.tsx`.
- **Reason:** The same text and code are on `main`, and the work of the open Extend plan covers it.

- **Background:** The protocol doc and the security guide say that the bar of the 15 minutes offers Extend beside the time left. The bar in the app shows only Keep until I stop and Stop, and no page sends `extend-workspace`. The plan `plans/extend-allow-all.md` covers Extend.
- **Problem:** The docs promise a control that the app does not show.
- **Impact if no action:** A member looks for Extend and does not find it.
- **Root question:** Do the docs and the bar agree on the controls of the 15 minutes?
- **Options:**
  - **A.** Ship Extend in the bar, as the Extend plan says. Effort: Medium.
  - **B.** Mark Extend in the docs as not yet in the app until the Extend plan ships. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A. The Extend plan already holds the work.
- **Action:** fix after merge, apply A, with the Extend plan.
