# No test checks every time of the comparison page

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/from-conductor-timestamp-and-links`, the blocked wider fix of its review finding 12.
- **Location:** `worker/marketing/built-comparison.test-support.ts`, `src/marketing/components/CopyText.astro`, `src/marketing/components/DueDay.astro`, `src/marketing/components/ParityIntro.astro`.
- **Reason:** A test that catches every case of a defect class needs the user's approval.

- **Terms:**
  - **Time element:** an HTML `time` element of the page. Its `datetime` attribute holds the machine value, and its text holds the words that a visitor reads.
- **Background:**
  - The public page `conductive.build/from-conductor` draws dates in three places, each as a time element: the shutdown days of Conductor's cloud workspaces at the top, the check time "Last checked 10 November 2026 at 02:07 UTC" on its own line, and the due date of an In progress or Planned row with a dated commitment.
  - `dayWords` and `timeWords` in `src/marketing/from-conductor/dates.ts` give the words. `src/marketing/from-conductor/dates.test.ts` tests `timeWords` with literal values.
  - The built-page check in `worker/marketing/built-comparison.test-support.ts` asserts the form of the full words of the check line. On 10 November 2026 a review found that the check line could lose its words without a failing test, and that fix closed the gap for the check line only.
- **Problem:** No test asserts that the other time elements of the page have readable words. A template change that drops the words of the shutdown days or of a due date passes the gate.
- **Impact if no action:** A visitor can see an empty date or a raw value such as `2026-11-13`, and no test fails.
- **Root question:** How do the tests prove that every date of the page has readable words?
- **Options:**
  - **A.** Add the form check of the check line to each other place by hand: the two shutdown days and the due date. Effort: Small.
  - **B.** Check every time element of the built page in one loop: its words have the form of a long day, a short day, or a check time, and never equal its `datetime` value. It is a test for the class, so it needs the user's approval. Effort: Small.
  - **C.** Draw every time element through one shared component that always writes words, and test that component. It moves three templates to one part. Effort: Medium.
- **Left out:** A browser test: the testing rules keep browser specs for layout, frames, focus, navigation, or a real host, and readable words are none of these.
- **Wider fix:** C is the structural fix, but its component can still drop the words, so it also needs a check. B is the detection fix.
- **Previous examples:** Review finding 12 of `calummoore/from-conductor-timestamp-and-links`, fixed in commit `c4a5e435` for the check line only.
- **Recommendation:** B. One loop covers each place, also a new one, at small cost.
- **Action:** ask the user, because B is a test for a defect class, which only the user can approve.
