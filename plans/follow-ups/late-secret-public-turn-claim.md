# Public late-answer text omits joined turns

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from the watch-session public documentation audit.
- **Location:** `src/marketing/terms-org.ts:102` and `src/marketing/docs/security.md:271`.
- **Reason:** These existing claims concern late secret answers, which the watch change does not alter.

- **Terms:**
  - **Late answer:** a member allows a secret request after its tool call stops waiting.
  - **Notice:** the app line that tells the asking agent about that answer.
- **Background:** `docs/protocol/secret-late-answers.md` permits a notice to start a turn or join a running turn. A joined turn keeps its sender. The app sends no notice when current access cannot admit one. `worker/chat/secret-notice.ts` implements these cases.
- **Problem:** The Terms say, "a new turn tells the agent" and attribute that turn to the asking turn's sender. The security guide says a later Allow "tells the agent in a new turn". Both omit joining and unavailable delivery.
- **Impact if no action:** Readers can expect another turn when the notice instead joins existing work or cannot reach the agent.
- **Root question:** How should public text explain the current late-answer delivery rule?
- **Options:**
  - **A.** Correct the two public passages to describe starting, joining, and unavailable delivery. Keep the current protocol and code. Update the Terms effective date when their text changes. Effort: Small.
  - **B.** Require a separate new turn for every late answer. Change the protocol, runtime, tests, and public text. This changes the current sender and admission behavior. Effort: Large.
- **Left out:** Removing the feature description loses useful information. A new runtime check cannot correct inaccurate public words. These two approaches cover wording alignment and a changed product contract.
- **Wider fix:** None. The documentation skill already requires full legal and public-guide reads when protocol facts change.
- **Previous examples:** `plans/follow-ups/late-secret-answer-sender-line.md` records a separate mismatch about the notice's sender prefix.
- **Related:** The sender-prefix item concerns the same feature, but its answer does not settle this public turn claim.
- **Recommendation:** A. It describes the existing protocol and runtime without changing the product behavior.
- **Action:** Fix after merge, apply A, in separate work. The watch feature changes no late-secret rule or public claim.
