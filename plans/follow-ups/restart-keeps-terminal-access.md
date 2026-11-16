# Terminals disconnect during Restart

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-16, from branch `calummoore/clickable-dropdown-restart-server-6gn7`, review item 2.
- **Location:** `worker/lifecycle/durable-restart.ts`, `worker/data/sandbox-access.ts:12`, `worker/security/connection-access.ts:55`.
- **Reason:** The fix changes a stated requirement or stored data, so it waits for the user's choice.

- **Terms:**
  - **Restart:** the item of the header state menu. It restarts the agent runner and the preview relay of a running cloud computer.
  - **Sandbox access predicate:** the SQL rule `sandboxAccessPredicate` in `worker/data/sandbox-access.ts`. Terminal, preview, and activity requests reach a sandbox only while the row state is ready, working, unread, or input.
- **Background:** Restart sets the workspace state to `starting` from the press until the new runner is ready. That takes up to 60 seconds of update check plus the restart. The Worker checks each open terminal connection again every 15 seconds against the sandbox access predicate.
- **Problem:** The predicate does not accept `starting`. So a check during a restart closes each open terminal connection, and Reconnect is refused until the runner is ready. The shells in tmux keep running. The spec (`docs/protocol/workspace-life.md`, Restart the software) and the guide (`src/marketing/docs/workspaces.md`) say that terminals keep running.
- **Impact if no action:** Many restarts cut the member's terminal tabs. The text of the spec and the guide is wrong about the tab.
- **Root question:** How do open terminals stay connected while only the runner restarts?
- **Options:**
  - **A.** Keep the code. Change the spec and the guide to say that the terminal tab disconnects during Restart and offers Reconnect. Effort: Small.
  - **B.** The terminal tab reconnects by itself when its connection ends while the workspace shows Starting, as soon as the state runs again. Effort: Medium.
  - **C.** Store the restart in the `workspaces` row, with a new column and a migration. The access predicate accepts `starting` while that column is set. Terminals, previews, and activity keep their access. Effort: Medium.
  - **D.** Keep the stored state running and show Starting only in the published workspace. Turn dispatch refuses while a restart runs. This changes the generated `Workspace` type. Effort: Large.
- **Left out:** Run the update check before Starting begins. The window gets shorter, but a check can still cut the terminals.
- **Wider fix:** C. One shared rule for "the cloud computer runs" replaces the duplicated state lists.
- **Previous examples:** The running-state list repeats in `worker/data/sandbox-access.ts:12`, `worker/terminal/handler.ts:67`, `worker/chat/workspace-integration.ts:154`, `worker/lifecycle/runner-lifecycle.ts:56`, and `worker/data/user-access.ts:111`.
- **Recommendation:** C. It keeps the requirement as written and removes the duplicated lists that caused the gap.
- **Action:** ask the user, because A changes a stated requirement, and B, C, and D trade a client workaround against a migration or a wire type change.
