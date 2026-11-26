# Test clicks and keys skip browser order

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/milan-hmhx`, the wider fix of review item 4.
- **Location:** `src/shell/test-mount.tsx`, `click` and `press`. `src/test-support/mount.ts`, `press`. `src/shell/layout/list-popover-test-kit.ts`, `pointerDown`.
- **Reason:** The fix changes the click helper of every mounted test, outside the files of the branch, and some tests may need a change.

- **Terms:**
  - **Mounted test:** a Vitest test that mounts the app in a fake browser page, such as the tests that call `openPaletteTab`.
  - **Press-outside rule:** a layer, such as a menu or the list popover, closes on a `pointerdown` outside it.
- **Background:**
  - The helper `click` of `src/shell/test-mount.tsx` focuses its target and calls `click()`. It sends no `pointerdown` or `pointerup`.
  - So a mounted test that clicks never runs the press-outside rules of the open layers. A test must send the press by hand. Seven test files do so, such as `src/shell/list/OrgSwitcher.test.tsx` and `src/shell/palette/PaletteLayer.test.tsx`, and the list popover tests use `pointerDown` of their own kit.
  - The review of the branch found that a broken press-outside rule of the list popover passed every test until the branch added a press by hand.
  - The helper `press` of `src/test-support/mount.ts`, which the chat tests use, also calls only `click()`. On 2026-11-23, review item 1 of branch `calummoore/popup-closes-on-click-outside-4lj3` found that the Explain popover tests passed without the rule that keeps the popover at a press on a mark, until the branch added a press by hand.
  - The helper `press` runs its key event inside `act()`, so React commits only after the last listener. In a browser, React 19 commits the work of a key press in a microtask, before the listeners on `document`. So a field that closes on Escape is still on the page when a `document` listener runs in a test, but gone in a browser. Review item 10 of 2026-11-16 found that the tests of the list popover passed without its check for a handled key for this reason, until the branch added a test that takes the key on a row.
- **Problem:** A click or a key in a mounted test does not act as a mouse or a keyboard does, so it skips the press-outside rules and the listener order of a browser.
- **Impact if no action:** A change that breaks a press-outside rule, such as one that closes a layer before a click reaches its row, can pass the gate.
- **Root question:** How does each test click and key act as a browser does?
- **Options:**
  - **A.** Add a shared helper for a pointer press, and use it in the seven files that build the event by hand. A test can still use `click` alone. Effort: Small.
  - **B.** Make `click`, and `press` of `src/test-support/mount.ts`, send `pointerdown` and `pointerup` before the click, as a mouse does, and make `press` let React commit after its own listener and before the listeners on `document`, as a browser does. Fix each test that then fails, and keep each assertion. Effort: Medium.
- **Left out:** Unit tests of each rule as a pure function. They would not catch the focus and page effects of a layer.
- **Wider fix:** B. Each test click then runs the pointer rules of every layer.
- **Recommendation:** B. It makes every mounted test act as a mouse does.
- **Action:** fix after merge, apply B, because it changes the helper of every mounted test, outside the files of the branch.
