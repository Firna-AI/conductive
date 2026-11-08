# A throw inside a blocking callback resets the workspace object

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from the focused review of the deploy fixes on the primary branch `calummoore/conductor-alternative-architecture` (decision 141): option D of the check of finding 3.
- **Location:** `nativeWorkspacePlatform` and its `blockConcurrencyWhile`, and `worker/lifecycle/lifecycle-admission.ts`.
- **Reason:** D changes the platform, outside the reviewed commits, and the error handling of every caller of the platform.

- **Terms:**
  - **Workspace object:** the Durable Object that owns the lifecycle and the chat of one workspace.
  - **`blockConcurrencyWhile`:** a Cloudflare call that holds every other request of the object while its callback runs. When the callback throws, Cloudflare resets the object and cancels its alarm.
- **Background:** In the first deploy, a refused first message threw inside that callback. The object reset, the start was lost, and the workspace stayed in Starting. Commit `a5207bc` keeps the error inside the callback of the admission and throws it after the call. `worker/lifecycle/admission-failure-runtime.test.ts` covers that case on the real object.
- **Problem:** The guard lives in the admission, the only caller now, and not in the platform. A later caller that throws inside its callback resets the object again.
- **Impact if no action:** The next caller that can throw inside the callback can lose a start or an alarm in the same way.
- **Root question:** How does no callback of the platform reset the workspace object by mistake?
- **Options:**
  - **D.** Move the guard into the platform: `nativeWorkspacePlatform` runs the callback inside the runtime call, keeps its error, and throws it after the runtime call returns. The admission then needs no guard of its own. Add a Node unit test with a fake object state that records each rejected callback, and write the rule in `worker/lifecycle/README.md`. A caller that needs the reset calls the object state directly. Effort: Small.
- **Left out:** A lint that stops direct calls, because a new lint needs the user's approval. A fake that copies the reset, because Milestone 5f removes the fake.
- **Wider fix:** D.
- **Previous examples:** finding 3 of that review, and the first deploy.
- **Recommendation:** D. It removes the wrong case for every caller of the platform.
- **Action:** fix after merge, apply D.
