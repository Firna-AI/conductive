# A New workspace test passes without Settings

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2.
- **Location:** `src/shell/new-workspace/NewWorkspaceDialog.test.tsx`, the two checks `focusIn(settingsDialog() ?? mainOf(tab.view))`, and `src/shell/settings/settings-test-kit.ts`.
- **Reason:** The review of the Settings branch came after its last fix round.

- **Background:** `settingsDialog()` of the Settings test kit returns null when Settings does not show. Two New workspace tests fall back to the main area, which also gets the focus when the New workspace dialog closes. A check made the Settings layer draw nothing, and "Choose repositories … opens the Repositories tab of Settings" stayed green.
- **Problem:** A test that needs Settings can pass without it.
- **Impact if no action:** A change that stops Choose repositories from opening Settings still passes.
- **Root question:** How does each test that needs Settings fail when Settings does not show?
- **Options:**
  - **A.** Use `settingsTab('Repositories')` and `settingsTab('Agents')` in the two checks. They throw without Settings. Effort: Small.
  - **B.** Name the kit helpers as `byRole` and `queryByRole` of `src/test-support/dom-queries.ts` are named: `settingsDialog()` throws, and `querySettingsDialog()` returns null. Each call site says which it means. Effort: Small.
- **Left out:** A lint against a fallback in an assertion: a new lint needs the user, and B removes the case.
- **Wider fix:** B.
- **Previous examples:** `byRole` and `queryByRole` already split the throwing query from the nullable one.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the review came after the last fix round of the Settings branch.
