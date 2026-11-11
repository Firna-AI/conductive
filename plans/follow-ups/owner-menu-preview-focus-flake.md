# Investigate the flaky preview focus check

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from the Apple silicon Desktop CI job of `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `desktop/tests/owner-menu.spec.ts:14-64` and `src/shell/workspace/dev/vite.config.js`.
- **Reason:** The test and menu sources match main. Its failure and successful rerun need investigation on a separate branch.

- **Terms:**
  - **Owner menu:** The workspace header menu opened by the `Owner: Cal` button in this test's sample data.
  - **Preview frame:** The embedded page for a workspace port. The test supplies a page with one `Preview action` button.
- **Background:**
  - The test builds its isolated workspace harness, starts a Vite preview server, and launches Chrome through Playwright.
  - It opens the Owner menu and presses the button inside the preview frame.
  - It then checks that the menu is hidden, the owner button has `aria-expanded=false`, and the preview button has focus.
  - The source test and menu implementations are unchanged from main `067e82b6`.
  - On commit `78e9603f`, the first Apple silicon source test run passed 11 specs and failed this spec. Its menu-close assertions passed.
  - The last focus assertion failed after its 15-second polling deadline:

```text
Error: expect(locator).toBeFocused() failed
Locator: getByTitle('Preview of port 3000', { exact: true })
  .contentFrame().getByRole('button', { name: 'Preview action', exact: true })
Expected: focused
Received: inactive
Timeout: 15000ms
33 × locator resolved to <button>Preview action</button>
  - unexpected value "inactive"
```

- **Background, continued:**
  - One failed-job rerun on the same commit passed. The source suite passed all 12 specs. The packaged-app suite also passed all 12 specs.
  - The focus spec passed in both rerun suites. The Intel Mac job passed too.
  - No code, assertion, retry policy, or timeout changed between the failed run and its rerun.
  - The root cause is unproven. Possible sources are browser or window activation, or the order of the menu-close and frame-focus events.
  - The failed run and rerun are attempts of Desktop run `42937670203`. Their logs remain available at `https://github.com/Firna-AI/remote-code/actions/runs/42937670203`.
- **Task:**
  - Reproduce the focus failure. Record pass and fail counts before any fix.
  - Capture focus events, the active element in the parent and frame, menu-close events, and page activation.
  - Determine whether the defect is in product focus handling, browser setup, or test isolation.
  - If product code loses focus, add or extend a focused regression test before fixing that code.
  - If the fixture starts in the wrong state, use an explicit readiness signal or isolated state. Preserve the actual focus assertion.
  - Record why the chosen change removes the observed nondeterminism. Record pass and fail counts after the change.
  - Keep every existing assertion. Add no retry, sleep, skip, or longer timeout. Ask the user before a proposed gate change or test removal.
  - If the cause remains unknown, report the evidence and ask before applying a speculative fix.
- **Impact if no action:** An unrelated focus failure can make Mac CI red and delay other branches. A passing rerun does not explain the original failure.
- **Needs:** Node 24, root and desktop dependencies, Chrome, and the existing workspace harness. Use a Mac or the Mac CI runner if the failure cannot be reproduced on Linux. No production credential is needed.
- **Done when:** The observed failure has a confirmed cause and a deterministic fix. The original menu-close and focus assertions pass without weaker limits or extra retries. Source and packaged Mac checks pass.
