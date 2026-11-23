# New tabs read workspace state

Status: Active. On branch `calummoore/object-memory-new-tab-state-reads-cesn`, no pull request yet. Cal approved the implementation on 23 November 2026. Implementation waits for the merge of the memory plan, as "Order with the other plans" says. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each workspace stores its events in its Durable Object, numbered from 1.
A browser tab follows them over event sockets. Today a new tab, a reload,
and the first show of a workspace in a tab open two sockets after event 0:
the stream of the workspace model and the stream of the Files store. Each
socket replays the whole stored history only to rebuild a few values. These
values are the header notices of failed repairs, the newest list of
listening ports with its failed repair, the newest skill lists, the Files
lists with their failed repairs, and the repository. A long history costs
the Worker memory and time.
[PR #477](https://github.com/Firna-AI/conductive/pull/477) bounds the
stored history that each connection sends to 8 MiB. The chat already reads
its newest page and starts after it (decision 280).

Cal chose B for item 4 on 20 November 2026, as Decision 1 records. A new
tab gets the current state from reads. The workspace read adds a seed: the
newest port report, the newest skill lists, and the open failed repairs of
the name, the start steps, and the port list, each with the time of its
first failure. Each Files read adds its own cutoff, its failed repair, and
the repository. Each stream then starts after the event number of its
read. Older Mac apps keep the full replay, and the Worker keeps serving it.

The change adds no screen, visual state, text, or user flow, so the plan
has no mockup milestone. It does not change the chat, the socket protocol,
or the number of sockets. The plan for workspace object history and files
memory owns the internals of `worker/files/storage.ts` and
`worker/files/state.ts`. The plan for runner file report limits owns the
optional limit fields of the file reports. This plan also leaves the
legacy history scan of the workspace summary unchanged.

Approval: Cal wrote "Ok progress those plans and merge when go is green" on
23 November 2026. Cal also said that the complete gate runs in CI, not
locally. Cal merges each pull request after its checks pass. No agent
merges into `main`.

PR #477 merged on 22 November 2026 as `6408c9523`. On 23 November 2026
this branch merged `main` at `48b8a3a98`, in merge commit `e34a9c5ac`.
The merge had no conflict. The refresh audit of that day is under
`.context/new-tab-workspace-state-reads/prep-2026-11-23/`.

Order with the other plans: the plan for workspace object history and
files memory (`plans/workspace-object-memory.md`, branch
`calummoore/object-memory-history-and-files-state-14g5`) changes the
shared Worker code and the Events section first. It ships as a reader
release and then a final writer pull request. Milestone 1 of this plan
starts only after that final pull request merges and Cal gives the
signal. Each milestone then merges `main` first, with the `git-merge`
skill. The memory plan owns these parts:

- The Events section of `docs/protocol/chat-and-events.md`: it replaces
  "stores every event" with the retention of the newest tree and the
  newest changes list. Milestone 1 moves the section only after that edit.
- `ChatTransaction.emit` in `worker/chat/store.ts`: a file event is no
  longer copied, and it is serialized once. Milestone 2 adds the read-state
  update beside the summary update and keeps that rule.
- `worker/chat/history-pages.ts`, `history-storage.ts`, and
  `history-session-records.ts`: four stored events for each storage list,
  the 4 MiB page stop, the newest changes-list index, and file events above
  4 KiB stored as a descriptor with chunks. The recovery of call 6 uses
  plain storage lists and reads none of these modules. It must accept the
  descriptors of both thresholds.
- `worker/files/storage.ts`, `state.ts`, and `worker/chat/files-storage.ts`:
  the bucket layout and the transaction callback of `FilesStorage`. The
  memory plan keeps one projection read over a supplied `FilesStorage`
  with only `get` and `getMany`. Milestone 3 uses that read in the chat
  queue view. It parses no bucket key.
- `RunnerFileReports` and the part checks of `worker/files/`.

This plan owns the `seed` and `stateRead` members, the read-state record,
the continuity mark in `chat:v1:meta`, the recovery, the response event
numbers of the Files routes, and the app side of each read.

The plan for runner file report limits
(`plans/runner-file-report-limits.md`) adds optional count fields inside
the tree and changes bodies. It reserves no event-number field, and
`stateRead` stays a separate member. Its Milestone 5 also changes the
readers of `src/files/api/` and the Files sync. When it merges before
Milestone 5 of this plan, Milestone 5 merges `main` first and keeps each
of its fields. When this plan merges first, that plan keeps `stateRead`.

Contract owners:

- `docs/protocol/workspace-events.md`, a new page that Milestone 1 splits
  from [Chat and events](../docs/protocol/chat-and-events.md#events).
- [Lost workspace updates](../docs/protocol/lost-workspace-updates.md).
- [Port previews](../docs/protocol/port-previews.md) and
  [Listening ports](../docs/protocol/listening-ports.md).
- [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes).
- [Skill mentions](../docs/protocol/skill-mentions.md), which says that
  each tab gets the latest skill report.
- The READMEs of the [chat backend](../worker/chat/README.md), with
  [Report repairs](../worker/chat/report-repairs.md), and of the
  [Files Worker](../worker/files/README.md).
- The READMEs of the [web app](../src/app/README.md), the
  [workspace screen](../src/shell/workspace/README.md), with
  [Notices of a failed repair](../src/shell/workspace/repair-notices.md),
  the [Files screens](../src/files/README.md), the
  [GitHub screens](../src/github/README.md), and the
  [previews](../src/previews/README.md).

Terms:

- **Cutoff:** the workspace event number through which a read gives the
  state. A stream that starts after the cutoff loses no event.
- **Seed:** the optional `seed` member of the workspace read. It holds the
  newest port report, the newest skill lists, and the open failed repairs
  of the name, the start steps, and the port list.
- **Read state:** the Worker's stored copy of the seed data, the repository,
  and the first failure of each repair. Each chat transaction keeps it
  current.
- **Repair record:** the stored `report.refresh` command of one report kind,
  under `chat:v1:report-repair:`, in the state `pending` or `failed`.
- **Kept store:** a store that the tab keeps for each workspace that it
  showed, so that a return resumes from its own cursor.

Replaced ways:

- A full replay from event 0 as the source of the current state of a new
  tab → reads with cutoffs, and streams after them. Consumers:
  `WorkspaceModel` with `DetailOrder`, `HeaderNotices`, `ToolEvents` with
  the Preview store, `WorkspaceSkills`, the GitHub adapter
  `githubSubscribe` with `GitHubStore`, the Mac bar refresh, the read
  marks, the bar controls, `RepositoryChange`, `WorkspaceFiles` with
  `RepositoryWatch`, the API readers, the development fake, the test
  fixtures, and their guides. Moved in Milestones 2 to 5. The audit of 23
  November 2026 found no other subscriber of the model's stream. The
  services store, the files preview store, and the Terminal store read
  their own routes, and they lose nothing at a seeded start. The chat has
  its own stream and read (decision 280). Not deleted:
  Decision 1 keeps the full replay for older Mac apps, and the Worker keeps
  serving it. The app keeps it only for a reply without `seed` or
  `stateRead`, which only an older Worker gives, such as after a rollback.
  A failed read without a cutoff keeps its existing replay recovery.
  This also covers an Archive or a Restore during a failed workspace
  read. Successful reads from the new Worker use their cutoffs. Removal
  of the remaining replay paths needs a user decision.
- The `treeFromStream` and `changesFromStream` flags of the Files sync →
  an event floor for each list. Consumers: `files-sync.ts`,
  `files-store.ts`, and their tests. Moved and deleted in Milestone 5.
- `RepositoryWatch` learns the first repository from the first
  `workspace.updated` event of the stream → each Files read gives the
  repository at its cutoff. Consumers: `files-store.ts` and its tests.
  Moved in Milestone 5. The first-record rule stays only for the full
  replay path.

## Decisions

### 1. How a new tab gets the current workspace state

Answered by Cal on 20 November 2026: **B**.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. Item 4 of the task of the parent workspace.
- **Category:** Performance.
- **Location:** `src/app/workspace-model.ts:194` and
  `src/files/model/files-store.ts:91`, where a new tab opens each stream
  after event 0.
- **Terms:** A Durable Object is the server component that stores and
  orders one workspace's data and events.
- **Background:** Each workspace stores its events in its Durable Object.
  A new tab opens one socket for the workspace model and one for the Files
  store, each after event 0. The chat reads its newest page and starts
  after it (decision 280).
- **Problem:** Each socket of a new tab replays the whole stored history.
  The tab needs only a few current values from it: the notices, the port
  list, the Files lists, and the repository.
- **Impact if no action:** Each new tab of a long workspace waits for two
  full replays, and the Worker spends memory and time on each. With PR
  #477, such a history needs several connections of 8 MiB on each stream.
- **Root question:** How does a new tab show the current state of a
  workspace without a full replay of its history?
- **Options:**
  - **A.** Change nothing. Each new tab still makes two full replays.
    Effort: Small. Rejected for that cost.
  - **B.** Chosen. Reads give the current state. The workspace model and
    the Files store start their streams after the event numbers of their
    reads. The workspace read adds the newest port report and the open
    failed repairs. A failure keeps its first time until a complete
    replacement of that kind. Older Mac apps keep the full replay, and the
    Worker keeps serving it, with 8 MiB for each connection. B needs a
    stored projection, a recovery of older workspaces, and changes in the
    Worker and the app. Effort: Large.
  - **C.** Start the workspace stream at the newest event number, with no
    seed. Effort: Small. Rejected: the tab loses the port list and the
    notices of failed repairs.
  - **D.** Do B and share the model's stream with the Files store. Start
    it after the smallest cutoff of the three reads. Each part keeps its
    own floor. This saves one socket, but couples the stores' lifetimes
    and adds floors to every model part. Effort: Large. The options check
    added D on 20 November 2026. B remains the recommendation.
- **Left out:** A copy of the state on the disk of the device, because a
  first open has no cached state. The chat protocol also rejects a disk
  cache because it retains code and secrets. The same risk applies to
  file paths and port names. State supplied through a socket instead of
  reads stays out, because it changes Cal's chosen source of state.
- **Wider fix:** B. Each part of a new tab starts from a read with a
  cutoff, so no part rebuilds its state from the history.
- **Previous examples:** Decision 280 moved the chat from a full replay to
  its newest page. PR #477 bounds the stored history of each connection to
  8 MiB.
- **Assumptions:** All options share these:
  - A new tab starts empty, and no workspace data stays on the device.
    Source: the Events section of the chat protocol doc.
  - The chat keeps its own read and stream. Source: decision 280.
  - The Worker keeps serving the full replay for older Mac apps. Source:
    the text of item 4.
  - Every screen, visual state, text, and user flow stays the same.
    Source: the text of item 4.
  - The browser socket protocol stays. Source: the existing protocol. Both
    B and D can use it. Keeping two sockets is my design call for B,
    because it avoids the lifetime coupling of D.
- **Recommendation:** B. It removes both full replays and keeps the port
  list and the notices, which C loses. The options check kept B over D,
  because B needs fewer linked parts.
- **Outcome:** Cal chose B on 20 November 2026. This plan applies it.

Options check: 20 November 2026. The check kept B and added D. Report:
`.context/new-tab-workspace-state-reads/options-check.md`.

## Design

Each call below is my call, made on 20 November 2026 under the decision
test. Each one applies Decision 1 or a requirement in force, so none waits
for the user.

The refresh of 23 November 2026 is also my call under the same test. It
adds the newest skill lists of #358 to calls 1 to 3, 6, 9, and 11, because
Decision 1 keeps every visible state, and Cal confirmed on that day that a
missing field of an existing consumer belongs in this plan. It also
records the current code in calls 5 to 9, 13, and 14.

### The read data

1. **Shared read types.** Hand-written browser types in `src/shared/` hold
   the workspace `seed` and the Files `stateRead`:
   - The seed holds the newest port event with its number, its time, and
     its list or null, or says that no port event is stored. It holds the
     newest `skills.updated` event in the same way, with its lists or null.
     It also holds the open failed repairs of `workspace.title`,
     `start.updated`, and `ports.updated`. Each failure gives the number
     and the time of its first marker, and the marker fields that the tool
     events keep.
   - Each Files read gives the failed repair of its own list and the
     repository at its cutoff, because a failure must match the cutoff of
     the stream that later clears it.
   - The types reuse the generated `ListeningPort`, `RunnerReportKind`,
     and `SkillsUpdated`, and the browser `PortsUpdated`, whose list can be
     null. No generated file and no runner wire type changes.
   - The types go in a new file, such as
     `src/shared/workspace-state-read.ts`. `src/shared/workspace-read.ts`
     is the reader of the workspace record (#567).
   - `stateRead` is one nested member, so it cannot collide with the
     optional limit fields of the list bodies.
   - An absent member means an older Worker. A seed with no port report
     and no failure is a valid answer.
   Reason: Rust owns the runner types, and the reads exist only between
   the Worker and the browser.

### The Worker read state

2. **One stored projection.** `ChatTransaction.emit` and
   `ReportRepairs.remove` update a read-state projection in the same
   transaction as each event, as the summary projection does. It keeps the
   newest port event as stored, after the secret filter and the display
   cuts. It keeps the newest `skills.updated` event as stored. It keeps the
   repository of the newest `workspace.updated` event. It keeps the first
   failure of the notice window of each report kind. It lives under a new
   versioned key under `chat:v1:`. Nothing migrates or deletes the older
   records or the history. Reason: one transaction keeps
   the read state equal to the history through each event number.
3. **The notice window of each kind.** The window is a projection of all
   stored full report events and markers, not of the repair records. It
   follows the rules that the browser applies to the stream today:
   - A sessionless marker with `repairFailed` sets the first failure when
     the window has none. A later failure keeps the first time.
   - A full report event of the kind ends the window: `workspace.title`,
     `start.updated`, `ports.updated`, `files.snapshot`, or
     `changes.updated`.
   - `skills.updated` is the sixth report kind since #358. It has no
     window and no notice. A failed repair of the skill lists stores a
     `skills.updated` event with null lists, and the seed carries that
     event.
   - An event counts wherever the Worker stores it. The `ports: null` list
     of a stop and the `start.updated` events of the lifecycle journal end
     the notice, but they leave the repair record `failed`.
   - A refusal after such an event starts a new first failure, with its
     own time.
   Reason: this keeps the display behaviour of the stream in force today,
   and the protocol requirements, in the live projection and in the
   recovery. A failed record alone cannot rebuild the notice of the port
   list or of the start steps.
4. **The repair record as a second input.** A name report that changes
   nothing removes the repair record and stores no event. The window alone
   would keep its notice. So the removal of a record also ends the window,
   and a read shows a failure only while the record of its kind is
   `failed`. The recovery bounds its scan with the cause of the current
   record, so it never brings back the notice of an older repair. Reason:
   the protocol in force says that such a report ends the repair. Cost: a
   tab that was open before such a report keeps its notice until it
   reloads, as it does today. A new tab shows no notice.
5. **Continuity mark.** Each chat transaction writes the chat metadata
   record `chat:v1:meta` in `finish`. A Worker that keeps the read state
   adds an optional mark with the read-state version. It copies the mark
   only when the record had it before the transaction. A previous Worker
   writes the record without the mark, and it reads the record with the
   mark. A read uses the read state only while the mark says that the
   state of its version is complete. Otherwise the read waits for the
   recovery of call 6. Reason: the mark costs no extra write. It catches
   each write of a previous Worker, also one that stores no event, such as
   the end of a name repair. The read-state record alone proves nothing
   after a rollback. `ChatMetadata` is in `worker/chat/store-metadata.ts`.
   Today the store reads it without a shape check and copies only its
   three fields, so the previous Worker drops the mark at its next
   `finish`, also in a change that stores no event.
6. **Recovery.** A missing mark, or a mark of another version, needs a
   recovery before a read of this Worker answers. The recovery works in
   this way:
   - A read that finds no complete mark starts the shared recovery, or
     joins the one that runs, and waits for its end. The workspace read
     and the Files reads share one recovery.
   - The workspace GET holds the chat queue in its task. So it waits
     outside the queue through its `QueueTurn`, as `prepareSessionHistory`
     does for the session index of #572. Then it reads in a new queued
     task. The mark is still needed, because that index cannot see a
     write that stores no event.
   - One queued task fixes a cutoff and sets the mark to "recovering from
     this cutoff".
   - The recovery reads the stored history backwards from the cutoff, one
     small page in each queued task. Runner receipts and other chat tasks
     run between two pages. No read holds the queue during the scan.
   - It stores its continuation and its accumulator after each page. After
     an eviction or a crash, the next read resumes it there.
   - The accumulator holds at most one port event, one skills event, one
     repository, and five failures. Its memory does not grow with the
     history.
   - It uses plain backward storage lists. `HistoryPages` is not used,
     because its `prepare` loads each event with its file chunks.
   - Each storage list asks for at most four stored events. A queued task
     ends its page after a fixed step count or a fixed number of loaded
     bytes, whichever comes first. Reason: a file event below the
     descriptor threshold is stored whole, and that threshold is 1 MiB
     before the memory plan and 4 KiB after it.
   - It skips each stored file descriptor without its chunks. Only file
     events are stored as descriptors, and a descriptor has no event type.
     Markers, port reports, skill reports, and workspace records are
     always stored inline.
   - The newest skills event can also come from the index key
     `chat:v1:history-index:skills` when the history index is ready through
     the cutoff. Otherwise the scan finds it.
   - Each item stops at its newest full report event. A failure also stops
     at the marker that started its repair. The cause of the record names
     that marker by stream and runner event number.
   - A failure kind whose record is not `failed` needs no notice scan.
     The newest port event and repository still need recovery.
   - An item that stays open reads to the start of the history. Then "no
     port event" is a complete answer, not a cap.
   - New transactions keep the live part after the cutoff, as call 2
     says. The last task joins the two parts. A live result wins for each
     item that a live event settled.
   - The last task checks that the mark still names the same cutoff. It
     checks that each record that bounded the scan is the same record, or
     that a live change settled its kind. Then it sets the complete mark.
   - A write of a previous Worker drops the mark, so the recovery starts
     again from a new cutoff.
   - Each waiting read then makes its reply in one final chat-queued view,
     as calls 7 and 8 say.
   - When the request of a waiting read fails, the app uses its existing
     load failure and retry. The stored progress of the recovery stays.
   Reason: no reply of this Worker leaves out the state, no tab replays
   the history, and no runner connection is needed. Cost: the first read
   of each workspace after the deploy waits for one scan. Each stop stores
   a port event, and so does each connect of a runner that reports ports.
   So the scan is short in most workspaces. At worst it reads the whole
   history once.

### The reads

7. **The workspace read.** The GET reply of the workspace takes the seed
   from the same chat-queued view as its detail and its event number,
   after any recovery that it waits for. Resume and the other ordered
   replies keep their shape. Reason: only the open of a new model uses the
   seed.
   - The ordered reply is built in `worker/chat/workspace-response.ts`,
     inside `Workspace.readChatWorkspaceResponse` of `worker/workspace.ts`.
     The detail and the event number come from one `store.read` view.
     The seed comes from the same view, behind a flag that only the GET
     of `worker/app-api/lifecycle.ts` sets.
   - The chat parses the same GET twice when it loads. Those reads also
     get the seed, and they also wait for a recovery that must run.
8. **The Files reads.** The tree and changes routes run the request gates
   first. Then they wait for any recovery, as the workspace read does.
   Then they read their list inside the chat queue. Today that is
   `new FilesState(view.files)` in a chat view, as each chat transaction
   does. After the memory plan, it is that plan's projection read over the
   `FilesStorage` of the view. The file handler of
   `worker/files/handlers.ts` has no chat handle today, so the route gets
   the read from the chat backend, as the workspace read does. The same
   view gives the cutoff, the failed repair of that list, and the
   repository.
   - Each reply keeps its root body and its status, and adds `stateRead`.
   - An authorized 503 `file_unavailable` for a missing list also carries
     `stateRead`, so the store can start after it and wait for the first
     report.
   - `invalidFileResponse()` stays the separate 502 case. It uses the code
     `file_unavailable` too, so the app tells the two apart by the status
     and by `stateRead`, not by the code.
   - No network, auth, or parse error gives a cursor.
   - The output filter stays. The queue holds no provider or runner I/O.
   Reason: the standalone queue of `FilesState` is not the chat queue, so
   a cutoff from a second read could disagree with the list.

### The app

9. **A new model.** A model whose stream has applied no event opens in
   this order when its read has a seed:
   - The detail applies.
   - The stream gives the seed to each subscriber through one baseline
     call: the header notices, the tool events, and the skill lists.
   - The stream sets `last` and its replay progress to the cutoff
     together, and opens its socket after the cutoff.
   - The stream is `WorkspaceStream` of `src/app/events.ts`, not the chat
     stream of the same name. It gets one new method that checks that no
     event has applied and sets `progress` with `last`. The baseline call
     goes in `openVisit` after `confirm(read)`, not in `follow()`, because
     the failed-read path also calls `follow()`.
   The stream adds no event and counts no reconnect. An open that a close
   or a newer open replaced seeds nothing. A Resume reply seeds nothing. A
   read without a seed comes only from an older Worker, and the stream
   then starts after event 0, as today. A failed read keeps the existing
   behaviour of the open, also its replay after an Archive or a Restore
   during the read.
10. **Kept stores.** A kept model resumes from its own complete cursor,
    also when its new read is newer. Its stores keep their revokes, their
    notices with Dismiss, and their read marks. No read moves a kept stream
    or store past an event whose state that read does not replace. Reason:
    a kept store holds state, such as each revoke, that no read gives.
11. **Other parts of the stream.** The GitHub adapter subscribes after
    the stream starts, when the detail shows. At a seeded start it gets one
    history message with no event at the cutoff, as a subscriber after a
    replay with no GitHub event does today. `GitHubStore` keeps its stored
    and fresh reads and their order. The Mac bar keeps its own first read,
    so it needs no replayed `workspace.updated`. The read marks, the bar
    controls, and `RepositoryChange` read `last`, which then equals the
    cutoff. The Terminal tool, the services store, and the files preview
    store keep their own reads.
    - `WorkspaceSkills` takes the seeded skills event as the newest one.
      Before the seed applies, its lists stay `loading`, as before the
      first replayed report today.
12. **The Preview list.** A seeded new tab gets no revoke before its cutoff.
    The list read leaves out revoked and expired previews, so it needs
    none. The first list read of a new store starts after the seed
    applies. If it started before the seed, the store reads the list again.
    A revoke after the cutoff stays kept and wins over a later list reply.
    The legacy and read-failure replay paths keep their existing list read
    and revoke handling.
    Reason: a list from before a revoke at or below the cutoff would show
    a revoked preview again.
13. **A new Files store.** A new store starts both reads. When both give
    cutoffs, it starts the stream after the smaller one. An authorized
    503 `file_unavailable` with `stateRead` also gives a cutoff.
    - The stream starts after the smaller of the two cutoffs.
    - Each list keeps an event floor: its read cutoff, or the number of
      the newest event that set it.
    - An event at or below the floor of a list changes nothing in that
      list. Each event still counts for the order of the stream.
    - A reply replaces a list only when its cutoff is above the floor.
    - The failed repairs and the repository start from each read.
    - A repository change between the two cutoffs marks only the list of
      the older read as a list of the old folder.
    - A failure without a cutoff keeps its error and Try again. It starts
      the existing replay recovery from event 0 for a new store. Each
      successful list keeps its floor, so older replay events cannot
      replace it. The other list continues to update, and stream reports
      can fill the failed list. No failed read supplies a false cutoff.
    - A recognized older-Worker reply without `stateRead` also uses that
      replay path. This includes an authorized 503 `file_unavailable`.
    - A later retry takes its own cutoff. It never borrows the cutoff of
      the other list. The socket keeps its complete replay progress.
    - A kept store resumes from its own cursor.
14. **The protocol split.** On 23 November 2026, `chat-and-events.md` has
    247 lines, under the target of 250. The new requirements of Milestone 1
    pass the target. So Milestone 1 moves its Events section to a new
    page, after the memory plan's edit of that section. A short Events
    section with a link stays, so that each link to that anchor still
    works.

## Milestone 1: Documentation and protocol

Depends on: [PR #477](https://github.com/Firna-AI/conductive/pull/477)
merged by Cal, and `main` merged into this branch after it. The final pull
request of the memory plan merged into `main`, and Cal's signal to start.

The protocol docs state the requirements and Decision 1 for the work
below. Code READMEs change with the code in later milestones.

- [x] Confirm that Cal merged PR #477. Merge `main` into this branch with
      the `git-merge` skill.
- [ ] Confirm that the final pull request of the memory plan merged and
      that Cal gave the signal. Merge `main` into this branch with the
      `git-merge` skill.
- [ ] Create `docs/protocol/workspace-events.md`. Move the Events section
      of `chat-and-events.md` to it, with the lines of PR #477 and of the
      memory plan. Keep `## Events` in `chat-and-events.md` with one link
      line.
- [ ] In the new page, state these requirements:
  - [ ] A new tab and a reload get the current state of a workspace from
        reads. Each stream starts after the event number of its read.
  - [ ] The workspace read gives the newest port list, or no report, the
        newest skill lists, or no report, and each open failed repair of
        the name, the start steps, and the port list, with the time of its
        first failure.
  - [ ] Each Files read gives its list, its failed repair, and the
        repository at its own cutoff.
  - [ ] Each read gives this state with its cutoff. It never leaves the
        state out to answer sooner.
  - [ ] A read failure without a cutoff keeps the existing replay recovery.
        It does not stop updates of another Files list.
  - [ ] A failure keeps its first time until a full report of its kind, or
        until its repair ends. The null list of a stop ends the notice of
        the port list. A later failure then shows with its own time.
  - [ ] A return to a kept workspace gets only the events after its own
        last event.
  - [ ] Older Mac apps keep the full replay, and the Worker keeps serving
        it, with the bound of each connection.
  - [ ] Decision 1 stands next to its requirement, with A and C and the
        reasons that rejected them.
- [ ] Link the new page from `lost-workspace-updates.md`, where it says
      when a notice clears, and from `skill-mentions.md`, where it says
      that each tab gets the latest skill report.
- [ ] Add the new page to `docs/architecture/protocol-docs.md` under Chat
      and events.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Read each public guide under
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact. Name the result in the commit message.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: Worker read state and workspace seed

Depends on: 1

The Worker keeps the read state in each transaction. It rebuilds the read
state for older workspaces and after a rollback, before its reads answer.
The GET reply of the workspace adds the seed. The app ignores the new
member, so the product works as before.

- [ ] Add the read types of call 1 to `src/shared/`. Add the optional
      `seed` to the ordered workspace reply type. Keep each reader of a
      reply without `seed` working.
- [ ] Add the read-state projection of calls 2 and 3 to
      `ChatTransaction.emit` and `ReportRepairs.remove`, under a new
      versioned `chat:v1:` key. Keep the memory plan's rule that a file
      event is not copied, and keep the update beside the summary update.
- [ ] Add the continuity mark of call 5 to `ChatTransaction.finish` and
      `ChatMetadata` in `worker/chat/store-metadata.ts`. Keep the record
      readable by the previous Worker.
- [ ] Add the shared recovery of call 6. Run each page in its own queued
      task, with a stored continuation and a fixed-size accumulator.
- [ ] Confirm that each full file report removes the repair record of its
      kind in its transaction. The recovery skips file descriptors only
      under this rule. Add the case to `runner-repairs.test.ts` when no
      test covers it.
- [ ] Add the seed to the GET reply of call 7. The reply waits for the
      recovery outside the chat queue when one must run. Keep Resume and
      the other ordered replies as they are.
- [ ] Add tests at the lowest level that fails without the change. Use
      `worker/chat/runner-repairs.test.ts`, `worker/chat/runner-ports.test.ts`,
      a new unit test of the read state beside
      `worker/chat/history-session-index.test.ts`, and
      `worker/chat/integration/workspace-resume-response.test.ts`.
      `worker/chat/integration/chat-read-state.test.ts` tests the read marks
      of members, so it is not the home of these cases:
  - [ ] The port event, the skills event, and each failure match the
        cutoff after a commit, a rolled-back transaction, a crash, and an
        eviction.
  - [ ] A failed skills repair gives the seed its `skills.updated` event
        with null lists, and no notice.
  - [ ] A resent runner event adds no second failure.
  - [ ] A full report ends only the window of its kind.
  - [ ] A name report that changes nothing ends the name notice.
  - [ ] A refusal after the null list of a stop shows its own first time.
  - [ ] A recovery of an older workspace gives the first time of each open
        failure and the newest skills event, and it reads no file chunk.
        Cover file descriptors of 1 MiB and of 4 KiB.
  - [ ] No storage list of the recovery asks for more than four events.
  - [ ] A read after a write without the mark waits for the recovery and
        then gives the seed. No reply leaves the seed out.
  - [ ] A runner receipt commits between two pages of a recovery, and the
        seed includes it.
  - [ ] An eviction during a recovery resumes from the stored page. A write
        without the mark during a recovery restarts it.
- [ ] Update `worker/chat/README.md` with its "Skill lists" section,
      `worker/chat/report-repairs.md`, `worker/chat/history.md`, and the
      socket text of `worker/lifecycle/workspace-object.md`.
- [ ] Update `src/shared/README.md` and each shared contract guide that
      lists the workspace reply or the Files replies, for the new types.
- [ ] Update the Rules of `worker/app-api/README.md` and the "Browser
      routes" of `worker/lifecycle/routes.md`, which describe the ordered
      GET and Resume replies.

## Milestone 3: Worker Files read cutoffs

Depends on: 2. The memory plan merged before Milestone 1, so this
milestone uses its projection read. It does not depend on the plan for
runner file report limits, because `stateRead` is a separate member. When
that plan merges first, this milestone merges `main` first.

The tree and changes routes give their cutoff, their failed repair, and the
repository. The app ignores the new member, so the product works as before.

- [ ] Merge `main` first when the limits plan merged. Read the lists
      through the memory plan's projection read over the `FilesStorage` of
      the chat view. Parse no private key.
- [ ] Give the file routes a read through the chat backend, as call 8
      says. Read the tree and the changes inside the chat queue. Take the
      cutoff, the failed repair, and the repository from the same view.
- [ ] Add `stateRead` to both replies and to the authorized 503
      `file_unavailable` body. The routes wait for the recovery when one
      must run, after the request gates. Keep the root bodies, the 503
      status, and the 502 `invalidFileResponse()`. Keep each optional field
      of the list bodies unchanged.
- [ ] Keep the request gates and the output filter. Hold the queue for no
      provider or runner I/O.
- [ ] Add tests in `worker/features/files-routes.test.ts`, and the gate
      and 503 cases in `worker/files/handlers.test.ts`:
  - [ ] The cutoff, the list, and the failed repair come from one view
        while a runner report commits beside the read.
  - [ ] A 503 for a missing list carries `stateRead`.
  - [ ] A read during a recovery waits for it, and then carries
        `stateRead`.
  - [ ] The gates and the output filter refuse and filter as before. An
        unauthorized request starts no recovery.
- [ ] Update `worker/files/README.md`.

## Milestone 4: App workspace seed

Depends on: 2

A new model starts its stream after the cutoff of its read, and each part
of the stream takes the seed. The full replay stays only for a reply
without a seed, from an older Worker.

- [ ] Parse `seed` in `readOrderedWorkspaceResponse`. Keep a reply without
      it valid.
- [ ] Add the baseline call to `WorkspaceStream` of `src/app/events.ts`,
      and the order of call 9 to `WorkspaceModel.openVisit`, after
      `confirm(read)`, with its generation checks.
- [ ] Move `HeaderNotices` to take the seeded failures with their first
      times. Keep Dismiss for each view.
- [ ] Move `ToolEvents` to keep the seeded port event and port failure.
      Keep each revoke after the cutoff.
- [ ] Move `WorkspaceSkills` to take the seeded skills event.
- [ ] Move the Preview store to the list read of call 12.
- [ ] Move `githubSubscribe` to the empty history of call 11. Keep the
      stored and fresh reads of `GitHubStore` and their order.
- [ ] Keep the kept models and stores on their own cursors, as call 10
      says.
- [ ] Move the development fake and `src/test-support/` to give the seed,
      and to honour the cutoff of each socket. The workspace routes are
      `src/test-support/fake-workspace-routes.ts`, which answers event 0
      today, `src/app/dev/workspace-routes.ts`, and
      `src/shell/workspace/dev/dev-first-start.ts`. The socket fake is
      `src/test-support/fake-events.ts`, with `src/app/test-kit.ts` and
      `src/shell/workspace/kept-test-kit.tsx`.
- [ ] Add tests at the lowest level that fails without the change. Use
      `src/app/events.test.ts`, `workspace-open.test.ts`,
      `workspace-order.test.ts`, `workspace-read-marks.test.ts`,
      `workspace-restore-visit.test.ts`, and `replay-socket.test.ts`:
  - [ ] The socket opens after the cutoff, and the seed applies before
        the first event.
  - [ ] An event between the read and the socket arrives once.
  - [ ] A page, a gap, and a reconnect after a seeded start lose nothing.
  - [ ] A close while the read waits seeds nothing and opens nothing.
  - [ ] An Archive or a Restore during the read keeps its floor.
  - [ ] `last` and the read marks equal the cutoff after the seed.
  - [ ] A reply without a seed, as from an older Worker, replays from
        event 0.
- [ ] Add the cases to `HeaderNotices.test.tsx`, `tool-events.test.ts`,
      `workspace-skills.test.ts`, `github-events.test.ts`,
      `previewsState.test.ts`, `KeptWorkspace.test.tsx`,
      `WorkspaceMacBar.test.tsx`, and the bar control tests
      `src/github/barActions.test.ts`, `barReady.test.ts`, and
      `rememberedAccess.test.ts`:
  - [ ] A seeded notice keeps its first time, and Dismiss hides it.
  - [ ] The `/` list shows the seeded skill lists, and null lists show
        as unavailable.
  - [ ] A list read that started before the seed cannot show a revoked
        preview.
  - [ ] `GitHubStore` reads its stored and fresh state with an empty
        history.
  - [ ] A kept return resumes from its own cursor and keeps its revokes.
- [ ] Update `src/app/README.md`, `src/app/data-lifecycle.md`,
      `src/app/dev-fake.md`, `src/shell/workspace/README.md`,
      `repair-notices.md`, `kept-workspace.md`, `development-page.md`,
      `screen-parts.md`, `src/github/README.md`, `src/chat/device/README.md`,
      `src/previews/README.md`, and `src/test-support/README.md`.

## Milestone 5: App Files reads

Depends on: 3, 4

A new Files store starts its stream after the cutoffs of both its reads.
This milestone waits for Milestone 4, because both change the development
fake and the socket fixtures of `src/test-support/`.

- [ ] Parse `stateRead` in the Files client, also from the 503 body.
      Tell the 503 from the 502 by the status, because both use the code
      `file_unavailable`. Keep each optional field of the limits plan.
- [ ] Move `WorkspaceFiles` to the order of call 13.
- [ ] Replace `treeFromStream` and `changesFromStream` with the event
      floors in `files-sync.ts`. Delete the two flags.
- [ ] Seed the failed repairs and `RepositoryWatch` from each read.
- [ ] Keep replay recovery for older-Worker replies and failed reads
      without a cutoff. Keep each successful list's floor during it.
- [ ] Move the development fake of the file routes to give `stateRead`:
      `src/test-support/fake-tool-routes.ts` and
      `src/files/dev/dev-fixtures.ts`.
- [ ] Add tests in `src/files/model/`: `files-store.test.ts`,
      `files-repairs.test.ts`, `files-moved.test.ts`,
      `files-refresh.test.ts`, and `files-unavailable.test.ts`:
  - [ ] Both reply orders with different cutoffs give the same lists.
  - [ ] A late reply below a floor changes nothing.
  - [ ] A full tree, an unavailable mark, and a failed repair start from
        the reads.
  - [ ] A repository change between the cutoffs marks only the older list.
  - [ ] A new runner stream at revision 1 still replaces the tree.
  - [ ] An authorized 503 with `stateRead` for one missing list counts as
        its cutoff.
  - [ ] A network failure of one read keeps the other list live. Replay
        reports can fill the failed list without a manual retry.
  - [ ] An aborted read gives no cursor.
  - [ ] An older-Worker success or authorized 503 without `stateRead`
        replays from event 0.
- [ ] Update `src/files/README.md`, `src/files/store.md`, and
      `src/files/development.md`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5

- [ ] Run the early checks first: `npm run format:check` and
      `npm run lint`.
- [ ] Run the targeted tests of Milestones 2 to 5.
- [ ] Save the failure that each new test showed before its code, and the
      run time of each new test, under
      `.context/new-tab-workspace-state-reads/`.
- [ ] Run each new asynchronous test 10 times. Save the pass counts in the
      same folder.
- [ ] Run one stress proof with a long history and large file reports.
      Show that a normal new tab asks for no stream from event 0, and that
      an older client still replays within the 8 MiB bound of PR #477.
      Show that the recovery loads no file chunk and keeps a fixed memory.
      Measure the wait of the first read after the deploy. Save the result
      under `.context/new-tab-workspace-state-reads/`. Add no timing or
      heap test.
- [ ] Smoke-test with `npm run dev`: a new tab, a reload, a kept return,
      the failed repair notices, the port list after a stop, the `/` skill
      list, and both Files lists. Save a screenshot under
      `.context/new-tab-workspace-state-reads/`.
- [ ] Commit with Conventional Commits and push the branch. CI runs the
      complete gate, as Cal said on 23 November 2026, so the orchestrator
      runs no local `npm run check`. The plan changes no Cargo file, so the
      Rust checks run only if one changes.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives Decision 1 and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. It names no breaking
      change: each new member is optional, and the full replay stays.
      Report it to Cal. Cal merges it after the checks of its head pass.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, open a workspace with a long history in a new tab
      on `conductive.build`. Check that both streams start after their
      read cutoffs, and that the notices and the lists match an older tab.
