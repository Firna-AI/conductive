# The chat history read loads every event at once

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #6, branch `conductor/boat-native-remote-workspaces-milestone-7`, a new problem of the round 2 check of finding 3.
- **Location:** `worker/chat/store.ts:120`.
- **Reason:** it needs a long-used workspace with many large events, and the last fix round of PR #6 had already started.

- **Terms:**
  - **Isolate:** one running copy of the Worker on Cloudflare, with 128 MB of memory.
- **Background:** When a tab opens, the workspace reads every stored chat event after the tab's last event number, for the events socket and the session history. Each runner connection adds a full file tree event.
- **Problem:** The read holds all these events in memory at once.
- **Impact if no action:** A tab that opens on a long-used workspace can make the read pass the memory of the isolate, and the request fails.
- **Root question:** How does a tab get a long history without the workspace holding it all in memory?
- **Options:**
  - **A.** Read and send the history in pages of a fixed size. Effort: Medium.
  - **B.** Keep only the newest file tree event in the history, because each new tree replaces the old one. Effort: Medium.
  - **C.** A and B. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** None found.
- **Related:** decision 76 E of the plan, which Milestones 4d and 7s apply. Decision 87 B, a cache of the chat in the memory of a tab, assumes these pages.
- **Recommendation:** C.
- **Design call:** Added on 6 November 2026, when the user asked whether the chat is cached. A page sends each finished answer as its `assistant.completed` event, without its `assistant.delta` text pieces. It sends each finished tool step as its last `tool.updated` state. Reason: these events already hold the whole content, so a page gets smaller and loses nothing. The pages then skip event numbers. So `ChatHistoryResponse` must say that it holds the state through `throughEventNumber`, not each event.
- **Action:** fix after merge, apply C, because it needs a long-used workspace.
