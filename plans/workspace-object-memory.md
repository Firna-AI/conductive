# Workspace object memory

Status: Active. On branch `calummoore/object-memory-history-and-files-state-14g5`, no pull request yet. Cal approved the implementation on 23 November 2026. The reader release of Milestone 2 runs on its own branch, `calummoore/memory-projection-reader-release-jrq9`, with its own pull request into `main`. The pull request that completes the work deletes this plan, as the `plans` skill says.

The workspace Durable Object has 128 MB of memory. Production workspaces
went over that limit when a tab replayed a long history and when the
runner sent large file reports. This change lowers the memory and the CPU
of four Worker paths: the stored chat history, the history pages, the file
projection, and the join of runner report parts. It changes no UI, mockup,
runner, generated type, route, or app code, and it adds no wire field.

Two adjacent modules also need changes: `worker/chat/files-storage.ts` for
the transaction adapter, and `worker/chat/history-session-records.ts` for
the indexed history reads that PR #572 added. These extend Cal's named
Worker file list. The approved plan includes them.
Small private helpers may split the page logic to meet the 300-line limit.

The projection is the last complete file tree and changes list that the
object keeps in storage. The object serves them while the sandbox sleeps.
Today the object loads and saves both lists whole for each file event. The
history stores each event as one storage value, or as chunks above 1 MiB.
A forward history page reads one storage list of 32 events.

Decision 1 below chose option C. So the work ships in two pull requests. A
small reader release merges first. The pull request of this branch merges
after that release has been live for at least one hour.

Other plans:

- The runner file report limits plan starts its Worker work after this
  change's final writer pull request merges, not after the reader release.
  It changes the summary checks of `runner-reports.ts` and
  the scalar fields of the projection. This plan keeps room for its
  optional counts, as design calls 9 and 16 say. It adds no wire field.
- Item 4 B of the new tab workspace state reads plan reads the projection
  and the event number in a chat queue task. This plan keeps a projection
  read over a supplied `FilesStorage` that uses only `get` and `getMany`.
  That read adds no queue task and opens no second transaction.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#events).
- [Chat history](../docs/protocol/chat-history.md), split from Chat and
  events by Milestone 1.
- [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes).
- [Lost workspace updates](../docs/protocol/lost-workspace-updates.md).
- The [chat backend README](../worker/chat/README.md) and
  [History and event order](../worker/chat/history.md).
- The [files README](../worker/files/README.md).

## Recorded user decisions

Cal chose these options on 20 November 2026, from measurements of a
separate harness. The figures and the full option texts are in
`.context/workspace-object-memory/prompts/plan-draft.md`. Do not reopen a
choice without a new fact that changes its feasibility or its cost.

PR #572 merged while this plan was under review. It indexes history by
session. Warm session reads now load no file report or other-session event.
The recorded session timings and list counts predate that index. Milestone
7 compares this work with the new baseline. Cal's M2 C choice still applies
to workspace reads, indexed session reads, and legacy preparation.

- M1, history retention: A. The history keeps only the newest
  `changes.updated` event. It uses the mechanism that keeps only the newest
  `files.snapshot`. It keeps every tree delta. It resets no history index
  watermark, and it changes no older history.
  - Reason: it removed most of the stored history, the replay time, and the
    replay memory, for two more storage rows for each changes list.
  - Rejected B, delete the deltas before the newest tree: Medium effort and
    an extra delta index.
  - Rejected C, leave file reports out of the history: Large effort, and
    older apps need another path.
- M2, history pages: C, both A and B.
  - A: a forward page ends after 4 MiB of shown events. Both history
    readers list at most four stored events at a time, in place of 32. This
    covers the replay, the workspace summary, Continue, and the transcript
    copy.
  - B: a file event above 4 KiB is stored as the existing stub and chunks,
    in place of above 1 MiB. The previous Worker already reads that shape.
  - Reason: A bounds the largest page and the replay memory. B lets a
    session page skip file reports without a load of their payload.
  - Rejected D, one stored event for each replay message: it bounds only
    the replay, and it changes the wire.
- M3, projection memory: G, both D and F.
  - D: the tree and the changes list each split into 64 groups by a hash of
    each path. This plan calls such a group a bucket. A write changes only
    the buckets that change. A folder remove reads the buckets one at a
    time, because the entries inside a folder can be in any bucket.
  - F: `ChatTransaction.emit` does not copy a file event with
    `structuredClone`. It serializes the event once for the byte check and
    the chunks. The event must stay unchanged until its publication to the
    open tabs.
  - Reason: D made a small delta use a small part of the memory of a
    whole-list write. F lowered the memory of a history save, with the same
    stored history. No run measured G as a whole.
  - Rejected A, larger chunks only. Rejected B, load and write only the
    changed list. Rejected C, both A and B. A to C still load a whole list
    for a small delta. Rejected E, one storage row for
    each path: too many rows for changes lists and for a new stream.
- M5, part checks: B. `RunnerFileReports.accept` checks the fields of each
  part when the part arrives. It checks path uniqueness at the last part.
  Today it loads and parses each earlier part, and joins them, for each
  part. A repeated path then refuses the last part. The atomic publication
  of a complete report stays. The cleanup after a replacement or a refusal
  stays. The restart and resend behavior stays.
  - Reason: the repeated join cost seconds of CPU for a large tree.
  - Rejected A, a hash of each path in the assembly state. Rejected C, no
    change.

### Plan approval of 23 November 2026

