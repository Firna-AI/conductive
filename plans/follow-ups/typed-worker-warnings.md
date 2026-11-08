# A warning can still take free text

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from the focused review of the deploy fixes on the primary branch `calummoore/conductor-alternative-architecture` (decision 141): option D of the check of finding 1, and option B of finding 6.
- **Location:** `warnWorker` and `errorSummary` in `worker/warnings.ts`, and each caller of `warnWorker`, about ten, such as `worker/terminal/service.ts`, `worker/lifecycle/start-failure.ts`, `worker/lifecycle/start-coordinator.ts`, `worker/lifecycle/image-build-failure.ts`, `worker/chat/runner-channel.ts`, and the `warn` options of Get started and input activity.
- **Reason:** the fix changes the warning API at call sites outside the reviewed commits, and the last fix round before the first merge had no room for it.

- **Terms:**
  - **`warnWorker`:** the one function that writes a warning of the Worker to the log.
  - **Workers Logs:** Cloudflare's store that keeps each warning of the Worker for some days.
- **Background:** Finding 1 found warnings that copied command output and error messages, which can hold a secret. Commit `24146f2` removed that text, and `errorSummary` now gives only an error's class, status, and known code. `worker/README.md` states the rule: each message is fixed safe text.
- **Problem:** `warnWorker` still takes any string. Nothing stops the next warning from adding command output, an error message, or a reply body. Finding 6 adds that the two changed warnings have no test that fails when the removed text comes back.
- **Impact if no action:** A later change can write a secret to the log again, and no check catches it.
- **Root question:** How does the type of the warning API stop free text from reaching the log?
- **Options:**
  - **D.** Make `warnWorker` accept only fixed text with typed values: IDs, phases, numbers, booleans, and known or checked codes. A tagged template can carry them, or one JSON object for each warning, which Workers Logs can filter by field. `errorSummary` returns such values. Then command output, an error message, or a reply body does not compile at any call site without a cast. Effort: Medium.
- **Left out:** Masking known secret patterns, because it misses unknown formats. A test for every warning, because the type removes the case.
- **Wider fix:** D.
- **Previous examples:** findings 1 and 6 of that review, and commit `6b723c7`, which built `MaskedStartLog` for output that can hold secrets.
- **Recommendation:** D. It removes the leak for every later warning, also in a new form.
- **Action:** fix after merge, apply D.
