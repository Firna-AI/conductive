# The org rail does not scroll with many orgs

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-12, from branch `calummoore/riga-188n`, the mockups of the org rail order.
- **Location:** `docs/mockups/src/components/layout/OrgRail.module.css:1`, `docs/mockups/src/components/layout/OrgRail.module.css:20`.
- **Reason:** The rail had this gap before the org order change, and the change does not make it worse.

- **Terms:**
  - **Org rail:** the narrow column of org tiles at the far left of the desktop app. The app and the mockups share its CSS module.
- **Background:** The rail is a flex column with the logo, the org list, Create org, Operator, and the account. Neither `.rail` nor `.orgs` sets an overflow. Nobody checked the rail in the app with more orgs than the window height holds.
- **Problem:** With many orgs, the lower tiles, Create org, and the account can fall below the window, with no way to reach them.
- **Impact if no action:** A person with very many orgs, or a short window, cannot reach the account or the lower orgs from the rail.
- **Root question:** How does a person reach every item of the rail when it is taller than the window?
- **Options:**
  - **A.** The org list scrolls, and the logo, Create org, Operator, and the account stay in place. Effort: Small.
  - **B.** The whole rail scrolls. Effort: Small.
- **Left out:** A limit on the number of orgs, because it fails the goal. Only two approaches are real: the list scrolls alone or with the rest of the rail.
- **Wider fix:** None, because this is one layout gap.
- **Previous examples:** None found.
- **Recommendation:** A. The account and Create org then stay in reach at all times.
- **Action:** fix after merge, apply A, because the gap is older than this change and needs a check in the app first.
