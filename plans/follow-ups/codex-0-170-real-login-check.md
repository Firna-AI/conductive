# Check Codex 0.170.0 with real logins

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from the branch `calummoore/kyoto-votd`, which updated the pinned Codex from 0.167.0 to 0.170.0 and added GPT-6.2 Sol and GPT-6.2 Astra.
- **Location:** `runner/sdk-helper/package.json`, `runner/codex-logins.md`, `runner/sdk-helper/src/providers/codex-settings.ts`, `wrangler.jsonc`.
- **Reason:** The checks need the deployed Worker, sandboxes on the new sandbox software, and real OpenAI logins, so they can run only after the merge.

- **Terms:**
  - **ChatGPT sign-in:** the Codex login kind `token`. The Worker holds the real ChatGPT tokens. Codex in the sandbox gets only a turn token.
  - **Cloud rules:** the rules of a ChatGPT business or enterprise workspace. Codex reads them from `GET /backend-api/wham/config/bundle` through the gateway.
- **Background:**
  - `runner/codex-logins.md` says to check both login routes again at each update of the pinned Codex.
  - On 2026-11-18, the branch ran the runner's real Codex adapter with the real Codex 0.170.0 program against a local fake gateway. It used no real account and no real inference. Both login kinds finished a turn. The routes that Codex called were the same as with 0.167.0. Effort and Fast reached the request for GPT-6.1 Sol, GPT-6.2 Sol, and GPT-6.2 Astra. After a 502 of the model request, Codex sent the request again. Conversations saved by 0.167.0 continued under 0.170.0 for each change of login kind.
  - With an OpenAI API key, Codex 0.167.0 had no catalogue entry for the GPT-6.2 models. It used fallback settings, dropped Fast, and sent Ultra as Medium. That is why the pin moved to 0.170.0.
  - `runner/codex-logins.md` says that the pinned program ignores `chatgpt_base_url` in cloud rules, and accepts it only from local managed requirements. The fake check could not prove this for 0.170.0, because no tried format of the cloud rules reply took effect. The runner still fails the turn when `configRequirements/read` gives another address.
- **Task:** On the deployed app, with a sandbox on the new sandbox software, check these points:
  - A ChatGPT sign-in on a Plus or Pro plan runs a turn on GPT-6.2 Sol and on GPT-6.2 Astra, at High and at Ultra, with Fast on and off.
  - An OpenAI API key runs a turn on GPT-6.2 Sol. If OpenAI refuses the model for API keys, record the error text.
  - A ChatGPT business workspace with a `chatgpt_base_url` cloud rule that names another address: Codex 0.170.0 ignores the rule, or the turn fails with the cause "This ChatGPT workspace requires another Codex address".
  - A session that ran on a ChatGPT sign-in continues after its starter switches to an OpenAI API key, and keeps its earlier messages.
- **Impact if no action:** A refusal of the new models, or a changed rule of the cloud rules, shows only when users meet it.
- **Needs:** The merged and deployed change, a sandbox on the new sandbox software, a ChatGPT Plus or Pro sign-in, an OpenAI API key, and a ChatGPT business workspace for the cloud rules point.
- **Done when:** Each point has a recorded result in this file or in the pull request that deletes it, and each failure has its own follow-up item.
