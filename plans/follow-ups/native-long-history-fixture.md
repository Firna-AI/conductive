# Long history tests need one native fixture

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, wider fix split from finding 4 of the review of branch `calummoore/object-memory-history-and-files-state-14g5`. Extended on 2026-11-24 by finding 3 of the review of branch `calummoore/object-memory-new-tab-state-reads-cesn`, which found the read-state recovery tests on the hand-written map.
- **Location:** `worker/chat/history-memory.test-support.ts`, `worker/chat/native-store.test-support.ts`, and the tests that seed long histories: `worker/chat/events.test.ts`, `worker/chat/workspace-summary.test.ts`, `worker/chat/history-publication-pages.test.ts`, `worker/chat/browser-subscription.test.ts`, `worker/chat/history-forward-limits.test.ts`, and the read-state recovery tests `worker/chat/workspace-read-recovery.test.ts`.
- **Reason:** The shared fixture reaches tests outside the history page change that found the problem.

**Terms**
- **Native storage:** the SQLite storage of the production workspace Durable Object, which the chat tests run through `nativeChatStore`.
- **Forward page:** one page of stored chat history in event order. Since 24 November 2026 a page ends at 4 MiB of shown events, the connection budget, or 2,048 stored steps.

**Background:** Forward pages became much larger on 24 November 2026, so a test that checks a page break now seeds thousands of events. Each test builds its own seeding. One test used a hand-written in-memory store until the review moved it back to native storage. The user chose on an earlier date to run chat tests on the real object, not on a hand-written store.

**Problem:** Each long-history test supplies its own seeding, and a new test can again reach for a hand-written store.

**Impact if no action:** Long-history tests stay slow to write, and one of them can again test a store that production does not use.

**Root question:** How do long-history tests seed and read many events on native storage with one shared setup?

**Options:**
- **A.** Add one fixture in the native test object that seeds many stored events in batches, with the index state that production writes, and move the long-history tests to it. Effort: Medium.
- **A with C.** Also make `historyMemory()` in `worker/chat/history-memory.test-support.ts` return `ChatData` without `transaction`. Its other callers need only `ChatData`, so no test can then build a `ChatStore` on the hand-written map. The fixture must seed both stored layouts of file events: the descriptor with chunks, and the inline event that the Worker before PR #675 stored up to 1 MiB. Effort: Medium.
- **B.** Give the forward read a `limits` input, as the newest-first read already has, so tests can force page breaks with small fixtures. It adds a product input that production never sets. Effort: Medium.

**Left out:** A lint against hand-written stores: a new check needs the user.

**Wider fix:** A with C.

**Recommendation:** A with C.

**Action:** fix after merge.