- Cal approved the implementation of this plan on 23 November 2026 with
  the message "Ok progress those plans and merge when go is green". The
  approval includes the two adjacent files that this plan names:
  `worker/chat/files-storage.ts` and `worker/chat/history-session-records.ts`.
- The orchestrator applies the plan's recommendations under that approval:
  1 C and 2 A. Cal did not type these option letters himself. The decisions
  below record each outcome.
- Cal also wrote: "don't need to run the full gate locally, we can just push
  and use ci to test". So the agents run targeted tests, the typecheck, the
  lint, and the format check locally. CI runs the complete gate on each pull
  request.
- Cal authorized the root coordinator, session
  `hAtm84N9KBtseruCOEzvhBKGlQssEl7FfKcvM0eacqA` of workspace
  `YxnjrS0efLxT8zULMxN_arL_4KEvcAWCHA_KuRGKLd0`, to merge each pull request
  of this work into `main` after its checks are green. This authorization
  replaces `Agent merges: off` for this work. The orchestrator of this plan
  and its child agents do not merge a pull request into `main`.
- The reader release starts at once, beside Milestone 1, at Cal's request.
  It changes no requirement, so it needs no text of Milestone 1.

## Design calls

These are my calls, made on 20 November 2026 under the existing
requirements.

History:

1. The newest changes list gets its own history index key, beside the key
   of the newest tree. It uses the same rule: the index of a newer list
   deletes the older list and its chunks. The first list after the deploy
   deletes nothing, because the key is new. During a rollback, the previous
   Worker keeps each changes list, so a few lists of that time can stay.
   Record the stored workspace tip when the new rule first runs. Index
   preparation must skip replacement of changes lists at or before that
   tip, including histories without an index watermark.
   Reason: the cutover preserves older lists without a sweep.
2. The 4 KiB limit measures the UTF-8 JSON bytes of the whole envelope, as
   the 1 MiB limit does today. The stub and its chunks keep their shape:
   chunks of at most 65,536 characters of the event JSON. Reason: the
   previous Worker reads that shape.
3. `emit` takes each file event without a copy and deep-freezes it. A later
   write to the event then throws. It cannot change what storage and the
   tabs get. Other event types keep `structuredClone`. Reason: the one
   production caller does not change the event after `emit`, and the freeze
   makes that rule hold for each later caller. The freeze walks the event
   once and allocates no copy.
4. `emit` serializes a file event once. The byte check adds the envelope
   bytes to the bytes of that text. It gets the envelope bytes from a
   serialization of the envelope with a placeholder event. The chunks use
   the same text. Reason: the stored chunks encode only the event.
5. A forward page lists at most four stored events at a time. It ends at the
   first of these limits:
   - the cutoff of the read,
   - 4 MiB of shown events on this page,
   - the connection budget that PR #477 adds,
   - 2,048 stored steps.

   The page count starts at zero for each page. The connection budget goes
   down by the same count, and no page resets it. The page includes the
   event that reaches a limit. A page can exceed the byte limit by that
   event. A larger first event still advances the cursor.
   Reason: the step limit keeps a filtered
   read short in the serial queue, as the newest-first page does.
6. A shown event that was stored as chunks counts the bytes of its stored
   text and its envelope. The page does not serialize it again. Reason: a
   large file report would otherwise make a second copy during a replay.
7. `prepare` also lists at most four stored events at a time. Reason: its
   scan of an older history loads each event. The session-index preparation
   uses the same cap through `prepareSessionBatch`. Keep its atomic batch
   commits and its queue yield between batches.

Projection, under option C of decision 1:

8. The bucket layout keeps `files:state:v1` as the one manifest.
   - A layout marker in the manifest says that the lists are in bucket
     keys. Then both old chunk counts are zero, and no old chunk key stays.
   - Each list has 64 buckets. A fixed 32-bit FNV-1a hash of the path
     chooses the bucket. The manifest names the hash and the bucket count.
   - Each bucket stores its items in list order, as JSON in chunks of at
     most 65,536 characters.
   - An order text holds one bucket symbol for each item, in list order. It
     uses chunks of the same size.
   - The manifest holds the scalar fields of each list. For each bucket, it
     holds the item count, the chunk count, and a SHA-256 digest.

   Reason: one manifest keeps the connection fields in one place. The order
   text keeps the list order that the reload tests and the Changes panel
   need. The digests let a full report skip the buckets that did not change.

   The exact contract, settled on 23 November 2026 before the reader work
   started. The reader defines it, and the writer imports it unchanged:
   - Manifest fields of the bucket layout: `layout: 'buckets'`,
     `hash: 'fnv1a32'`, `bucketCount: 64`, `treeChunks: 0`,
     `changesChunks: 0`, and `tree` and `changes`, each `null` or a list
     record. A list record has `fields`, the list without its item array,
     and `count`, `orderChunks`, and `buckets`. Each of the 64 buckets has
     `count`, `chunks`, and `digest`.
   - The bucket of an item is the FNV-1a 32-bit hash of the UTF-8 bytes of
     its `path`, modulo 64.
   - Keys: `files:state:v1:<kind>:bucket:<b>:<i>` and
     `files:state:v1:<kind>:order:<i>`. An empty bucket has no key.
   - The digest is the lowercase hex SHA-256 of the bucket's JSON text.
   - Order symbol n is character n of the base64url alphabet, from `A`.
   - Modules: `worker/files/bucket-layout.ts` for the constants, the types,
     the hash, the digest, the keys, `parseBucketManifest`, and
     `bucketListKeys`; `worker/files/bucket-read.ts` for `readBucketList`;
     and `readFilesManifest` and `readFileList` in `storage.ts`.
   - The prompt of the reader workspace gives the full text, with each
     damaged case.
