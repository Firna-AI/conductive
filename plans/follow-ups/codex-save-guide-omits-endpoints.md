# Codex save guide excludes supported endpoints

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-12, from review finding 137 on `calummoore/cli-proxy-setup`.
- **Location:** `worker/app-api/README.md:118`, `worker/app-api/boot.ts:124-131`, `worker/chat/login-kind.ts:12-13`, and `src/shared/account.ts:58-61`.
- **Reason:** The branch used its two permitted review fix rounds, and this Low documentation issue is not critical.

- **Terms:**
  - **Own endpoint login:** An agent login with the address and key of a gateway or proxy that the user chooses.
  - **Worker:** The Cloudflare service that handles browser API requests and forwards model requests.
- **Background:** Conductive supports Codex through an OpenAI API key, ChatGPT device sign-in, or an own endpoint login. The login save route accepts an API key or an endpoint. ChatGPT connects through device sign-in.
- **Problem:** `worker/app-api/README.md` says, "The ordinary login save accepts only an API key for Codex." The Worker and the shared request type also accept `endpoint`. The development backend in `src/app/dev/agent-login-routes.ts` follows the same rule. The same README already describes endpoint saves and their reuse defaults.
- **Impact if no action:** Developers receive an incorrect description of supported Codex login requests.
- **Root question:** How should the API guide describe Codex saves when supported login kinds change?
- **Options:**
  - **A.** State that the ordinary save accepts an API key or an own endpoint. Keep ChatGPT device sign-in separate. Effort: Small.
  - **B.** Replace the claim with a link to `SaveAgentLoginRequest` in `src/shared/account.ts`. Readers follow the link for supported kinds. Effort: Small.
  - **C.** Name the route and its refusal rule: `PUT /api/account/agent-logins/codex` refuses `token`, so only device sign-in connects a ChatGPT login. Keep accepted kinds in the existing endpoint and reuse bullets. An optional link can name the shared request type. Effort: Small.
- **Left out:** Keeping the claim leaves the contradiction. Removing endpoint support breaks the approved endpoint feature. Deleting the sentence without replacement loses the distinction between Codex and Claude token saves. A test of doc prose is outside the testing rules.
- **Wider fix:** None. The documentation skill already requires docs to match changed behavior.
- **Previous examples:** Commit `8485fc31` corrected stale deployment notes. `plans/follow-ups/push-refresh-trigger-mismatch.md` records another code and doc contradiction.
- **Recommendation:** C. It states the existing refusal rule without an accepted-kind list that another login kind can make stale.
- **Action:** fix after merge, apply C, because both permitted review fix rounds ran and this finding is Low.

The protocol already permits own endpoints for both agents in
`docs/protocol/own-endpoint-logins.md`. No behavior or protocol change is
needed. `worker/app-api/agent-endpoint-login.test.ts` and
`worker/app-api/codex-device-endpoint.test.ts` already save Codex endpoints
and receive HTTP 200. Compare the corrected sentence with those routes
and the shared request type. Add no test for this wording change.
