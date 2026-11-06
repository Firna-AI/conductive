# Connected views each write their own store hook

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #10, branch `conductor/boat-native-remote-workspaces-milestone-14`, finding 1, wider fix E.
- **Location:** `src/github/useGitHubState.ts`, and each later hook that connects a view to a workspace store.
- **Reason:** today the GitHub views are the only views that connect to a workspace store, so one shared hook pays off only when a second connected view merges.

- **Terms:**
  - **Workspace store:** a class in the web app that combines API replies with the live events of one workspace, such as `GitHubStore`.
  - **Connected view:** a screen part that shows the state of a workspace store and updates with its events.
- **Background:** `useGitHubState` creates one `GitHubStore` for each workspace, connects it to the workspace events, and subscribes the views. Finding 1 of PR #10 found that no test mounted this hook, so a missing first read or an old store after a workspace switch could pass the gate. The fix moved the first read into the store and added a mounted test for this hook. Other milestones, such as the chat, files, and tools screens, can add their own stores and hooks.
- **Problem:** Each connected view writes its own hook, with its own effect, its own first read, and its own switch logic. Each copy can repeat the defects of finding 1.
- **Impact if no action:** A later view can stay on loading or show the previous workspace's state, and only its own test can catch it.
- **Root question:** How does every connected view get its workspace store, its first read, and a new store after a switch, without its own effect code?
- **Options:**
  - **A.** Keep one hook for each view, each with its own mounted test. Effort: Small for each view.
  - **B.** Add one shared hook that takes a store factory and the workspace. It creates the store, connects it, and replaces it on a switch. Each view uses it. One mounted test covers the shared hook. Effort: Medium.
  - **C.** Add a shared test that mounts every connected view and checks its first read. It detects the defect but does not remove it, and it needs the user's approval as a test for the class. Effort: Medium.
- **Left out:** a lint rule, because no rule can show that an effect starts a read.
- **Wider fix:** B.
- **Previous examples:** finding 1 of PR #10.
- **Recommendation:** B, once a second connected view merges.
- **Action:** fix after merge, apply B, because it pays off only when a second connected view exists.
