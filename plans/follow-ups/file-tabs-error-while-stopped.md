# File tabs show an error while stopped

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from the branch `calummoore/sandbox-startup-diff-error`, which made file and diff tabs wait while the sandbox starts.
- **Location:** `TabPage` and `sandboxPlaceholder` in `src/shell/workspace/files/files-features.tsx`. `replacesLists` in `docs/mockups/src/components/workspace/sandboxNoticeState.ts`. The `placeholder` prop of `src/files/page/FilePage.tsx` and `src/files/page/DiffPage.tsx`. The diff route in `worker/files/handlers.ts`. "Files and changes" in `docs/protocol/workspace-tools.md`.
- **Reason:** No protocol doc says what a file or diff tab shows while the sandbox is stopped, so each fix adds a requirement that the user reviews.

- **Terms:**
  - **Sandbox panel:** the state of a cloud computer that does not run, such as "Waiting for the sandbox", drawn by `SandboxPanel` in `src/shell/workspace/SandboxNotice.tsx`.
  - **Agent runner:** the program in the cloud computer that runs the agents and serves each file read and diff read of the app.
  - **Kept lists:** the last All files tree and Changes list, which the workspace stores so that both lists show while the sandbox sleeps.
- **Background:**
  - A file or diff tab shows one file of the workspace branch, in the centre column on desktop and in the Files tab on a phone.
  - The diff route answers `file_unavailable` with HTTP 503 whenever the agent runner is not connected. A file read then falls back to the sandbox provider, which reads files only while the sandbox runs.
  - While the sandbox starts, while the app refuses its start, and after a failed first start, the sandbox panel takes the place of the lists. A file or diff tab then shows the same panel and reads nothing. `replacesLists` holds that rule.
  - While the sandbox is stopped, and after a later start failed, the lists show the kept lists. A file or diff tab still reads.
  - The protocol says that the files and the tools wait while the sandbox starts, in "Start steps" of `docs/protocol/workspace-life.md`. It says nothing about a stopped sandbox.
- **Problem:** While the sandbox is stopped or its later start failed, each read of a file or diff tab fails. The tab then shows "This diff didn't open" or "This file didn't open" with Try again. Try again fails too until a member resumes the sandbox.
- **Impact if no action:** A member who opens a changed file from the kept Changes list of a stopped workspace sees an error that does not say why or how to recover. Resume shows only under the chat, which the tab hides on desktop.
- **Root question:** What does a file or diff tab show while its sandbox is stopped, or after its later start failed?
- **Options:**
  - **A.** Change nothing. The tab reads, fails, and shows the error with Try again. Effort: Small.
  - **B.** Show the sandbox panel in place of the content of each file or diff tab, as the start does. The tab reads nothing until the sandbox runs. A tab that already shows content also gives way to the panel, so a member loses the diff that they read when the sandbox stops. Add the rule to `docs/protocol/workspace-tools.md`. Effort: Small.
  - **C.** Keep the content that a tab already shows. Show the sandbox panel in place of a read that would start, and read nothing until the sandbox runs. Add the rule to `docs/protocol/workspace-tools.md`. Effort: Small.
- **Left out:** A copy of the file content in the app's storage, because the protocol rejects a copy of each user's code in the app, in "Stop and resume" of `docs/protocol/workspace-life.md`. A resume when the tab reads, because the protocol rejects a start that the user did not ask for.
- **Wider fix:** None. The shell gives every file and diff tab its sandbox state in one place, `TabPage`, so each option changes one rule.
- **Previous examples:** The same tabs showed the same error while the sandbox started. The branch `calummoore/sandbox-startup-diff-error` fixed that on 2026-11-10.
- **Recommendation:** C. It keeps what the member reads, as the lists keep the kept lists, and it replaces only an error that cannot recover. B is simpler, but it hides a diff that is still correct.
- **Action:** ask the user, because each option adds a requirement for a state that no protocol doc covers.

A side effect also needs B or C. When a stopped workspace opens at a file or diff address, the app shows the workspace first and resumes it after. So the tab reads while the state is still stopped. In a test over the fake API, the resume answered first, and the tab showed "Waiting for the sandbox" with no error. In production the order of the two replies is not fixed, so the error can show until the start begins. B and C read nothing while the sandbox is stopped, so they remove this too.
