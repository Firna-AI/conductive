# New handlers keep reading request bodies with no limit

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, the blocked wider fix E of round 1 finding 10. The user sees it as item 93.
- **Location:** `eslint.config.js`.
- **Reason:** the fix adds a lint, and a new lint is the user's choice.

- **Background:** Decision 65 B gives every request body of the Worker one bounded reader, `readBoundedBody` in `worker/http/bounded-body.ts`, with a 1 MB limit.
- **Problem:** New handlers still call `request.json()` directly. Three cases so far: the desktop sign-in exchange (PR #1, finding 1, fixed in `91f37ea`), the agent tools handler (`plans/follow-ups/agent-tools-unbounded-body.md`), and the git credential route of PR #21 (finding 10).
- **Impact if no action:** Each new route can again let a caller send a body of any size.
- **Root question:** How does every new Worker handler read its body within the limit?
- **Options:**
  - **A.** Change nothing. Each review catches the next case. Effort: Small.
  - **E.** An ESLint rule that refuses `json()`, `text()`, `arrayBuffer()`, `formData()`, and `blob()` on a `request` in `worker/` outside `worker/http/` and the tests. It matches the variable name, so a request with another name escapes it. Effort: Small.
- **Left out:** A machine-host gate that reads every body, because it covers one hostname only, and PR #21 finding 10 removes its body.
- **Wider fix:** E.
- **Previous examples:** PR #1 finding 1, the agent tools handler, and PR #21 finding 10.
- **Recommendation:** E.
- **Action:** ask the user, because E adds a lint.