9. The scalar fields of each list accept optional fields. The runner file
   report limits plan can then add an omitted entry count to the tree. It
   can add an omitted file count and line totals to the changes list. It
   needs no new layout for them. A reader drops a field that it does not
   know, as the parsers do today.
10. A tree delta writes its buckets in one atomic write, one bucket in
    memory at a time. Each bucket takes the changes of its paths in delta
    order. A delta with a remove reads every bucket in order, because the
    entries inside a removed folder can be in any bucket. Another delta
    reads only the buckets of its paths. An item that stays keeps its
    place. A new item goes after the existing items, in change order. This
    is the result of the JavaScript `Map` that the code uses today.
    - Reason: the stored result stays the same as today.
    - Not chosen: skip the full read when the removed path is a file entry.
      The browser tree model in `src/files/model/tree-model.ts` does this.
      But the Worker result would then change for a tree where a file path
      has entries inside it, and no requirement covers that tree.
11. A full report computes each bucket from the report in memory. It writes
    only the buckets whose digest changed, and the order text when it
    changed. A changes list uses the same order text. So one added file
    changes its bucket and the order text, not every bucket. Reason: Cal
    chose to write only the buckets that change.
12. In the bucket layout, `beginConnection`, `files.unavailable`, and
    `markFilesMoved` change the manifest without a load of list items.
    `markFilesMoved` also removes the changes keys.
    In an old-layout projection, a tree mark changes the serialized tree.
    Use the bounded conversion of call 14 before such a write in this
    branch. The reader release keeps its existing whole-list write.
    Reason: a metadata update must not load the whole projection here.
13. `FilesStorage.write(updates, removals)` gives way to one transaction
    callback with `get`, `getMany`, `put`, and `delete`.
    - The durable adapter runs the callback in one `storage.transaction`.
    - The chat adapter runs it in the current chat transaction, with no
      nested transaction.
    - Reads keep `get` and `getMany`. So a chat queue task reads the
      projection with no second transaction.

    Reason: a standalone write stays atomic, and it does not hold every
    bucket in memory.
14. Convert an old-layout projection before its first list or tree-mark
    write. Read its JSON in bounded chunks, and process complete entries
    without loading either whole list. Keep the old manifest active until
    the bucket data and the new manifest commit together. A failed write
    leaves the old projection intact. Preserve list order and metadata.
    Reason: the first small delta must also avoid the whole-projection
    memory peak. Decision 2 keeps reads of idle old projections working.
15. The reader release has its own branch from `main` and its own pull
    request into `main`, in a nested workspace. Reason: it must merge and
    stay live for an hour before this branch merges. It must not carry the
    unmerged work of this branch. The primary orchestrator keeps this plan,
    adds the reader's `Branch:` markers, and ticks its TODOs after checking
    the reader's report. The reader prompt includes the milestone text.

Runner parts:

16. When part 1 of a changes report is stored, the open report in the
    assembly state keeps its base branch, its two counts, and its summary.
    A later part compares its fields with them, and it reads no earlier
    part. When these fields are absent, as after a write of the previous
    Worker, the next part reads stored part 1 once. Reason: no part is
    parsed again. The previous Worker ignores the optional fields and drops
    them at its next write.
17. The last part loads each stored part once. It joins the entries in part
    order, and it checks the paths with one set and the totals. A failure
    refuses the last part before any write. The existing refusal cleanup
    then discards the stored parts. Reason: this is option B of M5.

Release:

18. The history work splits into two milestones. The save path depends
    only on the documentation. The page limits depend on PR #477. Reason:
    only the page limits use the `ReadScope` of PR #477. The save path and
    PR #477 change other functions of `store.ts` and `history-pages.ts`.
19. Keep the session index of PR #572. Set `SESSION_BATCH_SIZE` in
    `history-session-records.ts` to four. Its list helper materializes at
    most four event bodies at once. Apply the forward byte budget to
    `readSessionHistory` too, or share one forward-page collector with the
    workspace reader. Keep the cutoff and cursor at the last scanned key.
    A read inside a write transaction keeps the workspace fallback until
    the index is ready. Reason: the new helper owns both indexed read
    directions, so changing only `HistoryPages` would miss a forward path.

## Decisions

Both decisions were open on 20 November 2026. The plan approval of 23
November 2026 resolved them with the recommended options. The options
check is merged below. Its report is
`.context/workspace-object-memory/options-check-report.md`.
The options keep their recorded letters.

### 1. Rollback of the bucketed projection

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Process.
- **Location:** `worker/files/storage.ts:31`
- **Terms:**
  - **Previous Worker:** the Worker version that was live before a deploy.
    It runs again after a rollback. Each object runs one version at a time.
    Different workspace objects can run different versions during a deploy.
  - **Bucket layout:** the projection split into 64 buckets by a hash of
    each path, as option D of M3 says.
  - **Reader release:** a pull request that teaches the Worker to read the
    bucket layout while the Worker still writes the current layout.
- **Background:**
  - Today each list of the projection is one JSON text under
    `files:state:v1`, in chunks. Each file event writes both lists whole.
  - The previous Worker reads only that manifest and its chunks in order.
  - A deploy does not force a fresh full report. Hibernating runner sockets
    stay connected across a default code update. The Worker restores them
    without a new `hello`, and `beginStream` keeps the same stream.
  - So after a rollback, the previous Worker must read current lists from
    storage. The rollback can come while the sandbox sleeps.
  - A new connection sends full reports. A restored socket does not.
    A failed old delta can stay before those reports in the runner outbox.
