# Test an upstream answer that fails in the middle

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-12, from branch `calummoore/untitled-v6`, a new problem of review round 2.
- **Location:** `worker/model-gateway/stream.ts` (the stream that passes an upstream answer to the agent), its tests in `worker/model-gateway/stream.test.ts`.
- **Reason:** the branch does not change the gateway stream, and the egress path now ends a failed answer at its own steps.

- **Terms:**
  - **Model gateway:** the routes of the Worker that add the agent login of a turn to each model request of an agent and forward it.
  - **Egress container:** the Cloudflare container of the Worker `conductive-chatgpt-egress`. It sends the ChatGPT requests of the gateway to OpenAI.
- **Background:** When OpenAI ends an answer early, the egress proxy now ends its connection, and the relay of the egress Worker fails its stream. The gateway stream in `worker/model-gateway/stream.ts` then fails the agent's stream, so the agent program sends the request again.
- **Problem:** No gateway test sends an upstream answer that fails after its first chunk. A change to `stream.ts` that turns that failure into a clean end passes every test.
- **Impact if no action:** A later change can make the agent wait for its own idle timeout after a failed answer, with no failing test.
- **Root question:** How does the gateway prove that a failed upstream answer fails the agent's stream?
- **Options:**
  - **A.** Add one case to the stream tests: an upstream body that errors after its first chunk. The agent's stream must fail with the same error. Effort: Small.
  - **B.** Add the same case at the route level in `worker/model-gateway/route.test.ts`, through the fake upstream server. Effort: Small.
- **Left out:** A third level is not real: the stream and the route are the two entry points that a test can call.
- **Wider fix:** None, because the testing skill already asks for a test of each error path that a caller handles.
- **Previous examples:** None found.
- **Recommendation:** A. It tests the step that owns the behaviour, at the lowest level.
- **Action:** fix after merge, apply A.
