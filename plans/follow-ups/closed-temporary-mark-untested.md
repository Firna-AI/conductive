# No test checks that a tab close drops the temporary mark

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the finding check of the review of branch `calummoore/close-other-tabs-x45d`.
- **Location:** `src/chat/components/CloseTabs.dom.test.tsx:88`, `src/chat/state/tab-order.ts:149`, and `src/chat/tests.md:106`.
- **Reason:** The gap and the claim are older than the branch that found them, which added Close other tabs and did not change `withoutTabs`.

- **Terms:**
  - **Temporary tab:** the one file or diff tab that the next opened file replaces, as `docs/protocol/temporary-tabs.md` says.
  - **Temporary mark:** the `temporaryTab` field of the saved view of the workspace. It names the temporary tab.
  - **Saved view:** the tab order, the active tab, and the temporary mark of one member in one workspace, which the app saves through the Worker.
- **Background:**
  - Close other tabs and Close tabs to the right of the tab menu close file and diff tabs through `withoutTabs` of `src/chat/state/tab-order.ts`. It removes the tabs from the saved view, and it sets `temporaryTab` to `null` when the temporary tab is among them.
  - The first test of `src/chat/components/CloseTabs.dom.test.tsx` is named "closes each file and session tab after the tab, saves one view without the file tab and its mark, and keeps the shown tab". `src/chat/tests.md` also says that the file tab "leaves the view in one save, with its temporary mark".
  - The test reads each save through `savedOrders` of `src/chat/components/tab-drag-test-kit.tsx`, which returns only the `tabs` of the view. No assertion reads `temporaryTab`.
  - A finding check changed `withoutTabs` in a scratch copy so that it kept the mark. Every test of `CloseTabs.dom.test.tsx`, `src/chat/state/tab-order.test.ts`, and `src/chat/state/tab-order-guards.test.ts` still passed.
- **Problem:** The test name and the test guide claim a check that no test makes.
- **Impact if no action:** A change that keeps the mark of a closed tab passes the gate. The saved view then marks a tab that is not in the row.
- **Root question:** How do the tests show that a close of the temporary tab drops its mark from the saved view?
- **Options:**
  - **A.** In the first test of `CloseTabs.dom.test.tsx`, also read the `temporaryTab` of the first save, and expect `null`. Effort: Small.
  - **B.** Add a unit test of `withoutTabs` in `src/chat/state/tab-order.test.ts`, with the temporary tab among the closed tabs and among the kept tabs. Effort: Small.
  - **C.** Do A, and rename the test and the guide sentence if the assertion moves elsewhere. Effort: Small.
- **Left out:** A browser test, because the mark needs no layout or real browser.
- **Wider fix:** None new. The testing skill already says to see each test fail for the error that it names.
- **Previous examples:** None found.
- **Recommendation:** A. The mounted test already makes the save, so one more expected value covers the claim at no extra cost.
- **Action:** fix after merge, apply A.
