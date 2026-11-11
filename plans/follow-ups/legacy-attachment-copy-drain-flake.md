# Legacy attachment failure can outlast test drain

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during the merge of main into `calummoore/routines-feature-brainstorm`.
- **Location:** `worker/chat/attachment-legacy-path.test.ts:73`, `worker/chat/harness.test-support.ts:210`, and `worker/chat/attachment-delivery.ts:87`.
- **Reason:** The unchanged test failed under full-suite load and passed alone, so its investigation belongs on a separate branch.

- **Terms:**
  - **Attachment preparation:** The background work that copies a message's files before its commands reach the agent runner.
  - **Drain:** The test helper that waits for background work and then processes runner transport work.
- **Background:** The chat backend stores relative attachment paths and resolves them before each delivery. An older stored command can contain an absolute path. The test requires that command to fail safely, even when stored copy proof exists.
- **Problem:** The complete gate failed in `fails a legacy absolute path through copy preparation despite stored proof`. After `runner.ready` and `drainAttachments()`, the session still had an active turn. The assertion expected `activeTurnId: null` and `retryMessageId: 'legacy-message'`. It received `activeTurnId: 'chat-0002'` and `retryMessageId: null`.
  `npm run check` reported 822 passing test files and one failing file. It reported 2,434 passing tests and one failing test. The isolated command `npm run test -- worker/chat/attachment-legacy-path.test.ts` then passed its single test. The test, attachment preparation, and attachment copy files matched main at `20083050b2f427b4ddd30df9aa6843525bb8edd0`.
- **Impact if no action:** A correct branch can fail its complete gate because the test reads the session before the attachment failure settles.
- **Root question:** How should this test wait until the legacy attachment failure has finished?
- **Options:**
  - **A.** Reproduce the ordering and wait for the attachment failure in this test. Keep every assertion. Effort: Small.
  - **B.** Give the shared attachment drain a completion boundary that also includes work started by transport processing. Keep every assertion. Effort: Small.
  - **C.** Give the shared background and transport harness one completion boundary for all deferred chat work. This reaches more tests. Effort: Medium.
- **Left out:** A retry, sleep, longer timeout, skipped test, or weaker assertion would hide the ordering problem.
- **Wider fix:** B, if transport processing can start attachment work after the current background drain has finished.
- **Previous examples:** `plans/follow-ups/account-routing-replay-flake.md` records another native chat harness ordering failure. It does not prove the cause here.
- **Recommendation:** B. A shared completion boundary would protect every attachment test that uses the same drain.
- **Action:** fix after merge, apply B if an ordering reproduction confirms the suspected source. Otherwise identify the cause before changing the harness.

The suspected source is asynchronous ordering between the background drain,
runner readiness processing, and the attachment failure transaction. The
failure does not establish a defect in production delivery. Reproduce the
failure before changing code. Record pass counts before and after the fix.

On 11 November 2026, the complete gate of the branch
`calummoore/repo-renaming-risks` failed the same test with the same
received values: `activeTurnId: 'chat-0002'` and `retryMessageId: null`.
It reported 863 passing test files and one failing file, and 2,541 passing
tests and one failing test, in 1,352 seconds. The test then passed 5 of 5
isolated runs of `npx vitest run worker/chat/attachment-legacy-path.test.ts`.
That branch changed no chat code.
