# Check dropped model answers on a live workspace

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, from the branch `calummoore/delft-n4qf`, the post-merge task of its plan "Model answers that drop mid-stream".
- **Location:** `worker/model-gateway/request-lifetime.ts`, `worker/model-gateway/workspace.ts`, `runner/sdk-helper/src/providers/claude-events.ts`.
- **Reason:** The check needs the deployed Worker, a real Claude login, and a real reset of a workspace Durable Object, which no local test has.

- **Terms:**
  - **Model gateway:** the Worker routes that take the model requests of the agents in a cloud computer, add the agent login of the turn, and stream the answer back.
  - **Turn token check:** the check that the gateway runs every 15 seconds while an answer streams. An answer ends when no check passes for 30 seconds.
  - **Drop:** a model answer stream that ends before the answer is complete. Claude then reports, for example, "Connection lost mid-response. The response above may be incomplete."
  - **Continue message:** a hidden user message that the Claude adapter of the runner sends once after a drop, in place of a turn failure.
- **Background:**
  - On 16 November 2026 a member saw a Claude turn end with "This turn stopped. API Error: Connection lost mid-response."
  - The change of the branch above makes the gateway retry a turn token check that throws, after 1, 2, then 4 seconds, with a new Durable Object handle. A check with no Codex claim first reads the turn outside the chat queue of the workspace object. The gateway writes the Worker warnings `model_gateway_check_failed`, `model_gateway_check_retry`, and `model_gateway_answer_ended`.
  - The Claude adapter sends one continue message after a drop. A second drop in the same agent process fails the turn as before. `docs/protocol/dropped-answers.md` and `docs/protocol/model-gateway-requests.md#streams` state the rules.
  - Cloudflare documents that an active Durable Object takes new code up to 5 minutes after a deploy, unless the deploy uses `--durable-objects-code-update-mode immediate`. The working agent of the branch could not open that page and did not confirm it.
  - Local tests use fake Durable Objects and a fake Claude program. They cannot show what the real Claude program keeps when its stream drops during a tool call.
- **Task:**
  1. Start a long Claude turn in a workspace of the test deployment.
  2. While the answer streams, reset the workspace Durable Object: deploy with the immediate update mode, or keep the answer streaming for more than 5 minutes after a normal deploy.
  3. Check the Worker logs for the three gateway warnings, and check that the answer keeps streaming.
  4. Cut an answer on purpose, also once during a tool call, for example by a stop of the gateway connection. Check that the chat keeps the cut part, that the agent continues once and says that the connection dropped, and that the turn ends normally.
- **Impact if no action:** A defect that only the real Claude program or a real object reset shows stays unknown until members meet it.
- **Needs:** The merged and deployed change, a workspace with a Claude login, and access to the Worker logs.
- **Done when:** One reset keeps a streaming answer alive, one cut answer continues once and ends normally, and the results are written in this item or in a new item for each defect.
