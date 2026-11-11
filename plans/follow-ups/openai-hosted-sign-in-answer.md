# Record OpenAI's answer on hosted ChatGPT sign-ins

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from the open option D of decision 170 on branch `calummoore/openai-subscription-token-support` (pull request #177). The user parked it on 11 November 2026, while in contact with OpenAI.
- **Location:** `docs/protocol/tokens-and-secrets.md:136-138` and `src/marketing/terms-org.ts:52-53`.
- **Reason:** the answer comes from OpenAI, and only the user is in contact with OpenAI.

- **Terms:**
  - **Device code sign-in:** the ChatGPT sign-in of Codex. A member enters a code at OpenAI, and the Worker stores the sign-in encrypted and renews it.
- **Background:**
  - Members connect Codex to a ChatGPT plan with a device code sign-in. The real tokens stay in the Worker.
  - OpenAI's pages send paid or hosted apps to the Sign in with ChatGPT interest form. The user applied there, as decision 170 of 9 November 2026 chose.
  - The options check of decision 170 added option D: ask OpenAI in writing whether a hosted product may store and use members' sign-ins. On 11 November 2026 the user said that they are in contact with OpenAI.
  - `docs/protocol/tokens-and-secrets.md` states the risk: "OpenAI sends hosted apps to its Sign in with ChatGPT waitlist. ... OpenAI can block this use." The section "Working in an org" of the Terms says the same.
- **Task:** When OpenAI answers, record the answer. If OpenAI allows the use, remove or narrow the risk line and the Terms sentence, and set a new Terms version. If OpenAI forbids the use, propose the removal of the ChatGPT sign-in as a decision.
- **Impact if no action:** The protocol and the Terms keep a risk that the answer could remove. Or members rely on a use that OpenAI can block.
- **Needs:** OpenAI's written answer, from the user.
- **Done when:** The protocol doc and the Terms state OpenAI's answer, or a decision removes the ChatGPT sign-in.
