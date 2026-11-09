# Sign in with ChatGPT for Codex

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from decision 170 of the plan `plans/codex-access-token.md` on branch `calummoore/openai-subscription-token-support`.
- **Location:** the Codex login form in `src/shell/account/AgentConnectForm.tsx`, the login save in `worker/app-api/boot.ts`, the Codex adapter in `runner/src/providers/codex.ts`, and the section "Agent logins" of `docs/protocol/access-and-security.md`.
- **Reason:** OpenAI gives Sign in with ChatGPT only to the partners that it admits, and it has not answered the operator's application yet.

- **Terms:**
  - **Sign in with ChatGPT:** OpenAI's sign-in for other apps. An app that OpenAI admits can run model requests on the user's ChatGPT plan.
  - **Codex access token:** a token that a ChatGPT Business or Enterprise member makes in ChatGPT's admin console. Codex then runs on that workspace's plan.
  - **Codex app server:** the Codex program that the agent runner starts in the cloud computer for each turn.
  - **Host ID:** a stable, opaque ID for each machine that runs an app, which OpenAI's open-source sign-in sends as `ext_agent_host_id`.
- **Background:**
  - A member connects Codex with an OpenAI API key or a Codex access token. A token works only for ChatGPT Business and Enterprise workspaces. So a member on a Plus or Pro plan cannot run Codex on that plan.
  - On 9 November 2026, the user chose to add the Codex access token at once, and to build Sign in with ChatGPT after OpenAI admits Conductive. The user had already applied through OpenAI's interest form, `https://openai.com/form/sign-in-with-chatgpt-interest/`.
  - On 9 November 2026, OpenAI's page `https://developers.openai.com/siwc/request-client-id` said that the sign-in is "currently offered to a select group of commercial partners".
  - OpenAI's page `https://developers.openai.com/siwc/token-sharing-open-source` gives a self-serve path to open-source and local apps only. It sends paid or remotely hosted apps to the interest form. A partner path for a hosted app can differ from the facts below.
  - The open-source path registers the app when the user first signs in, with a loopback callback and PKCE. It sends a host ID for each machine. The app keeps the refresh token and renews the access token itself.
  - OpenAI's page `https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server` runs the Codex app server with a model provider that reads the access token from the variable `ACCESS_TOKEN`. Its settings are `env_key="ACCESS_TOKEN"`, `base_url="https://api.openai.com/v1"`, `wire_api="responses"`, `requires_openai_auth=false`, and `supports_websockets=false`.
  - After a renewal, the app restarts the app server with the new token, and resumes the thread with `thread/resume`.
  - OpenAI's page `https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations` lists limits of the preview. Requests use `store: false` and `stream: true`. Hosted tools, such as tool search, file search, and Code Interpreter, do not work. A Codex setting that sends a tool search fails.
  - The access doc requires that no process that the agent starts inherits a login, and that no agent program writes a login to disk (decision 114). An access token in `ACCESS_TOKEN` must meet that rule, as the Codex access token does.
  - `plans/follow-ups/agent-logins-readable-in-sandbox.md` plans a Worker model proxy that keeps logins out of the sandbox. Sign in with ChatGPT fits that proxy, because the Worker holds and renews the tokens.
- **Task:** When OpenAI admits Conductive, read its partner documentation. Then brainstorm and plan Sign in with ChatGPT for Codex, with the `brainstorming` and `plans` skills.
- **Impact if no action:** A member on a Plus or Pro plan must pay for OpenAI API use to run Codex.
- **Needs:** OpenAI's admission of Conductive, and its partner documentation.
- **Done when:** a member connects Codex with Sign in with ChatGPT, and runs a turn on a Plus or Pro plan.
