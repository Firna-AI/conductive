# The marketing site keeps copies of mockup facts

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from the check of finding 11 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1: its option C, and a problem outside the scope.
- **Location:** `src/marketing/features.ts:19` and `src/marketing/features.ts:63`, beside `docs/mockups/src/screens/marketingFeatures.tsx:18` and `docs/mockups/src/screens/marketingFeatures.tsx:67`.
- **Reason:** option C answers a second question at Medium effort, and the feature texts are outside the diff.

- **Terms:**
  - **Feature texts:** the label, the title, and the sentence of each feature section of the home page, and the title and the sentence of each smaller feature. The marketing mockup and the site both show them.
- **Background:** The marketing mockup writes the feature texts in `docs/mockups/src/screens/marketingFeatures.tsx`. The site keeps a hand-written copy of the same texts in `src/marketing/features.ts`. The site already reads its picture files from the shared picture list, so the feature texts are the copy that remains.
- **Problem:** A changed feature text in the mockups leaves the site text old, and no test compares the two copies.
- **Impact if no action:** The site can show an old feature text after a change of the mockups.
- **Root question:** How does the site read the feature texts from the one place that owns them?
- **Options:**
  - **C.** Move the feature texts into a shared module that the mockups and the site both read, and delete the copy in `src/marketing/features.ts`. The module imports nothing, as the shared picture list does, so the mockups and the site build can both import it. Effort: Medium.
- **Left out:** A test that compares the copies, because it keeps the copies.
- **Wider fix:** C.
- **Previous examples:** `marketing-pictures-one-list`, which Milestone 15m applied, and the picture part of this item, which the Astro build of the site applied with one glob keyed by the shared picture list.
- **Recommendation:** C. It removes the copy.
- **Action:** fix after merge, apply C, because it reaches files outside the diff of PR #45 at Medium effort.
