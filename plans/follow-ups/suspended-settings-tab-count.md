# The operator catalogue counts four suspended settings tabs

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2, outside its scope.
- **Location:** `docs/mockups/catalogue-operator.md:52`.
- **Reason:** The line predates the Settings branch.

- **Background:** The mockup page `app/orgs/suspended/settings` draws the settings of a suspended org. The org settings have six tabs: General, Repositories, Cloud computer, Agents, Secrets, and Members.
- **Problem:** The catalogue line says that the page has four tabs.
- **Impact if no action:** A reader of the catalogue expects a page that does not exist.
- **Root question:** How many tabs does the catalogue give the suspended settings?
- **Options:**
  - **A.** Name the tabs that the page draws, from `suspendedSettingsLinks` in `docs/mockups/src/components/settings/OrgSections.tsx`. Effort: Small.
- **Left out:** Fewer than three approaches are real, because the line must match the page.
- **Wider fix:** None, because this is one line.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the line is outside the scope of the Settings branch.