- **Assumptions:**
  - Only the previous Worker must remain a rollback target. Source: Cal's
    task and the [migrations rule](../migrations/README.md#keep-the-previous-worker-working).
  - Cached lists stay current while the sandbox sleeps. Source: Files and
    changes. B and G ask to relax this requirement during rollback.
  - M3 D remains chosen. Source: Cal's decision. A and F reopen that choice
    because rollback adds a cost that the measurement did not cover.
  - The one-hour wait separates deploys. Source: the migrations rule.
    Different objects can run different versions, and deploys can coalesce.
- **Problem:** The previous Worker cannot use the bucket layout. Its next
  tree delta can fail without a refusal. The chat backend then closes the
  connection, and that delta fails again on resend. The reload tests and
  the Changes panel also need list order, which hash buckets lose alone.
- **Impact if no action:** Milestone 6 cannot start. A bucket layout with
  no compatible path would stop the file updates and the runner stream
  after a rollback.
- **Root question:** How do cached lists stay current and in order, and how
  does the runner stream advance, when the previous Worker runs again?
- **Options:**
  - **A.** Defer the bucket layout. Ship the other chosen items, and keep
    the current projection layout. This reopens M3, and each file event
    still writes both lists whole. Effort: Small.
  - **B.** Ship the bucket layout in one pull request with a rollback
    exception. The old keys stay as they were at the deploy. After a
    rollback, the previous Worker serves old lists. It applies tree deltas
    to a stale tree. An old revision or connection ID can instead stop the
    stream before the reconnect's full reports arrive. This breaks the
    previous-Worker requirement. G is the safer rollback exception.
    Effort: Medium.
  - **C.** Ship a reader release first. A small pull request reads the
    bucket layout and converts it back at its next write. The pull request
    of this branch merges only after that release has been live for at
    least one hour. This costs a second pull request, a second review, and
    the wait. Effort: Large.
  - **D.** Ship an in-place layout in one pull request. The old chunk keys
    hold the 64 buckets in fixed ranges with empty padding. So the previous
    Worker still joins them into valid lists. This needs a complex format
    that two Workers parse, and a relayout when a bucket outgrows its
    range. After a rollback, the Changes panel shows its rows in hash
    order. Effort: Large.
  - **E.** Ship this branch with a bucket-writer switch that starts off.
    It reads both layouts and converts bucket data back at a write. After
    one hour live, a small second pull request enables the writer. That
    pull request deletes the switch and the old writes. The real writer
    can test the reader before release. The switch needs both states
    checked, and the writer starts later than C. Effort: Large.
  - **F.** Keep the current layout. Load and write only the changed list.
    This reopens the rejected B of M3. It needs one pull request and keeps
    rollback safe. A small delta still loads and writes the whole tree.
    Effort: Medium.
  - **G.** Ship buckets with a small compatible fallback in the old keys.
    It has an unavailable tree at revision zero and no changes list.
    Keep its connection ID current and its snapshot flag set, so the old
    Worker can apply the next delta. A rollback shows unavailable lists
    and a partial tree until a full report arrives. This relaxes the cached
    lists requirement. Obsolete bucket keys need cleanup. Effort: Medium.
- **Left out:**
  - Write the whole old list beside the bucket layout for each event: it
    keeps the whole-list write that M3 removes.
  - Bucket keys with no reader release and no current old keys: the
    previous Worker cannot apply a tree delta. Its resend can keep the
    stream stopped before the reconnect's full reports arrive.
  - A fresh full report at each deploy: the deploy keeps hibernating
    sockets connected, and the code of the previous Worker cannot change.
  - A whole-list copy after an event burst: a rollback before that copy
    uses stale data. Each copy also retains a whole-list write.
  - An in-place layout that preserves input order: it needs a path-to-chunk
    index and still needs relayout when a bucket grows.
- **Wider fix:** C. It applies the two-PR rule of the migrations README to
  storage that the previous Worker cannot read. That rule names only D1
  migrations. A rule for Durable Object storage is outside this plan.
- **Previous examples:** The two-PR rule for a rename or a drop in
  `migrations/README.md`. The history stub and chunks, which kept a shape
  that the previous Worker reads.
- **Recommendation:** C. It keeps each rollback correct and in order with a
  simple layout. E is the closest alternative. G is safer than B if Cal
  accepts a rollback exception. The options check kept C.
- **Action:** ask the user, because the options have real trade-offs and
  option C makes the release two pull requests, which the M3 choice does
  not cover.
- **Outcome:** C, under Cal's plan approval of 23 November 2026. The writer
  of Milestone 6 merges only after the reader release deploy has succeeded
  and has been live for at least one hour.

### 2. End of the old projection reader

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Code structure.
- **Location:** `worker/files/storage.ts:105`
- **Background:** After the bucket layout ships, the projection of an idle
  workspace stays in the old layout until its next file event. The Worker
  must read it to show the cached lists while the sandbox sleeps. The
  `plans` skill lets only a user decision keep such a reader of stored
  data, with the time when it goes.
- **Problem:** No file event reaches an idle workspace. So its projection
  can stay in the old layout for a long time.
- **Impact if no action:** The plan cannot complete while the old reader
  stays. A removal of the reader would hide the lists of idle workspaces.
- **Root question:** How do cached lists of idle workspaces stay readable,
  and when can support for their old stored format end?
- **Assumptions:**
  - Sleeping workspaces keep their lists. Source: Files and changes.
    C and D relax this requirement for workspaces that stay idle.
  - A rollback to the reader release can write the old layout again.
    Source: decision 1 C. A retirement check must include that rollback
    target, not only the time since the first bucket write.
  - A converter for stored user data needs Cal's choice. Source: the
    `plans` skill. Cal's production rule requires those lists to stay usable.
- **Options:**
  - **A.** Keep the old-layout reader with no end date. A follow-up item
    records its removal and the condition for it. The current reader code
    and its tests stay. Effort: Small.
  - **B.** Convert each stored projection in a background pass, then
    remove the reader. The pass must wake each workspace object, and it
    needs its own rollback care. Effort: Large.
  - **C.** Remove the reader after a fixed time, such as 30 days. An idle
    workspace then shows the unknown tree until its sandbox reports again.
    This changes the Files requirement that the lists stay while the
    sandbox sleeps. Effort: Small.
  - **D.** Convert at the next Files API read, then retire support after a
    fixed time. Only workspaces with no read or sandbox start then lose
    their lists. The first read also writes storage. Keep the read helper
    for the chat queue free of that write. It still relaxes the cached
    lists requirement, and it needs rollback care. Effort: Medium.
- **Left out:** Conversion on start or read without an end date still
  needs a reader for workspaces that nobody opens, as in A. Read logs cannot
  prove that no unread old projection remains.
- **Wider fix:** None. This is a question of lifetime, not a defect class.
- **Previous examples:** None found.
- **Related:** Item 1: this item waits for its answer. Under its option A,
  this item has no subject.
- **Recommendation:** A. The reader is small, and it keeps the cached lists
  that the Files requirement asks for. The options check kept A. Retire it
  only after stored-data coverage and rollback targets permit removal.
- **Action:** ask the user, because the `plans` skill gives the choice to
  keep a reader of stored data to the user.
- **Outcome:** A, under Cal's plan approval of 23 November 2026. A
  follow-up item records the conditions for its removal.

### Milestones under the other options of decision 1

- A: Milestones 2 and 6 go. Decision 2 has no subject.
- B: Milestone 2 goes. Milestone 6 writes only the bucket layout. Its pull
  request names the rollback exception as a breaking change. It also
  updates `docs/automatic-deploys.md` with that explicit exception.
- D: Milestone 2 goes. Milestone 6 writes the in-place layout in the old
  keys, and it keeps one reader for both layouts. Design calls 8, 11, and
  15 change with it.
- E: Milestone 2 becomes the disabled-writer release of this branch.
  Milestone 6 builds the writer and checks both switch states. A separate
  later pull request enables it and deletes the switch and old writes.
  Move activation to that separate work. This branch must finish without
  a required task that waits for its own merge.
- F: Milestone 2 goes. Milestone 6 changes only the current list in the
  existing format. Record that this revises M3 D. Decision 2 has no subject.
- G: Milestone 2 goes. Milestone 6 also maintains the compatible fallback
  and proves that a delta advances after rollback. Document the unavailable
  cached lists as a breaking exception in the protocol and deploy docs.

Replaced ways:

- A whole-list projection with one JSON text for each list → the bucket
  layout. Consumers: `FilesState` `beginConnection`, `apply`, `tree`, and
  `changes`, `loadFiles`, `saveFiles`, `markFilesMoved`,
  `RunnerFileReports` `beginStream` and `apply`, the reads of
  `WorkspaceFiles`, the repository change publication, the storage test
  harness, and the projection tests in `worker/files/` and `worker/chat/`.
  The reader of both layouts comes in Milestone 2. Moved in Milestone 6.
  The whole-list writer and the convert-back write go in Milestone 6. The
  old-layout reader waits for decision 2.
- `FilesStorage.write(updates, removals)` → one transaction callback.
  Consumers: `saveFiles`, `markFilesMoved`, `RunnerFileReports`
  `beginStream`, `refuse`, `accept`, and `apply`, `durableFilesStorage`,
  `chatFilesStorage`, and the storage test harness. Moved and deleted in
  Milestone 6.
- A join of all stored parts for each part → field checks for each part
  and one join at the last part. Consumers: `RunnerFileReports.accept`,
  `joinReport`, and the part tests of the chat backend. Moved and deleted
  in Milestone 5.
- A copy of each emitted event and two serializations of a large file
  event → a frozen hand-over and one serialization. Consumers:
  `ChatTransaction.emit` and `saveHistoryEvent`. Moved and deleted in
  Milestone 3.
- One storage list of 32 events for each forward page → pages of several
  lists of four events, with limits. Consumers: the events socket replay,
  the workspace summary, Continue and repository change publication, the
  first stop requester, the transcript copy, `prepare`, the newest-first
  reader, `worker/chat/history.md`, and the history tests. Moved and
  deleted in Milestone 4.
  Preserve the session index and move its 32-key batch and forward reader
  to the same limits. Consumers also include `listSessionHistory`,
  `readSessionHistory`, `prepareSessionBatch`, and the session-index tests.

## Milestone 1: Documentation and protocol

Depends on: none

This milestone states the changed requirements before the code changes. It
covers the retention of file reports in the history and the time of the
repeated-path check. The projection layout and the page limits change no
requirement.

- [x] Read the current Terms page `src/marketing/terms.ts`, the Privacy
      page `src/marketing/privacy.ts`, and each public guide in
      `src/marketing/docs/` in full. Upstream commits changed some of them
      on 20 November 2026. List each sentence that restates a fact that
      this milestone changes.
- [x] Update each listed sentence in this change, as `AGENTS.md` requires.
      When an edit is outside the scope of this plan, add it here as a
      scope change, and tell Cal before the edit.
- [x] In [Chat and events](../docs/protocol/chat-and-events.md#events),
      replace "stores every event". State that the chat remains durable.
      Keep the current compaction of answers and tool states. Keep each
      tree delta. State that it keeps the newest full
      tree and the newest changes list, and that it can drop each earlier
      one. Keep the reason that the chat survives a stop of the sandbox.
      Give the decision and its rejected options in one or two sentences.
- [x] Keep `chat-and-events.md` at about 250 lines. It has 250 lines now.
      When the edit passes the target, split the doc, as the
      `documentation` skill says.
- [x] In [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes),
      state that the workspace checks that each path appears once when the
      last part of a report arrives. State that a repeated path refuses
      that last part. Keep the rules that a refused part discards the
      incomplete report and that the last complete report stays. Give the
      decision and the rejected path index in one sentence.
- [x] Read [Lost workspace updates](../docs/protocol/lost-workspace-updates.md).
      Confirm that its replacement and repair rules hold when the last part
      is refused. Change it only where a sentence contradicts the new rule.
- [x] Search `docs/` and each `README.md` for statements about history
      retention and part checks. Fix each contradiction in a protocol doc or
      an architecture doc here. The code milestones update the READMEs.
- [x] Check each relative link of each changed Markdown file.
Evidence: `.context/workspace-object-memory/m1-docs/`. No legal page or
guide restates a changed fact.

## Milestone 2: Projection reader release

Depends on: decision 1 choosing C. Cal asked on 23 November 2026 to start
this milestone at once. It needs no text of Milestone 1.

A small pull request into `main` teaches the Worker to read the bucket
layout of design call 8. The Worker still writes the current layout. When
it writes a projection that is in the bucket layout, it writes the current
layout. It removes each bucket key in the same transaction. This Worker is
then the previous Worker when Milestone 6 deploys. The pull request of this
branch merges only after this release has been live for at least one hour,
as [the two-PR rule](../migrations/README.md#keep-the-previous-worker-working)
says.

The reader workspace follows `finish-work`, because its pull request
targets `main`. Its prompt must keep review and fixes before PR creation.
The primary orchestrator owns this milestone's plan edits and TODO ticks.

- [x] Create a nested workspace for this milestone. Start its branch from
      `main`. Add its `Branch:` markers here. Include this milestone and
      its review order in the delegation prompt. Keep this plan off that branch.
- [ ] Define the bucket layout in one module under `worker/files/`. Give
      its keys, marker, chunks, order text, counts, and digests in the doc
      comment of the module. Keep room for the optional scalar fields of
      design call 9. Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] Read either layout through one function over a supplied
      `FilesStorage`. Use only `get` and `getMany`. Read one list without
      the other. Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] Make each write path convert a bucket-layout projection back:
      `beginConnection`, `apply` for each file event type, and
      `markFilesMoved`. Each one writes the current layout and removes each
      bucket key and order key in one transaction. Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] Treat a damaged bucket layout as damaged data, as today. A missing
      chunk, a count that does not match the order text, or an unknown
      marker value gives the existing invalid file response. Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] Add tests with records that a test builder writes in the documented
      layout. Branch: `calummoore/memory-projection-reader-release-jrq9`.
  - [ ] A tree with the unavailable mark reads back exactly. So do a
        changes list with and without both optional counts, an empty list,
        a bucket of more than one chunk, and a list in an order that is not
        path order.
  - [ ] Each damaged case fails as a damaged old-layout record fails.
  - [ ] Each write path converts back, leaves no bucket key, and reloads in
        the old layout.
  - [ ] The existing tests of the old layout pass unchanged.
