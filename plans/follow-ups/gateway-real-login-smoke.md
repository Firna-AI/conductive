# Check the deployed gateway with real logins

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge section of the model gateway plan on branch `conductor/model-gateway-worker-model-proxy-decision-120` (open check 5).
- **Location:** `worker/model-gateway/route.ts`, `worker/model-gateway/stream.ts`, `worker/model-gateway/request-lifetime.ts`, and `worker/model-gateway/upload.ts`.
- **Reason:** The checks need the deployed Worker on Cloudflare and real agent logins, so they can run only after the merge deploys the change.

- **Terms:**
  - **Model gateway:** the Worker routes on `api.conductive.build` under `/v1/model/claude` and `/v1/model/codex`. They take the model requests of the agents in a cloud computer from a newer org image, add the real agent login of the session starter, and stream the answer from Anthropic or OpenAI.
  - **Turn check:** the call from the gateway to the workspace Durable Object that confirms that the turn of a turn token still runs.
- **Background:**
  - The tests of the change use fake upstreams and a local Worker runtime. They do not show the behaviour of the deployed Worker with Anthropic and OpenAI.
  - On 10 November 2026, a one-time check sent small requests in the request shapes of the pinned `claude` program straight to Anthropic, with a Claude subscription token and an Anthropic API key. Anthropic accepted each one. That check did not go through the deployed gateway.
  - The gateway holds back no part of an answer, ends an answer within 30 seconds after its turn ends, and passes uploads up to 100,000,000 bytes, as `docs/protocol/model-gateway.md` says.
- **Task:** On the deployed Worker, with a real login of each kind (a Claude subscription token, an Anthropic API key, and an OpenAI API key), check these points:
  - An answer streams to the agent in steps, not at its end.
  - An answer of more than 20 minutes completes.
  - A deploy of the Worker during an answer ends it, and the agent program sends the request again.
  - The added time of the turn check on each request.
  - An upload with no `Content-Length` reaches each upstream.
- **Impact if no action:** A defect of the deployed runtime, such as a held-back stream or a refused upload, shows only when users meet it.
- **Needs:** The merged and deployed change, a workspace from an org image with a runner of protocol version 2, and a real login of each kind.
- **Done when:** Each point has a recorded result, and each failure has its own follow-up item.
