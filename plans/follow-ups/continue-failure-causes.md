# Continue guesses the cause of a stop

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from review finding 3 on `calummoore/github-status-bar-actions`.
- **Location:** `worker/lifecycle/continue-progress.ts`, `continue.ts`, `continue-commands.ts`, and `worker/lifecycle/command-journal.sh`.
- **Reason:** This rare message defect can be fixed independently and does not lose work.

- **Terms:**
  - **Continue:** The action that starts a new branch after a merge while keeping the workspace and its cloud computer.
  - **Command journal:** The saved native command result used to recover after a lost provider response.
- **Background:** Continue fetches the repository default branch and checks out a new branch. Its move command suppresses raw output. The journal retains the exit status. The Continue protocol requires a stopped move to keep work and name its reason.
- **Problem:** `continueFailed` chooses its message from the job phase. Every move failure gets the changed-files-clash message. Git can instead refuse because an index lock exists. Provider preparation, cancellation before a move, and an uncertain start can reach the same text without a failed checkout. A failed sandbox start can also receive an unrelated GitHub-access hint.
- **Impact if no action:** The member reads a false cause. Resolving changed files does not repair a lock, cancelled operation, or provider failure.
- **Root question:** How does every stopped Continue name an established cause and avoid guessing an unknown cause?
- **Options:**
  - **A.** Classify known Git failures in the move command and map safe exit markers to messages. Other stop sites still need their own causes. Effort: Medium.
  - **B.** Join diagnostic reads to the existing HEAD read after a failed move. State can change after the failure. Effort: Medium.
  - **C.** Add typed outcomes to every native command journal caller. This reaches builds, starts, and retention as well as Continue. Effort: Large.
  - **D.** Give Continue a closed stored stop-cause type. Set it at each stop site. Use reserved exit statuses for known Git causes. Map unknown, cancelled, provider, and start failures truthfully. Log only safe summaries. Effort: Medium.
  - **E.** Add a secondary details surface for filtered raw Git text. This adds user-visible behavior beyond the existing contract and requires approval before selection. Effort: Large.
- **Left out:** Raw Git output in the main message breaks the copy rules. Generic text alone loses an established clash reason. Repeating checkout does not classify its earlier failure. Continue must not clear a lock that can belong to a member's terminal command.
- **Wider fix:** D. A closed cause type with an unknown default removes phase-based guesses across Continue stop sites.
- **Previous examples:** The coordinator failure test checks the code but not the message. The browser fake pairs each move failure with clash text. Earlier build and start failures gained safe summaries in commits `3f35ef98` and `2e6961f9`.
- **Recommendation:** D. It covers every Continue stop without changing unrelated native-task callers.
- **Action:** fix after merge, apply D, because this rare message defect is independent of the completed workflow.

Use the existing safe app error boundary and the product copy rules. Keep the approved clash text for a confirmed clash. Preserve the earlier branch, files, command ownership, and recovery behavior. Any comparison-base metadata step must have its own safe cause and must not count as evidence of a clash.

The journal already saves and replays exit statuses. A classified status can survive a lost result without changing every journal consumer.

Add a non-clash case to the existing Continue coordinator test. Add an index-lock case to the native test. Assert the exact safe message and unchanged work. Keep raw output, paths, tokens, and provider bodies out of the public error.
