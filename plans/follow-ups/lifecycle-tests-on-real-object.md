# The lifecycle tests skip the real workspace object

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, split off from finding 9 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1, option E of its check.
- **Location:** `worker/lifecycle/backend-test-platform.ts`, which 29 lifecycle test files use, and `worker/workspace.ts`.
- **Reason:** the fix reaches 29 test files outside the diff, and it is Large.

- **Terms:**
  - **Workspace object:** the Durable Object that owns one workspace's lifecycle and chat in production.
  - **Miniflare:** the local Cloudflare runtime that runs the real object with its native SQLite storage.
- **Background:** Most lifecycle tests run the controller over a hand-written store, `MemoryWorkspaceStorage`, with a fake clock. A few native tests run the real object in Miniflare. PR #45 adds one native case for the suspension.
- **Problem:** A method that the object only forwards gets no test of its own, because the testing rules give trivial code no test. So a no-op or a wrong forward passes the gate, as `Workspace.suspendLifecycle` did on PR #45.
- **Impact if no action:** The next forwarded lifecycle method can break in production while every test passes.
- **Root question:** How do the lifecycle tests reach the production object, its RPC wrapper, and its native storage?
- **Options:**
  - **D.** Generate the plain forwarders of `Workspace` and `workspaceLifecycleEndpoint` from one typed list, so that no forwarder can be a no-op or call the wrong method. TypeScript needs casts, and a method that does more than forward stays outside the list. Effort: Medium.
  - **E.** Run the lifecycle test fixture on the real object in Miniflare, through `workspaceLifecycleEndpoint`, and remove the hand-written store. It needs a clock seam inside the object, native forms of the fixture's restart, hold, and alarm helpers, changes to 29 test files, and a slower gate. Effort: Large.
    - Step: make the native form of the alarm helper reuse the shared scheduled-alarm advance helper of the `MemoryWorkspaceStorage` fixture. Use the shared helper also in `tick` and `becomeIdle` of `WorkspaceRuntimeFixture`, in `worker/lifecycle/workspace-runtime-test-worker.ts`. That helper sets the time, runs only due alarms in time order, and deletes each alarm before its handler. So both fixtures keep one alarm rule.
- **Left out:** A Node stub of the Workers runtime that builds the real class over a fake state, because it replaces one hand-written store with another.
- **Wider fix:** E.
- **Previous examples:** the deleted follow-up `lifecycle-race-tests-storage`, whose fix `4e9c731` kept the fake store, finding 9 of PR #45, and finding 3 of PR #47. PR #47 (Milestone 5c) added five restart test files and one support file on the fake store, with a second store at `worker/lifecycle/retry-test-support.ts:53`. A move to the real object also needs a harness for the image coordinator and a clock seam for the timed retry tests. Finding 3 of the focused review of the deploy fixes on the primary branch, on 8 November 2026: the fake store's `blockConcurrencyWhile` only calls its callback, so a throw inside it, which resets the real object, passed every lifecycle test. `worker/lifecycle/admission-failure-runtime.test.ts` now covers that one case on the real object. Include admission faults when E moves the fixture.
- **Recommendation:** E. It keeps every lifecycle test on the real object, whatever shape the next defect takes.
- **Action:** fix after merge, apply E, because it reaches 29 test files outside the diff of PR #45.