- [ ] Update the storage section and Key Code of the
      [files README](../worker/files/README.md). Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] Run the targeted tests, `npm run test -- worker/files`. CI runs the
      complete gate on the pull request. Commit and push the branch. Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Apply its fix rule.
      Push and re-review required fixes before opening the pull request. Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] Open the reader pull request into `main` after review and fixes. Branch: `calummoore/memory-projection-reader-release-jrq9`.
- [ ] After the root coordinator merges it, record the merge commit and the time of the
      successful deploy run in `.context/workspace-object-memory/`.

## Milestone 3: History save path

Depends on: 1

This milestone changes what the history keeps and how `emit` stores a file
event. It covers M1 A, M2 B, and M3 F. It does not change the history
pages.

- [ ] Add the index key of the newest changes list, as design call 1 says.
      Index a newer changes list in the transaction of its event. Delete
      the older list and its chunks.
- [ ] Keep the index watermarks as they are. Add no sweep of older
      histories. Record the cutover from the stored workspace tip, not a
      caller's older page cutoff. Skip old changes during index preparation.
- [ ] Store a file event above 4 KiB, or 4,096 bytes, as the existing stub
      and chunks, as design call 2 says.
- [ ] Take each file event in `emit` without `structuredClone`, and
      deep-freeze it, as design call 3 says. Confirm that no code after
      `emit` writes to a file event. Include the publisher and the browser
      presentation.
