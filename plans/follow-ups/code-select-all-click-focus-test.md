# No browser test clicks code before select all

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from the branch `calummoore/selecting-code-context-jlro`, review finding 9.
- **Location:** `src/files/code/CodeBox.tsx`, `src/files/code/CodeBox.dom.test.tsx`, `desktop/tests/dialog-scroll-keyboard.spec.ts`, `docs/protocol/workspace-tools.md` (the select-all bullet under "Files and changes").
- **Reason:** The test needs a browser spec in the desktop Playwright suite, which reaches beyond the code view change that added the rule.

- **Terms:**
  - **Code box:** `CodeBox` of `src/files/code/CodeBox.tsx`, the focusable scroll region of the text view and the diff view of a file tab.
  - **Desktop Playwright suite:** the browser specs under `desktop/tests/`, which run the app in Electron in the `Desktop` workflow.
- **Background:** Cmd+A or Ctrl+A in the text or the diff of a file tab selects only that text, as `docs/protocol/workspace-tools.md` says. The rule works because the code box has `tabIndex={0}`. A press in the text then gives the box the focus, and its key handler turns select all into a selection of the box. Before this rule, select all selected the whole app, with its lists and tabs. The DOM tests in `src/files/code/CodeBox.dom.test.tsx` send the key straight to the box and check its `tabindex`. happy-dom moves no focus on a click.
- **Problem:** No test clicks the text and then presses the keys. A `mousedown` handler that cancels the focus, a window shortcut listener that takes the key, or an overlay would bring back the whole-app selection, and every test would still pass.
- **Impact if no action:** A focus regression can bring back the bug that a member reported on 23 November 2026, with no test failure.
- **Root question:** How can a test fail when a click in the text or the diff of a file tab no longer makes select all select only that text, whatever part of the app causes it?
- **Options:**
  - **A.** Mount the code view beside other text in the desktop Playwright suite. Click the code, press select all with the keyboard, and check both ends of the selection. The harness cannot mount a live component today, so it needs a new mount fixture. Effort: Medium.
  - **B.** Use the workspace fixture of `desktop/tests/dialog-scroll-keyboard.spec.ts` with the default file and diff of the fake API (`src/test-support/fake-tool-routes.ts`). Open a file tab and a diff tab, click the text, press select all, and check that the box has the focus and that the selection leaves out the lists and the tab bar. Effort: Medium.
  - **C.** In the Vitest gate, mount the workspace with `openTab` of `src/shell/workspace/wiring-test-kit.tsx`. Add a test helper that sends `pointerdown` and `mousedown` and then focuses the nearest focusable ancestor when no listener cancels the `mousedown`. It copies a browser rule, so it cannot see an overlay or a later move of the focus. Effort: Small.
- **Left out:** A test that forces the focus, because it cannot fail on the change. Static markup in the page, because it runs no React handler. Vitest browser mode, because it adds a gate and a browser download to each test shard, which needs the user's approval.
- **Wider fix:** B. It checks the whole path from the click to the selection in the real app.
- **Previous examples:** Commit `89ba041a7` added browser coverage for keyboard focus in scrollable dialog content, in `desktop/tests/dialog-scroll-keyboard.spec.ts`.
- **Recommendation:** B. It reuses an existing fixture and fails for each cause of a lost focus.
- **Action:** fix after merge, apply B, because the spec belongs to the desktop suite and the DOM tests already cover the keys once the box has the focus.
