# The test click sends no pointer press

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/milan-hmhx`, the wider fix of review item 4.
- **Location:** `src/shell/test-mount.tsx`, `click`. `src/shell/layout/list-popover-test-kit.ts`, `pointerDown`.
- **Reason:** The fix changes the click helper of every mounted test, outside the files of the branch, and some tests may need a change.

- **Terms:**
  - **Mounted test:** a Vitest test that mounts the app in a fake browser page, such as the tests that call `openPaletteTab`.
  - **Press-outside rule:** a layer, such as a menu or the list popover, closes on a `pointerdown` outside it.
- **Background:**
  - The helper `click` of `src/shell/test-mount.tsx` focuses its target and calls `click()`. It sends no `pointerdown` or `pointerup`.
  - So a mounted test that clicks never runs the press-outside rules of the open layers. A test must send the press by hand. Seven test files do so, such as `src/shell/list/OrgSwitcher.test.tsx` and `src/shell/palette/PaletteLayer.test.tsx`, and the list popover tests use `pointerDown` of their own kit.
  - The review of the branch found that a broken press-outside rule of the list popover passed every test until the branch added a press by hand.
- **Problem:** A click in a mounted test does not act as a mouse does, so it skips the press-outside rules.
- **Impact if no action:** A change that breaks a press-outside rule, such as one that closes a layer before a click reaches its row, can pass the gate.
- **Root question:** How does each test click run the pointer rules of the open layers?
- **Options:**
  - **A.** Add a shared helper for a pointer press, and use it in the seven files that build the event by hand. A test can still use `click` alone. Effort: Small.
  - **B.** Make `click` send `pointerdown` and `pointerup` before the click, as a mouse does. Every mounted test then runs the press-outside rules. Fix each test that then fails, and keep each assertion. Effort: Medium.
- **Left out:** Unit tests of each rule as a pure function. They would not catch the focus and page effects of a layer.
- **Wider fix:** B. Each test click then runs the pointer rules of every layer.
- **Recommendation:** B. It makes every mounted test act as a mouse does.
- **Action:** fix after merge, apply B, because it changes the helper of every mounted test, outside the files of the branch.
