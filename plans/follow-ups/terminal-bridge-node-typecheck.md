# The bridge type check also allows Worker globals

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, from the check of finding 16 in review round 1 of the branch `calummoore/porto-6ebg` (the terminal control-mode bridge).
- **Location:** `tsconfig.worker.json`, `tsconfig.worker-tests.json`, `tsconfig.node.json`, `worker/terminal/bridge/`.
- **Reason:** it adds a stricter check, which the always-on rules leave to the user.

- **Terms:**
  - **Terminal bridge:** a TypeScript program in `worker/terminal/bridge/` that the private Node 24 of the cloud computer runs directly.
- **Background:** `tsconfig.worker.json` leaves the bridge out, because it has no Node types. The only check of the bridge is `tsconfig.worker-tests.json`, which has Node types and also loads `.wrangler/worker-configuration.d.ts`, the Cloudflare Worker globals. A check showed that a bridge file with `scheduler.wait()` or `caches.open()` passes it, and Node 24 then throws `ReferenceError`.
- **Problem:** A Worker global in a bridge file passes the type check and fails in the cloud computer.
- **Impact if no action:** The real-tmux tests and the install test would still catch most such code, but only at run time.
- **Root question:** Which type check must the bridge get as a Node 24 program?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Add the bridge files and `src/shared/terminal-bridge.ts` to the `include` of `tsconfig.node.json`, which the typecheck already runs with Node types only. Effort: Small.
  - **C.** Add a bridge tsconfig with Node types only, and run it in the typecheck script. Effort: Small.
- **Left out:** `image/tsconfig.json`, because no script runs it.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. It reuses a check that already runs.
- **Action:** ask the user, because it adds a stricter check.
