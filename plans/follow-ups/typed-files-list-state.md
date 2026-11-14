# Give each file list one typed load state

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from branch `calummoore/lima-3o44`, review findings 1 and 3.
- **Location:** `src/files/model/files-store.ts`, `src/files/model/files-snapshot.ts`, `src/files/panel/FilesPanel.tsx:49-51`, `worker/files/errors.ts:4-18`.
- **Reason:** the change touches the files store and its snapshot type, which the branch did not change, and the direct fix already ends the visible defect.

- **Terms:**
  - **Files store:** `WorkspaceFiles` in `src/files/model/files-store.ts`. It reads the tree and the changes from the Worker and publishes a `FilesSnapshot`.
  - **`waiting` prop:** a prop of `FilesPanel` that shows "Waiting for the sandbox" in place of a list that the workspace has not saved.
- **Background:** All files and Changes show the copy of each list that the workspace saved, also while the sandbox starts. The snapshot holds each list as a value or `null`, and a separate error. `null` means three things: the read runs, the Worker has no saved copy, or the read failed. `FilesPanel` tells them apart with the helper `notSaved`, which checks only the error code `file_unavailable`. The Worker sends that code with status 503 when it has no saved copy, from `fileUnavailable()`. It also sends it with status 502 when it cannot read a saved copy, from `invalidFileResponse()`, such as for a bad manifest, a missing chunk, or a stored list that the parser rejects.
- **Problem:** Each screen that reads a list must infer its state from `null` and an error code. A screen that forgets the code shows a load as a missing copy. The review of the branch found this defect in `FilesPanel`, and the branch fixed it there only. `notSaved` also treats a 502 `file_unavailable` reply as no saved copy. So while a sandbox starts, a saved copy that the Worker cannot read shows "Waiting for the sandbox" in place of "The files didn't load" and Try again.
- **Impact if no action:** A later screen can repeat the defect: a saved list that loads shows "Waiting for the sandbox", or a failed read hides Try again.
- **Root question:** How does each screen learn whether a list loads, is saved, has no saved copy, or failed to load?
- **Options:**
  - **A.** Keep the inference in `FilesPanel`, and make `notSaved` also require the status 503. Add a 502 case to `src/files/panel/WaitingLists.test.tsx`. Effort: Small.
  - **B.** Make the files store publish one state for each list: `loading`, `saved`, `absent` only from a 503 `file_unavailable` reply, or `failed`. `FilesPanel` switches on that value. Update the store tests and the panel tests. Effort: Medium.
- **Left out:** A new Worker error code for "no saved list" changes an API reply and its Worker tests, and the 503 status already gives the same fact.
- **Wider fix:** B. A type with distinct states removes the inference from `null`.
- **Previous examples:** Commit `85ca44e9` (#298): the GitHub bar showed "Loading from GitHub" although the app had a stored state.
- **Recommendation:** B. It removes the wrong case for each screen that reads a list.
- **Action:** fix after merge, apply B, because it changes the files store outside the branch, the direct fix already ends the common defect, and the 502 case needs an unreadable saved copy.
