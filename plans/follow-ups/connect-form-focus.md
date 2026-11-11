# Focus falls to the page when a Connect form opens

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, from the work on branch `calummoore/openai-subscription-token-support` (pull request #177), while the focus of the ChatGPT sign-in steps was fixed.
- **Location:** `src/shell/account/AgentList.tsx:62`, `:129`, and `:161`, and `src/shell/account/AgentConnectForm.tsx`.
- **Reason:** the same behaviour exists on `main` for the Claude and API key forms, and no recorded decision covers the focus outside the ChatGPT sign-in steps.

- **Terms:**
  - **Connect form:** the form under the row of an agent on the account page, where a member connects an agent login. Connect opens it in place of the Connect button.
- **Background:**
  - Cancel, a saved key, or a finished sign-in closes the form, and the row shows its login again.
  - On 11 November 2026 the user chose to move the focus to the first line of each new step inside the ChatGPT sign-in, in `src/shell/account/step-focus.ts`. That answer covers only the steps inside the sign-in.
  - Dialogs and sheets already return the focus through `returnFocus` in `src/shell/ui/Sheet.tsx:56`.
- **Problem:** When the form opens or closes, the pressed button or the form leaves the page, and the focus drops to the page.
- **Impact if no action:** Keyboard and screen reader users lose their place after each Connect, Cancel, and connected login, for Claude and for Codex.
- **Root question:** How does a keyboard user keep their place when a Connect form opens or closes?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Move the focus to the switch of the form when it opens. When it closes, move it back to the row: to Connect after Cancel, and to the agent name after a connect. Effort: Medium.
  - **C.** Build one shared helper for each inline form that replaces its button, and use it first in the Connect forms. Effort: Medium.
- **Left out:** A dialog for the form, because the mockups draw the form under the row.
- **Wider fix:** C.
- **Previous examples:** `returnFocus` of `src/shell/ui/Sheet.tsx`.
- **Recommendation:** C. It fixes every inline form at about the cost of B.
- **Action:** ask the user, because the mockups do not state the focus, and the user's answer of 11 November 2026 covered only the sign-in steps.
