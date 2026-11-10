# Read a gateway request record in Workers Logs

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge section of the model gateway plan on branch `conductor/model-gateway-worker-model-proxy-decision-120` (open check 7).
- **Location:** `observability` in `wrangler.jsonc`, and `worker/model-gateway/route.ts`.
- **Reason:** Only the deployed Worker writes Workers Logs records, so the check can run only after the merge deploys the change.

- **Terms:**
  - **Workers Logs:** Cloudflare's store of the Worker's logs. It keeps each warning of the Worker and a record of each request.
  - **Turn token:** the secret of one turn that the agent programs send to the model gateway in place of an agent login.
- **Background:**
  - The model gateway carries the turn token only in a request header, never in the path or the query of the address, because the logs of the Worker keep the address of each request. The gateway writes no body and no header value to a log, as `docs/protocol/model-gateway.md` says.
  - The tests cannot show what a Workers Logs record of the deployed Worker holds.
  - `plans/follow-ups/request-records-in-logs.md` asks the user whether the logs keep a record of each request. The number of records of one turn is a fact for that answer.
- **Task:** Read the Workers Logs record of a gateway request on the deployed Worker. Confirm that it holds no turn token and no login. Count the records of one turn, and add the count to `plans/follow-ups/request-records-in-logs.md`.
- **Impact if no action:** A turn token in a log record would stay unknown, and the request-record decision would lack its count.
- **Needs:** The merged and deployed change, a turn on a workspace from an org image with a runner of protocol version 2, and access to the Workers Logs of the Cloudflare account.
- **Done when:** The record shows no turn token and no login, and the count is in `plans/follow-ups/request-records-in-logs.md`.
