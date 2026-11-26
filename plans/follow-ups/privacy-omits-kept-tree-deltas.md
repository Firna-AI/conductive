# Privacy page omits the kept file tree changes

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-history-and-files-state-14g5` (Milestone 1 docs check).
- **Location:** `src/marketing/privacy-uses.ts:170-172`
- **Reason:** The gap is older than the history retention change, and a change to a legal page needs its own review by Cal.

**Terms**
- **Tree delta:** a `files.changed` event, one change set to the stored file tree of a workspace.
- **Stored chat history:** the events that the workspace Durable Object keeps, so that the chat survives a stop of the sandbox.

**Background:** The Privacy page says that Conductive "keeps the last file list and the last summary of changes of each workspace". `docs/protocol/chat-history.md` says that the stored history keeps each tree delta, the newest full tree, and the newest changes list. Tree deltas were kept before 23 November 2026 too. Cal checked on 23 November 2026 that the sentence agrees with the retention change.

**Problem:** The sentence does not say that each change to the file list is also kept in the stored chat history.

**Impact if no action:** A reader of the Privacy page can think that only the last file list is kept, while the history also keeps each recorded change to it.

**Root question:** Should the Privacy page say that the chat history keeps each change to the file list?

**Options:**
- **A.** Keep the sentence. It describes the projection, not the history. Effort: Small.
- **B.** Change it to "It keeps the last file list, each change to that list, and the last summary of changes of each workspace." Update the effective date as the Privacy notice says in [Changes to this notice](../../src/marketing/privacy.ts#L263). Effort: Small.

**Left out:** A full rewrite of the data section. The rest of the section is accurate.

**Wider fix:** None. `AGENTS.md` already requires a full read of the legal pages for each protocol change.

**Recommendation:** B. It states the kept data exactly.

**Action:** ask the user, because a legal page change needs Cal's review.
