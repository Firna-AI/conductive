# The connect form words exist twice

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from Milestone 5 of the plan `plans/codex-access-token.md` on branch `calummoore/openai-subscription-token-support`.
- **Location:** `src/shell/account/AgentConnectForm.tsx`, `src/shell/account/labels.ts`, `docs/mockups/src/components/settings/AgentConnectForm.tsx`, and `docs/mockups/src/fixtures/logins.ts`.
- **Reason:** the duplication is older than the branch that found it, and the fix moves words across four files of two areas that the branch did not set out to restructure.

- **Terms:**
  - **Connect form:** the form under the row of an agent on the account page, where a member pastes an agent login.
  - **Shared copy module:** a module under `docs/mockups/src/` with words that the app and the mockups both import, such as `docs/mockups/src/screens/getStartedCopy.ts`.
- **Background:**
  - The mockups in `docs/mockups/` are the visual spec of the app.
  - The app form and the mockup form each hold their own copy of the kind names, the order of the switch, the help texts, the field labels, the placeholders, and the pages that make a secret.
  - The two copies hold the same words today, apart from the hint under the field, which `plans/follow-ups/connect-form-test-hint.md` covers.
  - The repository already shares words between the app and the mockups in `getStartedCopy.ts`, `signInCopy.ts`, and `linkedCopy.ts`. The app wraps the mockup part `docs/mockups/src/components/settings/LoginShare.tsx` in `src/shell/account/LoginShareSetting.tsx`.
- **Problem:** Each change of the connect form must edit both copies, and a reviewer must compare them.
- **Impact if no action:** The app and its visual spec can drift apart with each new login kind.
- **Root question:** How do the app and the mockup keep the same words in the connect form?
- **Options:**
  - **A.** Change nothing. Each change edits both copies. Effort: Small.
  - **B.** Add a shared copy module beside the mockup form. It holds the kind names, the switch order, the labels, the placeholders, the help texts as plain parts, and the pages. Both forms render from it, and each form keeps its own link part. The values move out of `docs/mockups/src/fixtures/logins.ts`. Effort: Medium.
  - **C.** Make the mockup form a part without state, and let the app wrap it, as `LoginShareSetting.tsx` wraps `LoginShare.tsx`. Effort: Medium.
- **Left out:**
  - The app imports the words from `docs/mockups/src/fixtures/logins.ts`: product code would then read a module of sample data, and the help texts would still exist twice. B is better on every point.
  - A module in `src/shell/account/` that the mockup imports: it needs the same edits as B, and it moves the words of the visual spec out of the mockups.
- **Wider fix:** C. It removes the second copy of the words and of the layout.
- **Previous examples:** `getStartedCopy.ts`, `signInCopy.ts`, and `linkedCopy.ts` share words. `LoginShare.tsx` is a shared part.
- **Recommendation:** B. It follows the shared copy modules that the repository already uses. C protects the codebase best, but both forms change more.
- **Action:** fix after merge, apply B, because the duplication is older than this branch and the fix restructures two areas.
