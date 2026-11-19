# The out-of-order control sends an incomplete history

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-19, from branch `calummoore/follow-up-the-chat-redoes-every-row-at-qjdk`, which fixes the render cost of the chat. Cal asked to find the source of the lost part.
- **Location:** `emitOutOfOrder` at `src/chat/dev/dev-stream.ts:73`, `history` and `emit` at `src/test-support/fake-events.ts:17` and `:36`, and `outOfOrder` at `src/chat/dev/DevControls.tsx:28`.
- **Reason:** The defect is outside the render code of its branch, in the development page, and Cal asked to record it without a fix.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Out-of-order control:** the button "Send parts out of order" of the chat development page, which runs `outOfOrder` in `src/chat/dev/DevControls.tsx:28`.
  - **Fake event store:** `FakeWorkspaceEvents` in `src/test-support/fake-events.ts`, which stores workspace events and sends them live, in place of the Worker.
  - **Reader:** `WorkspaceStream` in `src/chat/stream/workspace-stream.ts`, which applies workspace events in number order and keeps the last applied number as its cursor.
  - **History:** the first message of each new events connection, with the stored events after the cursor.
  - **Cutoff:** `throughEventNumber` of a history, the event number through which the history holds the stored events.
- **Background:**
  - The chat development page under `src/chat/dev/` runs the chat on a fake API, with no Worker. `src/chat/dev/README.md` gives its command.
  - The reader holds a live event that comes after a gap, and opens a new connection at once. The history of that connection then fills the gap.
  - The reader moves its cursor to the cutoff of each history, and drops each live event at or below the cursor. This code is at `src/chat/stream/workspace-stream.ts:147` to `:210`.
  - The reader must trust the cutoff, because a history of the Worker can leave out the number of a replaced event, at `worker/chat/history-compaction.ts:72`.
  - The Worker stores each event before any tab gets it. `ChatStore.change` at `worker/chat/store.ts:266` commits the events in one transaction, then publishes them at line 288.
  - The Worker reads each history from the stored events in number order, at `worker/chat/browser-subscription.ts:27` and `worker/chat/history-pages.ts:127`. So its history holds each event that a tab already got live, unless a later event replaces it.
  - The fake event store stores and sends each event in one step, in `emit` at `src/test-support/fake-events.ts:36`. Its `history` at line 17 takes the number of the last stored event as the cutoff.
- **Problem:**
  - `DevStream.emitOutOfOrder` at `src/chat/dev/dev-stream.ts:73` numbers two parts of one answer N and N+1. It stores and sends event N+1 at once, and event N 1,500 ms later.
  - The new connection of the reader gets a history with event N+1 and the cutoff N+1, but without event N. So the reader drops event N when it comes.
  - After the delay, the fake event store holds event N+1 before event N, so its cutoff falls to N.
  - The Worker does not send such a history. So the reader is right, and the fake event store is wrong.
  - Reproduction in Chrome, at commit `664462e43`:
    1. Serve the page with `npx vite --config src/chat/dev/vite.config.js --port 5181 --strictPort`.
    2. Open `http://127.0.0.1:5181/src/chat/dev/?scenario=history&clock=frozen`.
    3. Press "Send parts out of order".
    4. The answer should read "The parts arrived out of order, and the chat kept their order." It reads only "and the chat kept their order."
  - A one-time probe ran the real reader with manual timers, and both of its cases passed:
    - In the first case, `DevStream` on an empty store sent parts 1 and 2 out of order. The reader delivered [2], and the store then held [2, 1].
    - In the second case, the store already held [1, 2], and the first connection got an empty history, then live event 2. The reader delivered [1, 2], once each.
  - The tests of `src/chat/stream/workspace-stream.test.ts`, `src/shared/transcript/session-log.test.ts`, and `worker/chat/history-pages.test.ts` passed: 3 files, 12 tests.
- **Impact if no action:** The control shows a false loss of a part, so a developer who checks the event order of the chat can blame the reader. The page also cannot show the real recovery from a gap.
- **Root question:** How does the development page send two parts out of order, with a history that the Worker could also send?
- **Options:**
  - **A.** Change only `DevStream`. Store both parts in number order, but hold back the live copy of event N with a filter in `DevStream.subscribe`. Send event N live after 1,500 ms. Add a regression test through the real reader. Risk: the next control that reorders live events needs its own filter. Effort: Small.
  - **B.** Give the fake event store a step that stores an event and a step that sends it live. Keep `emit` as both steps. Make `emitOutOfOrder` store both parts, then send event N+1 at once and event N after 1,500 ms. Add the regression test of A. Risk: it changes a shared test file, but its other callers keep `emit`. Effort: Small.
- **Left out:**
  - Change the reader, so that it waits for each number or applies a late event. It fails the goal, because the history of the fake event store stays wrong. It also breaks rules that stay: a history can leave out replaced events, and no tab shows an event twice.
  - Change nothing, or only document the defect. It fails the goal, because the control keeps losing a part.
  - Remove the control. It fails the goal, because the page then cannot send parts out of order.
  - Keep the history behind the live events, so that the page shows a hold of 1.5 s. It fails the goal, because the Worker never sends a history below an event that a tab already got.
  - Make the fake event store number the events itself. B is better on every point here, because `DevStream` already numbers its events in order.
- **Wider fix:** B. The fake event store then stores and sends in two steps, as the Worker does. A reorder of live events then leaves the stored events in order.
- **Previous examples:** None found.
- **Recommendation:** B. It fixes the control with a small change, and each later control or test gets the order of the Worker: store, then send.
- **Action:** fix after merge, apply B, because the defect is outside the render code of its branch, and Cal asked to record it without a fix.
