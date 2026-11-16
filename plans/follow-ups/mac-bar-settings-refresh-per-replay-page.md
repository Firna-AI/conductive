# The Mac bar refreshes its settings once for each replay page

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the finding check of review round 1 of branch `calummoore/changing-frequently-j5m8`.
- **Location:** `src/shell/workspace/WorkspaceMacBar.tsx:14`.
- **Reason:** the problem is outside the diff of that branch, and `main` behaves the same.

- **Terms:**
  - **Workspace stream:** `WorkspaceStream` in `src/app/events.ts`. It gives the screens of one workspace its events in order. When it opens, the Worker first replays the stored history.
  - **Replay page:** the Worker sends the stored history in pages of at most 32 stored events, each in its own socket message.
  - **Mac bar:** the bar of the Mac app on the workspace screen. It reads the Mac settings of the member.
- **Background:** The Mac bar subscribes to the workspace stream. For each `workspace.updated` event, it queues one refresh of the Mac settings in a microtask, so the events of one page share one refresh.
- **Problem:** The comment says that the history of the stream comes in one burst, so one read follows it. But each replay page arrives in its own socket message, so each page that holds a `workspace.updated` event queues its own refresh. Each refresh makes API reads.
- **Impact if no action:** While a long workspace loads in the Mac app, the bar can make several extra settings reads. The result stays correct.
- **Root question:** How does the Mac bar read its settings once after the stored history, and once for each later change?
- **Options:**
  - **A.** Fix the comment only, and keep the reads. Effort: Small.
  - **B.** Skip replayed `workspace.updated` events, and refresh once in the `replayEnded` callback of `WorkspaceStream.subscribe` when the replay held one. Keep the live path. Effort: Small.
  - **C.** Add a test that counts the settings reads of a replay in several pages, with B. Effort: Small.
- **Left out:**
  - A wait timer before the refresh: it adds a delay and depends on timing.
- **Wider fix:** None. Since branch `calummoore/changing-frequently-j5m8`, `WorkspaceStream.subscribe` tells a replayed event from a live one, and `replayEnded` marks the end of each replay. A part that needs only the newest state of a replay can use them.
- **Previous examples:** The same branch fixed the GitHub adapter in `src/shell/workspace/github/github-events.ts`, which showed each replayed GitHub state.
- **Related:** None.
- **Recommendation:** C. It removes the extra reads, and the test keeps them out.
- **Action:** fix after merge, apply C, because the problem is outside the scope of the branch that found it.
