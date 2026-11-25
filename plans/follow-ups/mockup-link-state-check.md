# Mockup links keep losing their example state

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, option E of review finding 11 of round 4.
- **Location:** `package.json` (the `mockups:check` script) and `docs/mockups/src/components/common/ScreenLink.tsx`.
- **Reason:** The fix is a new check in the mockup gate, and a new gate needs the user's approval.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review.
- **Category:** Mockup.
- **Location:** See the header.
- **Terms:**
  - **Example:** A group of catalogue pages that draw one workspace in one state, such as the large branch with limited lists, the masked paths, or a saved list.
  - **Example state:** The workspace props that a page of the example shares: `lists`, `tree`, `lostUpdate`, `paths`, and `banner`.
- **Background:** Each catalogue page draws one fixed state. A link opens a fixed page. When a link leads to a page of another example, the reader sees the workspace change after one press.
- **Problem:** The class came back four times in one change: file links that reset limited lists (fixed on 23 November 2026), a saved list that turns current (`plans/follow-ups/saved-list-links-keep-notice.md`), a pull request status that changes between linked pages (fixed for the large branch, open on `main` in `plans/follow-ups/standard-example-check-status.md`), and masked rows that disappear (`plans/follow-ups/masked-paths-list-links-reset.md`). Each time, a review found it by hand.
- **Impact if no action:** Reviews keep finding these resets one by one.
- **Root question:** How can the catalogue catch a link that moves the reader to another example?
- **Options:**
  - **A.** Keep finding them in review. Effort: Small.
  - **B.** Add a link-state report to `npm run mockups:check`. For each link from a workspace page to a file page, compare the example state of the source page and the target page. Read the props from Mokly's records in `mokly-static/mokly-viewer/entries/`, and the targets from the built views. Fail on each link that changes the state, except the links on an allowlist. Fix or allow the resets that are already on `main`. Effort: Medium.
  - **C.** Report the same links as a warning that does not fail the build. Effort: Medium.
- **Left out:** A unit test per page, because it covers only the pages that someone remembers.
- **Wider fix:** B, after the case table of `plans/follow-ups/saved-list-links-keep-notice.md` removes the existing resets.
- **Previous examples:** The four cases above. Commit `216ed6791` fixed masked back links by hand.
- **Related:** `plans/follow-ups/saved-list-links-keep-notice.md`, `plans/follow-ups/standard-example-check-status.md`, and `plans/follow-ups/masked-paths-list-links-reset.md` hold the existing resets. This check does not fix them.
- **Recommendation:** C first, then B once the existing resets are fixed. A warning finds new cases at no gate cost.
- **Action:** ask the user, because B adds a new gate and C adds a new check, and the user decides each new gate or check.
