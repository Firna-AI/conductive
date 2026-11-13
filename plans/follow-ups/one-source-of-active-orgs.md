# Each org switcher filters deleted orgs again

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-12, from branch `calummoore/porto-a8k1`, the wider fix of its review finding on the missing tests for deleted orgs in the org keys and the phone org sheet.
- **Location:** `activeOrgs` in `src/app/kept-org.ts`, `RailFrame` in `src/shell/OrgRoutes.tsx`, `OrgSwitcherSheet` in `src/shell/list/HomeList.tsx`, `setupOrg` in `src/app/setup-steps.ts`, `src/app/palette/palette-groups.ts:97`, and `src/app/palette/palette-org.ts:19`.
- **Reason:** The fix reaches the palette files, which the branch that found it did not change.

- **Terms:**
  - **Deleted org:** an org that an admin deleted. An admin can restore it for 7 days from the Deleted orgs section of the Account page.
  - **Org switcher:** a list of orgs that the person moves between: the org rail of a desktop, the org sheet of a phone, the keys Switch to org 1 to 9, and the Switch to rows of the command palette.
- **Background:** On 12 November 2026 the user asked that deleted orgs leave the org rail, and that Restore moves to the Account page. So no org switcher shows a deleted org. The function `activeOrgs` gives the orgs that are not deleted. `RailFrame` and `OrgSwitcherSheet` call it. `setupOrg`, the palette, and `keptOrg` each filter the deleted orgs with their own code. Regression tests now check the rail, the keys, and the phone sheet.
- **Problem:** Each switcher filters the list of `AppModel.orgs` again. A new switcher can read that list and forget the filter. Then a deleted org shows as an active org, because no switcher marks a deleted org any more.
- **Impact if no action:** A later change can bring a deleted org back into a switcher. Only the tests of the existing switchers catch it.
- **Root question:** How does every org switcher get only the orgs that are not deleted?
- **Options:**
  - **A.** Keep the regression tests, and add a test for each new switcher. Effort: Small.
  - **B.** Add one readable of the active orgs to `AppModel`. Make the rail, the keys, the phone sheet, `setupOrg`, `keptOrg`, and the palette read it, so that no switcher filters the list again. Effort: Medium.
  - **C.** Give the switchers a branded type of active orgs, so that a raw org list does not compile there. Effort: Medium.
- **Left out:** A test that walks every reader of `AppModel.orgs`, because it is a test for the class, and B removes the case.
- **Wider fix:** B. One source of the active orgs removes the class.
- **Previous examples:** The same filter is in `src/app/palette/palette-groups.ts:97`, `src/app/palette/palette-org.ts:19`, `src/app/setup-steps.ts`, and `src/app/dev/org-routes.ts:114`.
- **Recommendation:** B. It removes the repeated filter that causes the risk.
- **Action:** fix after merge, apply B, because it reaches the palette files outside the branch that found it.
