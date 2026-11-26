# Public late-answer text omits joined turns

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from the watch-session public documentation audit. Found again on 2026-11-26 by branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, outside the scope of its review rounds 1 and 2.
- **Location:** `src/marketing/terms-org.ts:123`.
- **Reason:** The Terms sentence is on `main`, and neither the watch change nor the needs-input change alters the late-answer rule.

- **Terms:**
  - **Late answer:** a member allows a secret request after its tool call stops waiting.
  - **Notice:** the app line that tells the asking agent about that answer.
- **Background:**
  - `docs/protocol/secret-late-answers.md`, "Late answers", permits a notice to start a turn or to join a running turn. A joined turn keeps its sender. The app sends no notice when current access cannot admit one. `worker/chat/secret-notice.ts` implements these cases.
  - The security guide now states the rule, at `src/marketing/docs/security.md:328`: "A late **Allow** can notify the agent in the same session. The notice joins a running turn or starts a new one." The needs-input change rewrote that passage on 26 November 2026. Before, it said that a later Allow "tells the agent in a new turn".
  - The late card of the app says "The agent stopped waiting. Allow tells it in a new turn." (`src/ui/components/chat/secretRunCopy.ts:24`). `docs/protocol/secret-late-answers.md:33` requires those words. This item does not change them.
  - A change to the Terms text gives a new Terms version, because `TERMS_VERSION` is a digest of the text. The same change sets the effective date at the top of the Terms in `src/marketing/terms.ts` to the date of the change.
- **Problem:** The Terms say, "a new turn tells the agent", and attribute that turn to the sender of the turn that asked. They omit a notice that joins a running turn, which keeps the sender of that turn, and a notice that the app cannot send.
- **Impact if no action:** Readers can expect another turn when the notice instead joins existing work or cannot reach the agent.
- **Root question:** How should public text explain the current late-answer delivery rule?
- **Options:**
  - **A.** Correct the Terms passage to describe starting, joining, and unavailable delivery. Keep the current protocol and code. Update the Terms effective date in the same change. Effort: Small.
  - **B.** Require a separate new turn for every late answer. Change the protocol, runtime, tests, and public text. This changes the current sender and admission behavior. Effort: Large.
- **Left out:** Removing the feature description loses useful information. A new runtime check cannot correct inaccurate public words. These two approaches cover wording alignment and a changed product contract.
- **Wider fix:** None. The documentation skill already requires full legal and public-guide reads when protocol facts change.
- **Previous examples:** `plans/follow-ups/late-secret-answer-sender-line.md` records a separate mismatch about the notice's sender prefix.
- **Related:**
  - The sender-prefix item concerns the same feature, but its answer does not settle this public turn claim.
  - `plans/follow-ups/late-answer-line-claims-new-turn.md` holds the same claim of a new turn in the app: the line under a late request after its Allow says "You answered, and a new turn told the agent.", also when the notice joined a running turn. One branch can fix both texts. This item still needs its own Terms revision and effective date.
- **Recommendation:** A. It describes the existing protocol and runtime without changing the product behavior.
- **Action:** fix after merge, apply A, because the Terms sentence is on `main`, and no change that found it alters the late-answer rule.
