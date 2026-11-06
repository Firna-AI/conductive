# New handlers keep reading request bodies with no limit

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, the blocked wider fix E of round 1 finding 10. PR #20, branch `conductor/boat-native-remote-workspaces-milestone-11a`, item 4, added option B and two more cases. The user sees it as item 93.
- **Location:** `worker/application.ts`, `worker/http/bounded-body.ts`, and `eslint.config.js`.
- **Reason:** each fix adds a gate or a lint, which is the user's choice.

- **Background:** Decision 65 B gives every request body of the Worker one shared reader with a 1 MB limit. Each handler must call it.
- **Problem:** New handlers still read bodies directly. Five cases so far: the request gate, the webhooks, the Mac sign-in exchange (PR #1, fixed in `91f37ea`), the agent tools handler (`plans/follow-ups/agent-tools-unbounded-body.md`), the git credential route of PR #21, and the preview authorizer of PR #20.
- **Impact if no action:** Each new route can again let a caller send a body of any size, and only a review catches it.
- **Root question:** How does every Worker route read its body within a limit, also a route that someone adds later?
- **Options:**
  - **A.** Change nothing. Each review catches the next case. Effort: Small.
  - **E.** An ESLint rule that refuses `json()`, `text()`, `arrayBuffer()`, `formData()`, and `blob()` on a `request` in `worker/` outside `worker/http/` and the tests. A request with another variable name escapes it. Effort: Small.
  - **B.** A default limit at the Worker entry. Every request body passes through one bounded stream, 1 MB by default. A route that needs more, such as a file upload, declares its own budget there. Effort: Medium.
- **Left out:** A check of `Content-Length` alone, because a streamed body has none. A rate limit, because it does not bound one body.
- **Wider fix:** B. The right default protects every route, also one that forgets the reader.
- **Previous examples:** The five cases above.
- **Recommendation:** B.
- **Action:** ask the user, because B adds a gate at the Worker entry.
