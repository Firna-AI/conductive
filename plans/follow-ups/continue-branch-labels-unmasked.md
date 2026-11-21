# Continue screens show raw branch names and paths

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-21, from the branch `calummoore/follow-up-github-branch-labels-are-not-knov`, outside the scope of its fix of the GitHub screens.
- **Location:** `worker/lifecycle/continue-publication.ts:40`, `worker/lifecycle/continue-progress.ts:88` and `:246`, `worker/app-api/continue.ts:51` and `:74`, `src/shared/workspaces.ts:86`, `src/github/continueActions.ts:32`, `src/shell/workspace/ContinueDialog.tsx:34`, `src/chat/api/read-continued.ts:15`, `src/chat/components/TranscriptItem.tsx:130`, and `src/shared/transcript/markdown-items.ts:157`.
- **Reason:** The fix of the Continue stop causes in `plans/follow-ups/continue-failure-causes.md` rewrites the same Continue messages and files now, so this fix follows its merge.

- **Terms:**
  - **Continue:** the action of the pull request bar that moves a merged workspace to a new branch from the latest default branch of its repository.
  - **Masked label:** the text that a screen shows in place of a path or a branch name. It has `[redacted]` in place of each exact copy of a secret value.
  - **Continue note:** the chat line of each session after Continue, such as "Ana continued on `ana/carts-v2-7k2q`, a new branch from main".
  - **Continue question:** the dialog that lists the local work of the sandbox before Continue changes the branch.
- **Background:**
  - `docs/protocol/tokens-and-secrets.md`, under "Secrets that users enter", requires a separate masked label of each path and branch name on screens. The browser still gets the real names, because reads and Git steps need them (decision 145, 8 November 2026).
  - The Privacy page in `src/marketing/privacy.ts` promises the same for file paths and for the names of the default and base branches.
  - `docs/protocol/session-transcripts.md` says that a transcript copy uses the words of the chat and shows each path by its label.
  - The Worker already sends masked labels for the file data and for the GitHub state, the banner record of the pull request bar. `pathLabel`, `baseLabel`, and `filterGitHubBanner` of `src/shared/output-fields.ts` fill the optional `displayPath`, `displayBaseBranch`, and `displayBranch`. They leave out a label that equals its real name.
  - The labels use the secret values of the last start of the sandbox, from `runningOutputSecrets` in `worker/lifecycle/output-secrets.ts`. The Worker keeps this list of values to match and sends it to no browser. The real names in the browser data can still hold a copy of a value, as decision 145 allows.
  - `worker/github/output.ts` adds the GitHub labels to the HTTP replies, to each new or replayed `github.updated` event, and to the old history of each browser connection. Stored events keep the real names.
  - Continue starts from the latest default branch of the repository, as `worker/lifecycle/continue-admission.ts:95` and `worker/lifecycle/continue-progress.ts:52` read it. That branch can differ from the base branch of the bar, for example after a pull request run whose pull request targets another branch.
- **Problem:**
  - The note: `publishContinue` emits `workspace.continued` with the raw `branch` and `baseBranch`. `readContinued` keeps only those fields. `ContinuedLine` and the transcript copy show them.
  - The stop message: `continueFailed` writes the raw default branch and the raw old branch into "Continue stopped: the changed files clash with the latest …". The bar shows that text under the bar, in the `continue-failed` case of `messageOf` in `src/github/barView.ts`.
  - The question: the `confirmation-required` reply of the Continue routes carries the raw default branch and the raw path of each changed file. `ContinueWorkspaceResponse` types it, and `readContinueResponse` reads it.
  - `ContinueDialog` names that branch in its intro, and `LocalWorkList` lists each path. The dialog reuses the label of the bar only when the base of the question equals the base of the bar. A question with another base shows the real name of the default branch.
- **Impact if no action:** A screenshot or a copied transcript can show a secret value that the app must hide. These screens do not keep the Privacy promise about default branch names and file paths.
- **Root question:** How does each Continue screen name a branch and a file with a masked label, while the Git steps and the requests keep the real names?
- **Options:**
  - **A.** Write the masked names into each new note, stop message, and question, in place of the real names. No field is added. Old stored notes keep the raw names. Two paths that differ only in a secret value become equal in the question. Effort: Small.
  - **B.** Add optional labels at the source. Each new `workspace.continued` event gets `displayBranch` and `displayBaseBranch`. The question reply gets `displayBaseBranch` and a label of each changed file. The job masks each stop message before it stores the message. The readers keep the labels, and the screens and the copy show them or fall back to the real names. Old stored notes keep the raw names. Effort: Medium.
  - **C.** Add the labels at each boundary where the Worker sends Continue data, as the GitHub state does. Label each `workspace.continued` event in the browser stream and its old history, in the session history pages, and in the transcript route. At the outer route `worker/app-api/continue.ts`, add `displayBaseBranch` and the file labels to the question, and mask the text of each stop message. The readers keep the labels, and the screens fall back to the real names. Stored events and job records keep the real names, and old notes get labels too. Effort: Medium.
- **Left out:** Masking in the browser, because the browser then needs the secret values, and that exposes stored credentials. Words without the names, such as "the default branch", because they change the approved words and drop a fact that the member needs. Reuse of the bar label only on an equal base, because it leaves a question with another base raw, and the dialog already does it.
- **Wider fix:** C. One boundary helper beside `worker/github/output.ts` labels each name that Continue sends, so that each later screen of the same data gets the labels.
- **Previous examples:** Commit `216ed6791` split the real paths and base branches of the file data from their masked labels. `worker/github/output.ts` gives the GitHub state its labels at each boundary.
- **Related:**
  - `plans/follow-ups/continue-failure-causes.md` changes the same stop messages. This fix waits for its merge, then masks the names in its new messages.
  - `plans/follow-ups/workspace-branch-labels-unmasked.md` has the same class for the repository change and the New session text. They share the boundary helper and the files `src/chat/api/read-continued.ts`, `src/chat/components/TranscriptItem.tsx`, and `src/shared/transcript/markdown-items.ts`. The first fix to merge adds the helper, and the other reuses it.
  - `plans/follow-ups/shared-branch-move-job.md` gives Continue and the repository change one job, so that one fix of their messages reaches both.
- **Recommendation:** C. It uses the label contract of the file data and the GitHub state, labels old notes too, and keeps the real names for Git and the requests.
- **Action:** fix after merge, apply C, because the fix of the Continue stop causes changes the same Continue messages and files now.

Add a regression for each Continue screen with a marked fake value in the default branch, the new branch, and a changed file. Use a question whose default branch differs from the base of the bar. Assert the exact masked label on each screen and in the copied transcript. Assert the exact real name in the Git command and in the request.
