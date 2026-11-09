# The connect form mockup promises a login test

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the plan `plans/codex-access-token.md` on branch `calummoore/openai-subscription-token-support`, while its mockup work was planned.
- **Location:** `docs/mockups/src/components/settings/AgentConnectForm.tsx:18` and `src/shell/account/AgentConnectForm.tsx:24`.
- **Reason:** the change that found it adds a login kind and does not own this hint, and only the user decides which side of a mismatch between a mockup and the app is right.

- **Terms:**
  - **Connect form:** the form under the row of an agent on the account page, where a member pastes an agent login.
- **Background:**
  - The mockups in `docs/mockups/` are the visual spec of the app.
  - The hint under the secret field of the connect form differs between them. The mockup says "Conductive tests it once, and never shows it again." The app says "Conductive keeps it encrypted, and never shows it again."
  - The app saves the secret with no test, as the comment at `src/shell/account/AgentConnectForm.tsx:24` says.
  - A note of the options check of decision 33, of 5 November 2026, said "The app tests each key once when the user connects it." No protocol doc requires a test.
- **Problem:** The mockup promises a test of the login that the app does not run.
- **Impact if no action:** The visual spec and the app disagree. An implementor who follows the mockup can copy a false claim into the app.
- **Root question:** Does the app test an agent login when a member connects it?
- **Options:**
  - **A.** Change the mockup hint to the text of the app. Effort: Small.
  - **B.** Test each login when a member connects it, with one small request to the provider before the save. Update the protocol doc and the app hint. Effort: Medium. Risk: the Worker must send the secret to the provider, and a test of a subscription token can count as use of that subscription.
- **Left out:** None. The app either tests a login or it does not, so these are the only two approaches.
- **Wider fix:** None. Each mockup text that states a behaviour already follows the `mockups` skill, which keeps mockups aligned with the app.
- **Previous examples:** None found.
- **Recommendation:** A. A test request adds a call with the secret from the Worker, and a failed turn already shows a login that does not work.
- **Action:** ask the user, because only the user decides which side of a mismatch between a mockup and the app is right.
