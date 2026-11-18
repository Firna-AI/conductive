# Worker filter rewrites all completed-answer contexts

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the finding check on branch `calummoore/follow-up-credential-parts-in-runner-obo9`.
- **Location:** `worker/chat/runner-output.ts`, `filterRunnerOutput` and its `save` closure; `worker/chat/output-filter-records.ts`, `readOutputSnapshot`, `saveOutputSnapshot`, and `retainActiveSecrets`; `src/shared/output-sanitizer.ts`.
- **Reason:** The branch changes known-token filtering in the Rust runner, while this issue belongs to the Worker's separate secret-value filter and stored state.

- **Source:** Review. **Category:** Performance.
- **Terms:**
  - **Worker:** The server that receives runner events and saves chat events for a workspace.
  - **Output filter:** The Worker's exact-copy filter for marked org values and values used by commands with secrets.
  - **Released context:** A shown answer end and its matching secret values, kept to filter later text of the same answer.
- **Background:** The Worker keeps incomplete text by runner stream. It keeps released contexts across streams in one encrypted workspace snapshot. This lets a later event finish a match after an answer or turn ends. The filter hides only exact secret values. It does not use the runner's 21-character fragment rule.
- **Problem:** Each `filterRunnerOutput` call reads the complete released-context snapshot, combines it with stream state, and restores an `OutputSanitizer`. Its `save` closure serializes and encrypts the complete released list again. `retainActiveSecrets` removes values that are no longer active. It keeps a completed answer's context while any matching value stays active. Thus a long-lived org value can keep contexts from many completed answers. Each later runner receipt reads and rewrites that growing list. Its serialized contexts also repeat their matching values.
- **Evidence:** `runner-output.ts` calls `readOutputSnapshot` with a null stream ID for all released contexts. Its `released` helper retains each entry with nonempty contexts. The save closure calls `saveOutputSnapshot` with that complete list and a null stream ID. `output-filter-records.ts` serializes the whole array with `JSON.stringify`. Its active-value filter has no completion or turn-end removal. This evidence comes from a code read. No Worker load measurement or production failure was observed.
- **Impact if no action:** The bytes processed and stored per receipt grow with the number of retained answers and matching values. Long workspace histories can increase filter cost and storage use.
- **Root question:** How can the Worker preserve late-answer filtering without processing all earlier answer contexts for each receipt?
- **Options:**
  - **A.** Store released contexts by answer identity. Read and update only the answer that an event names. Keep a compatible reader and storage path for the previous Worker. Measure the old and new cost with many completed answers and one long-lived active value. Effort: Medium.
  - **B.** Reconstruct the needed shown suffix from durable chat events when late text arrives. Keep only unreleased text as separate filter state. Check that masked text and old events give every suffix that the filter needs. Effort: Large.
- **Left out:** A cache alone still needs a growing durable snapshot and recovery after eviction. Compression alone still reads and rewrites every answer. A cap, expiry, or removal at turn end loses required late-continuation protection. These approaches do not meet the goal, so only A and B remain.
- **Wider fix:** A. Storage keyed by answer removes unrelated historical contexts from the receipt path.
- **Previous examples:** The Rust runner's per-answer token copies exposed the same ownership cost. A synthetic run with 200 tokens and 2,000 answers held 35,577,000 bytes of token content. That count is not a Worker measurement. The Worker has different secret sources, lifetimes, and persistence needs.
- **Recommendation:** A. It preserves the current filtering boundary and makes each receipt use the state of its own answer.
- **Action:** fix after merge, apply A, because the Worker's persistence design is outside the Rust runner fragment fix. Preserve exact matching, failed-transaction recovery, late continuations, and older runner and Worker compatibility. Add no cap, skip, timeout increase, new rejection, or fragment policy.