- [ ] Serialize a file event once for the byte check and the chunks, as
      design call 4 says.
- [ ] Add tests:
  - [ ] A second changes list deletes the first and its chunks. Each tree
        delta and the newest tree stay.
  - [ ] A changes list stored before the index key existed stays after a
        newer list. Cover both indexed history and cold unindexed history.
        No watermark resets.
  - [ ] An envelope of 4,096 bytes stays one value. An envelope of 4,097
        bytes becomes a stub with chunks. Include UTF-8 and JSON escapes.
  - [ ] With compaction ready, legacy session-index preparation skips file
        stubs without reading their chunks. Keep warm session reads off
        workspace-only file events.
  - [ ] `emit` stores and publishes the file event object that it gets. A
        write to that object throws. Other event types are still copied.
  - [ ] The published events equal the stored history after a reload.
- [ ] Update [History and event order](../worker/chat/history.md) for the
      stored shape and the retention of changes lists.
- [ ] Run the targeted tests: `worker/chat/history-snapshot.test.ts`,
      `history-grown-delta.test.ts`, `history-order.test.ts`,
      `history-session-pages.test.ts`, `recorded-events.test.ts`,
      `runner-grown-reports.test.ts`, and the new tests.
## Milestone 4: Forward history pages

Depends on: 1, 3, and the merge of PR #477 into `main`

