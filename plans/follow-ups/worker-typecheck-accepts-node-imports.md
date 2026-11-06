# Worker typecheck accepts Node-only imports

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #2, branch `conductor/boat-native-remote-workspaces-milestone-15`, finding 4, wider fix G.
- **Location:** `tsconfig.worker.json:7`.
- **Reason:** each fix adds a new typecheck or lint error, which only the user can approve.

- **Terms:**
  - **Worker typecheck:** the TypeScript project in `tsconfig.worker.json`, which `npm run typecheck` checks.
- **Background:**
  - The Worker runs on Cloudflare, with no Node file system.
  - The Worker project also includes the tests. The test harness brings Node types through Miniflare.
  - So the typecheck accepts a Node-only import, such as `node:fs`, in production Worker code.
  - PR #2 had such a loader. The Vite build rejects an unresolved `node:` import only when production code imports the module.
- **Problem:** A Node-only import in Worker code passes the typecheck. It fails only when production code first imports it, at build time.
- **Impact if no action:** A module that production code does not import yet can hide a Node-only import until a later wiring change. The build then fails at that later change.
- **Root question:** How does the typecheck reject Node-only code in the production Worker?
- **Options:**
  - **A.** Change nothing. The build catches the import when production code first uses the module. Effort: Small.
  - **B.** Add a lint rule that forbids `node:` imports under `worker/`, except in tests and test support. This adds a new lint error. Effort: Small.
  - **C.** Split `tsconfig.worker.json` into a production project without Node types and a test project with them. The typecheck then rejects each Node-only import or Node global in Worker code. This adds a new typecheck error. Effort: Small.
- **Left out:** a test that imports each Worker module in workerd, because the gate runs the Worker tests in Node, and a new runtime harness costs more than C.
- **Wider fix:** C. It catches every Node-only module and global, not only `node:` imports.
- **Previous examples:** the source loader of PR #2, `tools/image-assets.ts`, which its fix removed.
- **Recommendation:** C. The types then match the runtime, with no list of forbidden imports to keep.
- **Action:** ask the user, because each fix adds a new typecheck or lint error.
