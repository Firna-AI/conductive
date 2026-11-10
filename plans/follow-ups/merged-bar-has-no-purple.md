# The merged pull request bar has no purple

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from the mockup milestone of branch `calummoore/workspace-status-icons`, item 3 of its report.
- **Location:** `docs/mockups/src/components/workspace/prStatus.ts`, state `merged`. `src/github/bannerStatus.ts`, state `merged`. `docs/protocol/github-banner.md`, section "Banner states".
- **Reason:** The fix changes the pull request bar, which the branch leaves out because another branch changes the bar at the same time.

- **Source:** Implementation. **Category:** Mockup.
- **Terms:**
  - **Pull request bar:** the bar at the top of the right column of a workspace. It shows the GitHub state of the branch with an icon, words, and a tint.
  - **List mark:** the 3 × 3 mark of a workspace in the workspace list, the command palette, and the workspace chips.
- **Background:**
  - On 10 November 2026 the user chose that the list mark shows the GitHub state of the pull request in one colour: red when checks failed, amber while checks run, green when checks passed, and purple after the merge.
  - The mockups add the colour token `merged` for that purple: `#a371f7` in the dark scheme and `#8250df` in the light scheme, in `docs/mockups/src/design/palette.ts`. The app reads it as `--ui-merged`.
  - The bar shows a merge as "Merged into main" with the `GitMerge` icon, in the neutral tone: no tint, and the icon and words in the ink colour. `prStatus` in the mockups and `bannerStatus` in the app give that tone.
  - The red of failed checks and the green of a pull request that is ready to merge appear in both the bar and the list mark. The purple of a merge appears only in the list mark.
- **Problem:** The bar that names the merge does not show the colour that the list uses for it.
- **Impact if no action:** Users learn the meaning of purple only from the list, and the bar and the list mark of a merged workspace look different.
- **Root question:** Does the pull request bar show the colour of a merge, as the list mark does?
- **Options:**
  - **A.** Change nothing. The bar keeps its neutral merge state. Effort: Small.
  - **B.** Draw the merge icon and the words of the bar in the `merged` purple, without a tint of the bar. Update the bar state rules in `docs/protocol/github-banner.md`, the mockups, and the app. Effort: Small.
  - **C.** Add a purple tint to the whole bar, as the other states tint it. This needs a soft purple token for the fill in both schemes. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None. One part draws each bar state.
- **Previous examples:** None found.
- **Recommendation:** B. One colour then names the merge in the bar and in the list, and the bar keeps its quiet look after the merge.
- **Action:** ask the user, because B and C change the user-visible bar beyond its contract, and the user decides the look of each bar state.
