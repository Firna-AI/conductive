# A second click on a file adds history

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the finding check of review finding 1 of the branch `calummoore/sandbox-startup-diff-error`.
- **Location:** `navigate` in `src/shell/workspace/files/files-navigation.ts`, at the `navigation.push(href(target))` of a file or diff target. `browserNavigation` in `src/app/navigation.ts`. `ResumeOnTabOpen` in `src/shell/workspace/files/tab-open-resume.tsx`.
- **Reason:** The branch that found it does not change the navigation of the Files screens, and the fix changes the history of every click on a file.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **App navigation:** the `Navigation` of `src/app/navigation.ts`. In a browser it writes each visit to the history of the browser tab, and it tells each listener of each visit.
  - **Files navigation:** `useFilesNavigation` in `src/shell/workspace/files/files-navigation.ts`, which saves the view and then moves the address for a click on a file, a diff, or a list.
- **Background:**
  - A plain click on a file or a diff, in a list, in the tab row, or in a chat link, calls `navigate` of the Files navigation.
  - For a file or diff target, `navigate` saves the tab as the active tab, then calls `navigation.push` with the address of the tab.
  - In a browser, `push` calls `history.pushState`, which adds an entry to the history, also when the address does not change.
  - `ResumeOnTabOpen` listens to each visit of the app navigation. A visit to the address of the tab that shows counts as an open, so a second click on that tab resumes a stopped sandbox. The user chose on 10 November 2026 that opening a file or a change starts the sandbox (decision 247 in `docs/protocol/workspace-life.md`).
- **Problem:** A click on the file or tab that already shows adds a second history entry with the same address. The next Back then goes to the same address, so it seems to do nothing.
- **Impact if no action:** A member who clicks the shown file again needs two presses of Back to leave it.
- **Root question:** How does a second click on the file that shows count as an open without a second history entry?
- **Options:**
  - **A.** In `navigate`, call `navigation.replace` in place of `push` when the address of the target is the current address. `replace` still tells each listener of the visit, so `ResumeOnTabOpen` keeps working. Add a test that a second click keeps the length of the history. Effort: Small.
  - **B.** Make `push` of the app navigation replace the entry when the address does not change, for every caller. It still tells the listeners. Effort: Small.
- **Left out:** A click that skips the navigation when the address does not change, because `ResumeOnTabOpen` then sees no visit, and the second click no longer resumes a stopped sandbox.
- **Wider fix:** B, because every caller of `push` then keeps one history entry for each address.
- **Previous examples:** None found.
- **Recommendation:** B. One rule in the app navigation covers each link of the app, and it keeps the visit for each listener.
- **Action:** fix after merge, apply B, because the change reaches every caller of the app navigation, outside the branch that found it.
