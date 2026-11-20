# Two Settings groups can share one key

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, a review finding.
- **Location:** `src/shell/settings/SettingsNav.tsx`, the key of each `Group`, and `src/shell/settings/settings-tabs.ts`, `SettingsGroup`. The mockup `docs/mockups/src/components/settings/SettingsNav.tsx` does the same.
- **Reason:** Only an org named Account meets it today, and React still draws both groups.

- **Terms:**
  - **Settings list:** the list of the tabs of Settings, in an Account group and a group with the name of the org.
- **Background:** Each group of the Settings list uses its title as its React key. Org creation accepts any name that is not empty, in `worker/app-api/feature-org.ts`.
- **Problem:** An org named "Account" gives two groups the same key. React logs "Encountered two children with the same key", and a later render can drop or repeat a group. If Settings later lists more than one org, two orgs with the same name collide too.
- **Impact if no action:** Few orgs have this name, so few people meet it.
- **Root question:** What identifies a group of the Settings list?
- **Options:**
  - **A.** Give `SettingsGroup` a required `key`: `account`, or the org id. Key each group by it, in the app and in the mockup. Effort: Small.
  - **B.** Key each group by its position. React then reuses a group for another org when the order of the orgs changes. Effort: Small.
- **Left out:** A rule that refuses the org name Account. A new validation needs the user, and it does not stop two orgs with one name.
- **Wider fix:** A. A required key in the type stops a label from serving as an identity.
- **Previous examples:** None found.
- **Recommendation:** A. A key from the identity stays right when Settings lists more orgs.
- **Action:** fix after merge, apply A, because it is a rare product bug of Low severity.
