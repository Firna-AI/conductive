# The chat tests skip the real workspace object

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, the wider fix of finding 3 of PR #48 (Milestone 7v, option C of its check), with finding 1 of PR #49 (Milestone 8n), which its check moved outside the scope, and option C of finding 7 of PR #46 (Milestone 7w).
- **Location:** `createChatFixture` and `MemoryChatStorage` in `worker/chat/harness.test-support.ts` and `worker/chat/memory-storage.test-support.ts`, which about 30 chat test files use.
- **Reason:** the fix reaches the shared chat fixture and many test files outside the diffs that found it.

- **Terms:**
  - **Workspace object:** the Durable Object that owns one workspace's chat in production, with native SQLite storage.
  - **MemoryChatStorage:** the hand-written store that the chat test fixture uses. Its restart helper builds a new chat over the same map.
- **Background:** Most chat tests run on `MemoryChatStorage` with a simulated restart. A few native tests run the real object in Miniflare with a real eviction. `plans/follow-ups/lifecycle-tests-on-real-object.md` records the same class for the lifecycle tests.
- **Problem:** A test that claims persistence, replay, or a restart can pass on the hand-written store while the real storage or the rebuild of the object loses the data.
- **Impact if no action:** A chat defect that only native storage shows can pass the gate, for example a lost queue, a lost mark, or a split commit.
- **Root question:** How do the chat tests prove persistence through the real object and its storage?
- **Options:**
  - **B.** Extract one shared native event fixture from the existing durable chat tests, and move each test that claims persistence or a restart onto it. Effort: Medium.
  - **C.** Make the shared chat fixture run the production object in Miniflare by default, with real eviction for each restart, and keep its fault controls and every assertion. Effort: Large.
- **Left out:** Another hand-written store, because it keeps the same weakness.
- **Wider fix:** C. Every chat test then uses production storage by default.
- **Previous examples:** finding 7 of PR #46, finding 3 of PR #48, finding 1 of PR #49, `plans/follow-ups/agent-event-rollback-test.md`, and `plans/follow-ups/lifecycle-tests-on-real-object.md`.
- **Recommendation:** C, together with the lifecycle item, so that one native harness serves both.
- **Action:** fix after merge, apply C, because it reaches the shared fixture and many test files outside the diffs that found it.
