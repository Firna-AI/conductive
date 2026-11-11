# DOM tests focus elements that a browser cannot

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, from the branch `calummoore/conductor-internal-tools-410`, review round 1, the wider fix E of finding 2, blocked.
- **Location:** `vitest.config.ts`, `src/test-support/dom-queries.ts`, and the happy-dom paragraph of `src/test-support/README.md`.
- **Reason:** The fix makes the DOM test environment stricter for every test, and a stricter check needs the user's approval.

- **Terms:**
  - **happy-dom:** the DOM environment of the component tests of the web app. A test file chooses it with the line `// @vitest-environment happy-dom`.
  - **`focusedElement()`:** the test helper in `src/test-support/dom-queries.ts` that names the element with the focus.
- **Background:**
  - The `focus()` of happy-dom 21 focuses any connected element that is not disabled or inert. A browser focuses only a control, a link with `href`, an editable element, or an element with a `tabindex` attribute.
  - Review finding 2 of that branch showed the gap: with the `tabindex` of the agent name removed, the focus tests of the Connect form still passed, but a browser would leave the focus on the page.
  - The fix of finding 2 made `focusedElement()` add ", not focusable in a browser" to such an element. That covers each test that reads the focus through it. A test that compares `document.activeElement` directly, and the product's own check of a lost focus, still see what happy-dom does.
  - Test support already corrects other happy-dom gaps, with `isShown` and `requestDialogClose`.
  - A probe of the finding check installed the rule for every DOM test. All 447 tests of the 141 happy-dom files passed, and the tests failed on the removed `tabindex` with `the page`.
- **Problem:** A DOM focus test can pass for a focus target that a browser cannot focus.
- **Impact if no action:** A change that drops the focus in a browser can pass the gate.
- **Root question:** How do the DOM focus tests prove that a browser gives the focus to the element that they expect?
- **Options:**
  - **A.** Keep the rule in `focusedElement()` only. Effort: Small.
  - **E.** Make `focus()` act as in a browser in every DOM test. One setup module, a `setupFiles` entry in `vitest.config.ts`, refuses the focus for an element that a browser cannot focus, with the rule of `focusedElement()`. Add the gap to the happy-dom paragraph of `src/test-support/README.md`. The rule is hand-written and can fall behind the browser. Effort: Small.
  - **C.** Run the focus scenarios in a real browser. The web app has no browser test runner, and CI installs no browser, so this adds a gate step. Effort: Large.
- **Left out:** Another DOM library, such as jsdom: the test-support README makes happy-dom the one DOM environment. A change in happy-dom itself: the project does not control its releases.
- **Wider fix:** E.
- **Previous examples:** `isShown` and `requestDialogClose` in `src/test-support/`, which correct other happy-dom gaps.
- **Recommendation:** E. One setup module makes every DOM focus check see what a browser gives, with no expected value changed.
- **Action:** ask the user, because E makes the environment of every DOM test stricter, and the always-on rules reserve a stricter check for the user.
