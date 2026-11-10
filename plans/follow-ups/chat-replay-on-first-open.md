# A long workspace replays its whole chat log

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/conductor-import-option`, the options check of the import's decision on how old Conductor sessions show.
- **Location:** `worker/chat/history-pages.ts:84`, `worker/chat/browser-subscription.ts:25`, `src/app/replay-socket.ts:67`, `src/app/workspace-model.ts:119`, `src/files/model/files-store.ts:98`.
- **Reason:** the Conductor import avoided the problem by keeping old sessions out of the chat log, and the general fix changes how every workspace loads.

- **Terms:**
  - **Chat log:** the numbered events that the Durable Object of a workspace stores for all its sessions. The numbers start at 1 and span every session.
  - **Replay:** the stored events that a tab gets when it connects, before the live events. A new tab starts after event 0.
- **Background:** Chat and events requires that a tab that opens gets the stored history first, then the live events. The workspace model, the Files panel, and the chat each follow the event stream of the workspace. The history read of one session, in `worker/chat/history-pages.ts`, lists every stored event of the workspace from the given number, 32 at a time, and keeps only the events of that session. The browser subscription in `worker/chat/browser-subscription.ts` adds the tab and sends its replay inside one task of the workspace's queue.
- **Problem:** The first show of a workspace in a tab reads its whole chat log, whatever the tab needs. A long workspace with many sessions and many turns makes every first show slower, and a long replay holds the workspace's queue while it runs.
- **Impact if no action:** Workspaces open more slowly as their history grows. Other requests of the same workspace, such as the runner's events, wait behind a long replay.
- **Root question:** How does a tab open a workspace with a long history without reading every stored event?
- **Options:**
  - **A.** Keep one log, but let each reader read only its own part. The session read uses an index for each session. The workspace and Files streams replay only their own kinds of events. The Events rules in `docs/protocol/chat-and-events.md` then need a sentence that each reader gets only its part of the stored history. Effort: Large.
  - **B.** Replay only the newest part of each session at first show, and load older turns when the user scrolls up. Effort: Large.
  - **C.** Send the replay in pages that each take their own queue task, so a long replay no longer holds the runner's events. It does not shorten the replay. Effort: Medium.
- **Left out:** A cache of the chat on the device, because Chat and events rejects a disk cache: the chat, with its code and any printed secret, would stay on the device.
- **Wider fix:** A. It removes the cause for every reader, whatever fills the log.
- **Previous examples:** The Conductor import plan kept its old sessions as Markdown documents outside the chat log for this reason, on 10 November 2026.
- **Related:** None.
- **Recommendation:** A, with C as a first step if a long replay already delays runner events.
- **Action:** ask the user, because A changes how the chat history loads for every workspace, and the Events requirements must change with it.
