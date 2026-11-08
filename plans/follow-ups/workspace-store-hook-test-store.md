# The shared store hook is tested with a hand-written store

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, a problem outside the scope of round 1 of PR #51, branch `conductor/boat-native-remote-workspaces-milestone-13b`.
- **Location:** `src/app/workspace-store.test.tsx:17`.

- **Terms:**
  - **Shared store hook:** `useWorkspaceStore`, which creates one store for each workspace view, connects it after the render, and cleans it up.
  - **TestStore:** a hand-written store class in the hook's test file.
- **Background:** Milestone 13a added the hook, and Milestone 13b moved the terminal and preview tools and the workspace view onto it. The hook's own tests drive a `TestStore` that the test file defines.
- **Problem:** The tests prove the hook with a store that no product code uses, so a hook defect that shows only with a real store, such as an order of connect and cleanup that a real store needs, can pass.
- **Impact if no action:** A regression of the hook can pass the gate and break the tools or the workspace view.
- **Root question:** How do the hook's tests prove its lifecycle with the stores that the product uses?
- **Options:**
  - **A.** Add cases that drive the hook with a real product store, such as the terminal store, over its fake transport, and keep the current cases for the hook's own rules. Effort: Small.
  - **B.** Replace `TestStore` with the real stores in every case. Effort: Medium.
- **Left out:** More assertions on `TestStore`, because they keep the same gap.
- **Wider fix:** A. One real-store case covers the class.
- **Previous examples:** `plans/follow-ups/chat-tests-on-real-object.md` and `plans/follow-ups/lifecycle-tests-on-real-object.md` record the same class for the chat and lifecycle tests.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the test file is outside the diff of PR #51.
