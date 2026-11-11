# Session history reads scan unrelated events

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from branch `calummoore/chat-loading-issue`, item 1, option B: the wider fix that the agent split off.
- **Location:** `HistoryPages.read` and `HistoryPages.prepare` in `worker/chat/history-pages.ts`, and `ChatTransaction.emit` in `worker/chat/store.ts`.
- **Reason:** On 11 November 2026, the user chose larger session pages as a quick fix for now, and this index is the lasting fix that can follow it.

- **Terms:**
  - **Workspace event:** one stored record of a workspace, such as a message, a tool update, a piece of streamed text, a file report, or a start step.
  - **History request:** the browser request for the stored events of one session, at `chatHistoryPath` of `src/shared/events.ts`. `src/chat/state/history.ts` sends one request after another until a reply has no `nextAfterEventNumber`.
  - **Chat queue:** `ChatStore.run` in `worker/chat/store.ts`, the one serial queue of the workspace's Durable Object. Each browser request and each lifecycle step runs in it, one at a time.
- **Background:**
  - The Durable Object of a workspace stores every workspace event in one numbered list, under the `chat:v1:event:` key prefix.
  - A history request for one session lists these events in order. It keeps only the events of that session.
  - Before 11 November 2026, one request read only 32 stored events. A workspace with 10,000 events then needed 313 requests in a row before the messages of the session showed.
  - Since then, one request of the browser reads on until it has read 2,048 stored events, or its session events reach 4 MiB of JSON. The readers inside the Durable Object, such as the transcript copy, still read pages of 32 stored events.
  - The agent runner stores a piece of streamed text every 40 ms while the agent writes. It also stores a full list of the changed files each time that the list changes.
- **Problem:** Each session read still lists and parses every stored event of the workspace. These include the events of other sessions, the pieces of streamed text, and the full file reports. So the cost of a session load grows with the whole workspace history, not with the session.
- **Impact if no action:** A long workspace still needs one history request for each 2,048 stored events. Each of these requests holds the chat queue while it parses unrelated events. An in-memory run took 110 to 140 ms for one page of 2,048 events, with change reports of 904 files.
- **Root question:** How does a session read touch only the stored events of that session?
- **Options:**
  - **A.** Keep the larger pages, and change nothing. Effort: Small.
  - **B.** Keep an index of the event numbers of each session, under its own key prefix. Write each index entry in the same transaction as its event, in `ChatTransaction.emit`. Read the index of the session, then load its events in batches. Build the index of an old workspace once, at its first read, as `HistoryPages.prepare` builds the replacement index today. Effort: Medium.
  - **C.** Store the file reports under their own key prefix, so that a session read never lists them. A page of the whole workspace then joins the two prefixes in event order. The events of other sessions stay in the scan. Effort: Medium.
- **Left out:** Delete the old pieces of streamed text from storage. It cuts the number of events, but a session read still lists the other sessions and the file reports.
- **Wider fix:** B. With B, no session read lists the events of other sessions or the file reports.
- **Previous examples:** commit `94f57812`, "perf(previews): check preview bodies in larger reads (#210)".
- **Recommendation:** B. It makes the cost of a session read follow the size of the session, and it keeps the one numbered list.
- **Action:** fix after merge, apply B, because the larger pages already remove most of the delay, and the index needs new stored data and a one-time build that deserve their own branch.
