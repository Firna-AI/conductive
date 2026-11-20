# The fallback file read accepts paths in `.git`

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the options check of the plan `plans/html-file-preview.md` on branch `calummoore/preview-html-file-c42r`.
- **Location:** `worker/files/boat.ts:28`, `worker/files/paths.ts:4`, `src/shared/file-path.ts:2`.
- **Reason:** The HTML file preview change does not touch the file read routes, and the fix adds a stricter check of file paths, which the user decides.

- **Terms:**
  - **Fallback file read:** the read of one file through the sandbox provider's own file API, in `worker/files/boat.ts`. A file tab uses it when the agent runner is not connected.
  - **Runner file read:** the read of one file by the agent runner, in `crates/cnd-runner/src/repository/io.rs`.
- **Background:**
  - A file tab reads a file by its path from the top of the workspace repository. The Worker checks the path with `isFilePath` of `src/shared/file-path.ts`. That check refuses an empty path, a NUL, and each empty, `.`, or `..` segment.
  - The runner file read also refuses each segment named `.git`, in `safe_path` of `crates/cnd-runner/src/repository/access.rs`. It refuses a link that leaves the repository folder, and each file that is not a regular file.
  - The fallback file read joins the repository folder and the path, and asks the provider for that file. It applies only `isFilePath`.
- **Problem:** When the runner is not connected, a file tab can read a file inside `.git`, such as `.git/config`. It can also follow a link that leaves the repository folder, if the provider's file read follows links. The runner file read refuses both.
- **Impact if no action:** The two reads of one file tab follow two rules. A member reaches the same files from the terminal, so no new person gets access.
- **Root question:** Which files may a file tab read when the runner is not connected?
- **Options:**
  - **A.** Refuse each `.git` segment in the fallback file read, as the runner does. Effort: Small.
  - **B.** Add the `.git` rule to `isFilePath`, so that every path check of the app refuses it. Cost: every caller of `isFilePath` changes, such as file mentions and the workspace view. Effort: Medium.
  - **C.** Keep the fallback as it is, and state in the protocol docs that the two reads differ. Effort: Small.
- **Left out:** A check for links in the fallback read. The provider's file API gives no way to refuse a link, so the Worker cannot apply it.
- **Wider fix:** B. One path rule then serves each reader of a path.
- **Previous examples:** None found.
- **Recommendation:** A. It gives both reads of a file tab one rule for `.git`, with the smallest change.
- **Action:** ask the user, because A adds a stricter check of file paths, and the user decides each new rejection.
