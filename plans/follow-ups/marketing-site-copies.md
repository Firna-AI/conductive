# The marketing site keeps copies of mockup facts

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from the check of finding 11 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1: its option C, and a problem outside the scope.
- **Location:** `src/marketing/picture-files.ts:43` and `src/marketing/features.ts:18`.
- **Reason:** option C answers a second question at Medium effort, and the feature texts are outside the diff.

- **Terms:**
  - **Shared picture list:** the list of marketing pictures that PR #45 adds, with each picture's label, crop, layout, and file names. The mockups, the capture command, and the site read it.
- **Background:** PR #45 makes one shared list the owner of the picture facts. The site still imports each picture file by a hand-written name. The site also keeps a hand-written copy of the feature titles and texts of `docs/mockups/src/screens/marketingFeatures.tsx`.
- **Problem:** A changed file name in the list leaves an old picture file in use with no error. A changed feature text in the mockups leaves the site text old, and no test compares the two copies.
- **Impact if no action:** The site can show an old picture or an old feature text after a change of the mockups.
- **Root question:** How does the site read the picture files and the feature texts from the one place that owns them?
- **Options:**
  - **C.** Build the file addresses from the shared list, with one `import.meta.glob` of `src/marketing/pictures/*.webp`, and delete the hand-written imports. Move the feature texts into a shared module that the mockups and the site both read. Someone must confirm that the Worker build emits the matched files as direct imports do. Effort: Medium.
- **Left out:** A test that compares the copies, because it keeps the copies. A capture command that writes the import module, because its output goes stale without a capture run.
- **Wider fix:** C.
- **Previous examples:** `marketing-pictures-one-list`, which Milestone 15m applied.
- **Recommendation:** C. It removes both copies.
- **Action:** fix after merge, apply C, because it reaches files outside the diff of PR #45 at Medium effort.
