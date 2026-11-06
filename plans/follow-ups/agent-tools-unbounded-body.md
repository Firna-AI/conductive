# The agent tools handler reads an unbounded body

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #19, branch `conductor/boat-native-remote-workspaces-milestone-4c`, a problem outside the scope that the check of round 2 finding 3 found.
- **Location:** `worker/tools/handler.ts:77`.
- **Reason:** the handler is not mounted yet, and its code is outside the scope of PR #19.

- **Terms:**
  - **Agent tools:** the MCP server and the CLI in the sandbox that create and list workspaces. They call the Worker on the hostname for machines.
- **Background:** Decision 65 B gives each request body one bounded reader with a 1 MB limit. PR #19 moves the request gate to that reader.
- **Problem:** The agent tools handler reads `request.json()` with no byte limit, and it copies the content type check of `readJsonObject`.
- **Impact if no action:** When a later milestone mounts the handler, sandbox code can send a body of any size to the Worker.
- **Root question:** How does every JSON request body of the Worker stay within one limit?
- **Options:**
  - **A.** Read the body with `readJsonObject`, and delete the copied content type check. Effort: Small.
- **Left out:** A second reader with its own limit, because decision 65 B chose one bounded reader.
- **Wider fix:** None. Decision 65 B and the shared reader are already in force.
- **Previous examples:** Finding 1 of PR #1, the desktop sign-in exchange, which read an unbounded body.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the handler is not mounted yet.