This milestone bounds each history page, as M2 A says. It builds on the
`ReadScope` of PR #477. PR #477 merged into `main` on 22 November 2026 as
`6408c95`, with the session index preserved. It sets the replay budget of
8 MiB in `worker/chat/browser-subscription.ts`.

- [ ] Merge `main` into this branch after PR #477 merges. Resolve
      `store.ts` and `history-pages.ts` with Milestone 3 and the session
      index already on `main`. Preserve its committed frontier and keys.
- [ ] Read forward pages as design call 5 says. Count each shown event once
      for both byte limits. Keep `nextAfterEventNumber` at the last stored
      step, also when the page shows no event.
- [ ] Count a chunked event from its stored text, as design call 6 says.
- [ ] Make the newest-first reader and `prepare` list at most four stored
      events at a time. Set the indexed read batch to four in
      `history-session-records.ts`. Cap its parallel body loads too.
- [ ] Apply the 4 MiB forward stop to indexed `readSessionHistory`, as
      call 19 says. Keep the newest-first scan limit at 2,048 session keys
      and its existing byte limit. Preserve stale-index cursor progress.
- [ ] Keep session-index preparation resumable and atomic. Use four-record
      batches. Yield the chat queue only between committed batches.
      Preserve the write-transaction fallback when the index is not ready.
- [ ] Add tests:
  - [ ] A page ends after the event that reaches 4 MiB. The next page
        starts after that event.
  - [ ] An oversized first event advances the cursor on its own page.
        An event that crosses the limit can follow earlier events on that page.
  - [ ] No storage list asks for more than four events.
  - [ ] The connection budget goes down across pages, and a new page does
        not reset it. A budget end inside a page sets `hasMore` as before.
  - [ ] An indexed read loads only the requested session. Both directions
        load at most four bodies together. Forward byte stops preserve
        every later event and advance past missing stored bodies.
  - [ ] An unprepared write-transaction fallback past 3,000 events of
        another session gives an empty page with `hasMore`. Its cursor
        advances after 2,048 stored steps without starting an index build.
  - [ ] A stopped four-record index batch resumes after its last commit.
        Queued writes still run between batches without changing the cutoff.
  - [ ] The transcript copy, the workspace summary, Continue, and the first
        stop requester give the same results over many pages.
- [ ] Update [History and event order](../worker/chat/history.md) for the
      forward page limits and the list size.
- [ ] Run the targeted tests: `worker/chat/history-pages.test.ts`,
      `history-newest-pages.test.ts`, `history-newest-routes.test.ts`,
      `history-session-pages.test.ts`, `transcript-pages.test.ts`,
      `session-transcripts.test.ts`, `workspace-summary.test.ts`,
      `browser-subscription.test.ts`, `browser-native-replay.test.ts`, and
      `history-session-index.test.ts`, `history-session-commit.test.ts`,
      and the new tests. Update batch-size expectations while keeping the
      existing cutoff, rollback-gap, atomicity, and queue-yield assertions.

## Milestone 5: Runner part checks

Depends on: none for the code. Its protocol text comes from Milestone 1.

This milestone changes when `RunnerFileReports.accept` checks a part, as
M5 B says. It runs beside the history work in a nested workspace, from 23
November 2026. It and the reader release change separate sections of the
files README, so it does not wait for the reader release. The part code
itself needs no reader change. Its branch merges into this branch only after
Milestone 1 is committed here, so its protocol text comes first.

- [ ] Check the numbers and the fields of each part when it arrives, as
      design call 16 says. Read no earlier part. Do not join the parts or
      check path uniqueness before the last part. Keep existing arrival
      checks for path syntax and entry shape at the runner boundary.
- [ ] Keep the fields of part 1 in the open report of the assembly state.
      Keep room for optional fields of the runner file report limits plan.
- [ ] At the last part, join the parts and check them, as design call 17
      says.
- [ ] Keep the check of an identical repeated part and the refusal of a
      conflicting one. Keep the atomic publication. Keep the cleanup after
      a replacement, a refusal, or a new stream. Keep the restart and
      resend behavior.
- [ ] Add tests:
  - [ ] A middle part reads no earlier stored part.
  - [ ] A middle part with another base branch, count, or summary is
        refused, as today.
  - [ ] A path in two parts is stored with its part and refuses the last
        part. The stored parts go, and the last complete report stays. A
        repair request for the tree goes out.
  - [ ] A state without the stored fields reads part 1 once.
  - [ ] An empty report of more than one part is refused at its last part.
