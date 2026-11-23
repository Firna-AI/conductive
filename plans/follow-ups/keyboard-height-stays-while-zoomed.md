# App stays short when keyboard closes while zoomed

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-22, from `calummoore/mobile-ui-issues-7te6`, review item 4.
- **Location:** `src/app/keyboard-viewport.ts:59`, the early return `if (zoomed(viewport)) return` in `followKeyboard`.
- **Reason:** The review found it after the last fix round of the branch, and it shows only while a phone page stays zoomed.

- **Terms:**
  - **Screen height token:** the CSS variable `--ui-screen-height`. It is `100dvh` by default, from `src/ui/design/metrics.ts`, and the phone frame uses it as its height.
  - **Visual viewport:** `window.visualViewport`, the visible part of the page, with its `height`, `offsetTop`, and zoom `scale`.
- **Background:** Safari on iOS keeps the page at its full height under the on-screen keyboard. `followKeyboard` in `src/app/keyboard-viewport.ts` sets the screen height token to the visual viewport height while a keyboard shows, and keeps the page at its top. While the zoom scale is not 1, it returns early and changes nothing, so a pinch zoom keeps the behaviour of the browser.
- **Problem:** The user zooms while the keyboard shows, then closes the keyboard and stays zoomed. The `resize` event arrives while zoomed, so the hook ignores it. The token stays at the keyboard height, for example 450px, until the zoom goes back to scale 1.
- **Impact if no action:** While the page stays zoomed, an empty band shows below the app where the keyboard was.
- **Root question:** How does the app get its full height back when the keyboard goes during a zoom?
- **Options:**
  - **A.** Change nothing. The app corrects itself when the zoom ends. Effort: Small.
  - **B.** While zoomed, compute the unzoomed visible height as `viewport.height * viewport.scale`. When it is no longer shorter than the layout viewport, remove the token. Do not scroll while zoomed. Add the case to `src/app/keyboard-viewport.test.ts`. Effort: Small.
  - **C.** Model the viewport as three named states: none, keyboard, and zoom. A pure function computes the state, and one exhaustive `switch` handles each change between states, also "zoom, and the keyboard goes". Add the same test. Effort: Small.
- **Left out:** Removing the early return brings back a jump to the top of the page when the user zooms with the keyboard open.
- **Wider fix:** C. The state type makes each change between states an explicit case.
- **Previous examples:** The same branch fixed a jump to the top of the page on a zoom with the keyboard open, with the early return.
- **Recommendation:** B. It fixes the case with the least code. C best protects the codebase if more states come.
- **Action:** fix after merge, apply B, because the defect is rare and low, and the fix does not get harder later.
