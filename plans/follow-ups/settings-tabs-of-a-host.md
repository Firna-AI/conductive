# No test opens This Mac in the Mac app

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2.
- **Location:** `src/shell/account/ThisMac.test.tsx`, `src/shell/settings/settings-view.tsx` (`tabRouteOf`), `src/shell/settings/settings-tabs.ts` (`settingsGroups`), `src/app/palette/palette-rows.ts:238`.
- **Reason:** The review of the Settings branch came after its last fix round.

- **Terms:**
  - **This Mac:** the last tab of Account settings, only in the Mac app. It lists the commands that always run on the Mac and the workspace grants.
- **Background:** Three places decide whether This Mac shows: `tabRouteOf` decides which tab shows at `/account/this-mac`, `settingsGroups` decides the rows of the list, and the palette rows decide their own. `ThisMac.test.tsx` mounts `AccountTabContent` directly for the Mac app, so it skips `tabRouteOf`. A change that made `tabRouteOf` show General also in the Mac app left every related test green.
- **Problem:** No test opens `/account/this-mac` in the Mac app through the shell, and three places repeat one rule.
- **Impact if no action:** A change can make the Mac app show General at the This Mac address, and no test fails. The person then has no place to remove an always-allowed command.
- **Root question:** How does the codebase make sure that the Mac app shows This Mac at its address?
- **Options:**
  - **A.** Add a shell test in the Mac app: `/account/this-mac` opens Settings with This Mac as the open row, the title, and the This Mac section. Effort: Small.
  - **B.** A, and one helper beside `ACCOUNT_TABS` in `src/app/router.ts` gives the Account tabs of a host. `settingsGroups` and `tabRouteOf` use it. Effort: Small.
  - **C.** B, and the Account rows of the palette use the same helper. Effort: Small.
- **Left out:** A test that walks every tab in every host: a test for the class needs the user, and C removes the case.
- **Wider fix:** C.
- **Previous examples:** Before Settings, one Account page component decided the list and the shown tab, and one test covered both.
- **Recommendation:** C. It brings back the lost check, and the three places cannot disagree.
- **Action:** fix after merge, apply C, because the review came after the last fix round of the Settings branch.