- [ ] Update the [files README](../worker/files/README.md) for the time of
      each check.
- [ ] Run the targeted tests: `worker/files/report-storage.test.ts`,
      `worker/chat/runner-file-parts.test.ts`,
      `runner-files-durable.test.ts`, `runner-repair-parts.test.ts`,
      `runner-receipt-crash.test.ts`, and `runner-grown-reports.test.ts`.

## Milestone 6: Bucketed projection writer

Depends on: 1, 2, and 5. Milestone 2 must be merged into `main`.

This milestone writes the bucket layout, as M3 D says. It uses the layout
module of Milestone 2, and it does not change what that reader reads. The
behavior at the API stays: the revision checks, the unavailable mark, the
check of the old connection, the last complete report while parts wait,
the path labels, the list order, and the absent optional counts.

- [ ] Merge `main` into this branch after Milestone 2 merges. Confirm that
      the layout module is the merged reader.
- [ ] Give `FilesStorage` the transaction callback of design call 13. Move
      each consumer of `write`, then delete `write`. This includes the
      adapter in `worker/chat/files-storage.ts`, which the approved plan
      includes.
- [ ] Write full reports as design call 11 says. Write tree deltas as
      design call 10 says.
- [ ] Write `beginConnection`, `files.unavailable`, and `markFilesMoved` as
      design call 12 says. Keep `markFilesMoved` callable in the
      publication transaction of a repository change.
- [ ] Convert old projections with bounded memory, as design call 14 says.
      A small delta or an unavailable mark must not call the whole-list
      loader. Publish the new manifest only with the complete conversion.
- [ ] Delete the whole-list `saveFiles` and the convert-back write of
      Milestone 2.
- [ ] Keep one projection read over a supplied `FilesStorage`. It uses
      only `get` and `getMany`, and it adds no queue task.
- [ ] Add tests:
  - [ ] Each case of `worker/files/state.test.ts` passes unchanged. This
        includes the order of 20,000 entries after a reload.
  - [ ] Two upserts of existing paths read and write only their buckets and
        the manifest. An insertion also updates the order text.
  - [ ] A delta with a remove reads each bucket once, one at a time. It
        removes the entries of a folder from each bucket.
  - [ ] These sequences give the result of the old `Map` code: a remove
        and then an upsert of the same path, an upsert and then a remove of
        its folder, a move onto an existing path, and a move and then a new
        item at the old path.
  - [ ] A changes list with one added file writes only its bucket, the
        order text, and the manifest.
  - [ ] An error after some bucket writes of a standalone apply leaves the
        stored projection unchanged.
  - [ ] An old-layout projection reads correctly through the supported
        reader. Keep its existing value and metadata assertions.
  - [ ] A read in a chat queue task returns the same lists.
- [ ] When decision 2 chooses A, add its follow-up item under
      `plans/follow-ups/`.
- [ ] Update the [files README](../worker/files/README.md) and the
      [chat backend integration README](../worker/chat/integration/README.md)
      where they name the storage adapter.
- [ ] Run the targeted tests: `npm run test -- worker/files`, then
      `worker/chat/runner-file-parts.test.ts`,
      `runner-files-durable.test.ts`, `runner-grown-reports.test.ts`,
      `runner-connection-files.test.ts`, `unavailable-files.test.ts`, and
      `worker/lifecycle/repository-change-native.test.ts`.

## Milestone 7: Verification

Depends on: 2, 3, 4, 5, and 6

- [ ] Merge `main`. CI runs the complete gate, `npm run check`, on the
      pull request, as Cal asked on 23 November 2026. Run the typecheck,
      the lint, and the format check locally.
- [ ] Run the targeted tests of Milestones 3 to 6 on the combined tree.
- [ ] From the orchestrator session, request a rerun of the measurement
      harness on this branch's tip with `send_message`. It runs in
      workspace `JpEDfCcy4nuFwTfD3g8tmfOJn6N6EwVRFT0y5elKX1Y`, session
      `nvF3pjtEyRe5SFVCLYTUYnJlc00B-lx6F6JDMknbDLs`. Ask for the same
      scenarios at 1x and 10x, and for option G as a whole.
- [ ] Measure the current `main` baseline with the session index and
      PR #477, then the finished branch. Separate warm indexed pages,
      cold index preparation, and workspace replay. Do not attribute the
      session-index gain to the 4 KiB history stubs.
- [ ] Include a single file delete and a folder delete at 10x. The current
      runner sends a remove for each deleted file. Compare their read cost
      when the Worker visits all buckets.
- [ ] Run the cold conversion on a large old-layout projection with a small
      delta and a tree mark. Record the heap without a whole-list load.
      Inject a failed conversion and confirm that the old projection stays
      intact. Keep this one-time conversion proof under `.context/`.
- [ ] Run the actual reader-release Worker against data from this writer.
      Check reload, connection reset, delta, unavailable, and repository
      move paths. Keep this rollback-format proof under `.context/`.
- [ ] Copy the evidence into `.context/workspace-object-memory/`. Compare
      the heap, the CPU, the storage rows, and the kept history with the
      figures of the recorded decisions. Add one line here that names the
      evidence file.
- [ ] When a result is much worse than its recorded figure, add a decision
      or a finding before the pull request.

## Milestone 8: Commit, review, and pull request

Depends on: 7

- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. Under option C of
      decision 1, it says that it merges only after the reader release has
      been live for at least one hour, and it gives the deploy time.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, check that the workspaces of the November memory
      incidents have no memory reset of their Durable Object for one day.
      This check needs the operator logs.
