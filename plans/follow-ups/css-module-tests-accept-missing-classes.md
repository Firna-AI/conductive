# Tests accept CSS module classes that the CSS does not define

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from review round 1 of branch `calummoore/flashing-blue-workspace-icon-esvp` (blue needs-input mark).
- **Location:** `vitest.config.ts`, the `css: { include: [...] }` option.
- **Reason:** The option is already on `main`, and the branch did not change it.

- **Terms:**
  - **CSS module:** a `*.module.css` file. An import of it gives an object that maps each class name to a unique, generated name.
- **Background:** Vitest processes only `ChipCopyText.module.css`. For every other CSS module, it returns an object that gives a generated name for any key. Tests such as `src/shell/list/WorkspaceMark.test.tsx` compare the classes of the rendered markup with these names.
- **Problem:** A test that reads `styles.input` passes also when the CSS file has no `.input` rule. So a deleted or renamed rule leaves the tests green, and the screen loses the style.
- **Impact if no action:** A removed style can reach production with green tests. The visual checks of the mockups still catch it, but only when someone looks.
- **Root question:** How do the tests fail when a component uses a class that its CSS module does not define?
- **Options:**
  - **A.** Process every CSS module in Vitest, so that a missing class reads as `undefined`. Measure the change in the test time first. Effort: Small.
  - **B.** Add a lint rule that checks each `styles.<name>` against the classes of the imported CSS module. Effort: Medium.
- **Left out:** A test for each class: it repeats the CSS and does not cover new classes.
- **Wider fix:** B. It catches the class of problem without a test run.
- **Previous examples:** None found.
- **Recommendation:** A, if the test time stays about the same. Otherwise B.
- **Action:** fix after merge, apply A, because the option is on `main` outside the review scope.
