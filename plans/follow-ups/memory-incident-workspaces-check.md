# Check the memory incident workspaces after deploy

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-24, from the post-merge task of the plan `plans/workspace-object-memory.md`, which the pull request of branch `calummoore/object-memory-history-and-files-state-14g5` deletes.
- **Location:** The production Workers Logs and the Durable Object analytics of the workspace Durable Object namespace, and the workspaces of the November 2026 memory incidents.
- **Reason:** The check needs the deployed change and one day of production traffic, and only the operator logs show memory resets.

- **Terms:**
  - **Workspace Durable Object:** the Cloudflare object of one workspace. It has a memory limit of 128 MB. When an isolate passes it, Cloudflare resets the object, and the logs show `exceededMemory`.
  - **Projection:** the last file tree and changes list that the object keeps for the Files API.
- **Background:**
  - In November 2026, production workspace objects went over 128 MB. One cause was a tab that replayed a long history. Another was runner file reports: each file event loaded and saved the whole projection, the history kept every changes list, and each part of a full report re-read all earlier parts.
  - One known case is the workspace "mokly plan reuse editor files" (ID `I9gPRN_CBcK6E3Y4DYBJiJYHCpPqHVqI8hxeH3e5xGM`, Durable Object ID `2f563499f0d934d5bccdb85a38648e32a60e87e9438ebfc278d6d41b309e4cb1`). It reset at 13:19, 13:26, and 13:29 UTC on 18 November 2026 with no tab open. Each runner message took 0.8 to 2.2 s of CPU, and the runner reconnected about every 3 s.
  - The change keeps only the newest changes list in the history, stores file events above 4 KiB as chunks, bounds each history page to lists of four events and 4 MiB, checks report parts once at the last part, and writes the projection in 64 hash buckets. A local harness at 10 times the first incident's repository measured the largest runner message at 40 MB instead of 63 MB, and a small tree delta at 0.5 MB instead of 42 MB.
  - A later change, changes deltas, also keeps the newest changes delta after the newest full changes list in the history, as `docs/protocol/chat-history.md` says. A runner sends deltas only after a welcome accepts them, and a welcome accepts them only while the Worker variable `CHANGES_DELTAS` is `"on"`. An older tab or an older Mac app then gets each delta as the complete changes list.
- **Task:**
  1. After the deploy of the change, wait one day.
  2. In the Workers Logs, search the workspace Durable Object namespace for `exceededMemory` and memory resets during that day.
  3. Check the incident workspaces by ID, and any workspace with a large tree. Note the CPU per runner message and the reconnect rate.
  4. Record each reset with its workspace, time, and the request kinds in the minute before it.
- **Impact if no action:** A remaining memory path in production stays unseen until users report a failing workspace.
- **Needs:** The deployed change, one day of traffic, and read access to the production Cloudflare logs and analytics.
- **Done when:** One day of logs after the deploy shows no memory reset of the incident workspaces, or each reset is recorded with its cause in a new follow-up item.
