# Changes deltas

Status: Active. On branch `calummoore/changes-list-deltas-aedi`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today the runner sends the complete branch changes list after each agent edit.
The workspace Durable Object joins its parts, stores it, saves it in the chat history, and sends it on each browser socket.
So the cost of each edit grows with the size of the list.
This change makes the runner send only the differences of the list, a changes delta, after each edit.
Each current tab gets the delta.
Each older tab and older Mac app gets the complete list under the same event number, as today.
The goal is that the cost of each edit no longer grows with the list size, so that a later change can raise or remove the limit.

This change does not change `FILE_CHANGES_REPORT_MAX_FILES` or the limit text of the docs.
Change A owns them, in the workspace "truncation question", branch `calummoore/truncation-question-lbd6`.
It also does not bound the costs that come with each read, connect, or draw, as "Costs that still grow" below says.

Contract owners:

- [File reports](../docs/protocol/file-reports.md), the report requirements.
- [Lost workspace updates](../docs/protocol/lost-workspace-updates.md) and [Agent runner](../docs/protocol/agent-runner.md).
- [Chat history](../docs/protocol/chat-history.md) and [Workspace events](../docs/protocol/workspace-events.md).
- [Automatic deploys](../docs/automatic-deploys.md), for the two-step rollout.
- The [runner file reports guide](../runner/file-reports.md), the [event limits guide](../runner/event-limits.md), the [Worker files README](../worker/files/README.md), and the [report repairs guide](../worker/chat/report-repairs.md).

Replaced ways: none. The full list stays for older runners, older readers, each connect, and the cases below.

## History

- **Cal, 20 November 2026, decision M4 = F:** limit the changes report to 1,000 files (commit `d0801ded8`). Changes deltas were option C then. They were rejected only as too large, because they change the runner, the Worker, the browser, and the protocol. The plan of that change is at commit `7d89b5a7e`, `plans/runner-file-report-limits.md`. It measured, at 1,000 files, about 27 ms of Worker CPU, 59 rows written, and 0.11 MB of history growth for each agent edit.
- **Cal, 26 November 2026:** first A, raise the changes limit to about 5,000 files, in its own change. Then B, changes deltas, as this separate change.
- An estimate of the brainstorm with test paths: at 5,000 rows, a full list is about 0.56 MB on each socket for each edit. A one-row delta is about 0.4 KB. The brainstorm report is `.context/changes-deltas/brainstorm-report.md`.

## Decisions

### 1. Each edit sends the whole changes list

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `crates/cnd-runner/src/reports/files.rs:184`, `worker/chat/runner-receipt.ts:165`, `worker/chat/browser-tabs.ts:107`, and `src/files/model/files-sync.ts:207`.
- **Background:** The runner, the Worker, the history, and each socket handle the whole list after each edit. A tab opens up to three sockets for a shown workspace. Since the first release, older readers ignore each file event type that they do not know (`src/files/api/parse-events.ts:31`). The event socket sends only `after` (`worker/chat/sockets.ts:48`). No version check exists between the Worker and the Mac app.
- **Problem:** The cost of each edit grows with the list size. Deltas alone do not reach older readers. Those readers would then show an old list with no error.
- **Impact if no action:** With change A, each edit costs about five times more than today. A later change cannot raise or remove the limit safely.
- **Root question:** How does each edit reach the workspace and each open tab at a cost that does not grow with the list size, while older runners, older Mac apps, older tabs, and the previous Worker keep working, and no tab loses, repeats, or reorders an update?
- **Options:**
  - **A.** Checkpoints for every tab. Every socket gets each delta and a full list at the end of each turn. Older copies lag during a turn, and every socket pays one full list for each turn. Effort: Large.
  - **B.** One stream, two forms. Current tabs ask for deltas with a parameter on the event socket. Every other socket gets the complete list under the same event number. Older copies cost as much as today until they update. The rule "every open tab gets the same events" gets one exception. Effort: Large.
  - **C.** Full lists for every tab while an older tab is open. This keeps the same-events rule. One older Mac app that stays open keeps today's cost for every tab of its workspace, and a socket connect then writes an event. Effort: Large.
- **Left out:**
  - The Worker rebuilds full lists from the deltas for the history and the tabs. It fails the goal, because the history and each socket still pay for the whole list.
  - Every tab gets only deltas, and older copies are told to update. It breaks the requirement that older Mac apps keep working.
  - An existing event makes older tabs read the list again. The only such event empties Changes and marks the tree unavailable (`src/files/model/files-store.ts:169`).
  - Each edit sends a small signal, and tabs read the list in pages. Deltas cost as little or less for each edit.
  - The Worker computes the deltas from full lists. It conflicts with Cal's decision, and the runner bytes still grow with the list.
  - Change nothing. It fails the goal.
- **Wider fix:** B. It keeps the handling of older readers in one place, the edge of the Worker.
- **Previous examples:** The tree deltas, `files.changed`, with the same revision and repair rules. The bucket layout shipped with a reader release first (`worker/files/README.md:56`). The `completeToolDetails` offer uses the hello and the welcome.
- **Recommendation:** B. Only B makes each edit cost only the changed rows for current tabs, while older copies keep a live Changes panel.
- **Answer:** **Cal, 26 November 2026: B.**
- **Options check, 26 November 2026:** the options are complete, and B stays the best. Two more approaches stay out. Compressing the full list fails the goal, because each edit still costs the whole list. Throttling the full lists of older sockets brings back the lag that Cal rejected on 20 November 2026. The paged-read approach would also need the older-reader handling of B. The report is `.context/changes-deltas/options-check.md`.

### 2. Refuse a delta that breaks the contract

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/files/runner-reports.ts:55` and `:177`.
- **Background:** The Worker refuses a full changes list whose summary does not count its listed rows, or which holds a path twice. A refused report asks the runner for one full list, as decision 96 says. A new event, the delta, needs its own checks. The repository rules say that a new rejection needs Cal's approval.
- **Problem:** A delta can break the contract in ways that a full list cannot: a remove of a path that the list does not hold, an `index` out of order or outside the new list, no stored list at all after a repository move, or a summary that does not match the rows after the delta.
- **Impact if no action:** The Worker cannot keep a correct list after a broken delta. A plain error closes the runner connection, and each resend fails in the same way (`worker/files/README.md:107`).
- **Root question:** What does the workspace do with a delta that does not fit the list that it holds?
- **Options:**
  - **A.** Refuse it, store a refusal marker, and ask for one full changes list, as for a tree delta. A failed repair then shows the existing notice. Effort: Small.
  - **B.** Check only the revision, and apply the rest as well as it can. A broken delta then gives a wrong list until the next full list, at the latest at the next connect. Effort: Small.
  - **C.** Check only the structure of the delta. The Worker computes the summary itself and replaces the summary of the runner. A summary bug of the runner then stays hidden. Effort: Small.
- **Left out:** Drop the delta and ask for a full list without a refusal marker. The repair flow and its failed-repair notice need the marker, so A is better on every point.
- **Wider fix:** A. One rule then covers each kind of report: a report that breaks the contract is refused and repaired.
- **Previous examples:** The tree delta refusal and its repair, decision 96.
- **Recommendation:** A. It reuses the repair that the tree delta has, and no tab shows a wrong list.
- **Action:** ask the user, because the recommended option adds a new refusal, which the repository rules reserve for Cal.
- **Answer:** **Cal, 27 November 2026: A.** Cal approved the plan the same day.

## Design

Each call below is marked as the orchestrator's call, dated 26 November 2026, unless it names Cal.
The brainstorm report gives the checked facts behind each call.

### Agreement and rollout

- **Orchestrator call:** The runner offers deltas with an optional `changesDeltas: true` in its hello. The workspace accepts with `changesDeltas: true` in its welcome. The protocol version stays 2. Reason: `completeToolDetails` and `services` work this way, and a new protocol version locks a new runner out of the previous Worker (`crates/cnd-runner-interface/src/runner_handshake.rs:180`).
- **Orchestrator call:** The runner chooses the form of each changes report when it emits it, with the flag of the latest welcome. Each connect still starts with a full list. Reason: the outbox keeps each emitted event unchanged across resends.
- **Orchestrator call:** The rollout takes two releases. Reason: the two-PR rule of `migrations/README.md` for stored data that the previous Worker cannot read, as the provider switch also does (`docs/automatic-deploys.md:213`).
  - This pull request is the compatibility release. It holds all the code: the runner offer, the Worker that applies, stores, replays, and sends deltas, and the browser that asks for them. The Worker variable `CHANGES_DELTAS` is `"off"` in `wrangler.jsonc`, so no welcome accepts deltas yet.
  - Activation is a separate pull request that sets `CHANGES_DELTAS` to `"on"`. Merge it only after the compatibility release has been live for at least one hour.
  - After activation, do not roll back past the compatibility release. A Worker from before it cannot replay a large stored delta (`worker/files/parsers.ts:184`), and it would keep the delta in the history.
  - Reason: a rollback of the activation to the compatibility release stays safe. That Worker still applies a delta that the runner resends from its outbox, and its next welcome makes the runner send full lists again.
- **Orchestrator call, from the options check:** In the compatibility release, the history reader passes a stored file event of an unknown type through, as it already does for an inline event (`worker/chat/history-storage.ts:70`). Reason: a later file event type then needs no rollback rule against this release.
- **Not chosen:** one release with no switch, which keeps the rows of a delta in the history only while the event stays inline. It adds a third stored form. A variable with a list of org IDs is also not chosen, because it adds no rollback safety.
- The pull request description says that its merge does not turn deltas on. This pull request holds the whole implementation, and the activation pull request holds one value.
- **Orchestrator call:** The compatibility release always accepts a valid `changes.changed` event from the runner. The variable controls only the welcome. Reason: after a rollback of the activation, an outbox can still hold deltas.

### The delta

- **Orchestrator call:** A new runner event `changes.changed` and a new browser event of the same name carry one `delta`. Reason: older Workers and readers would take partial rows in `changes.updated` as the whole list.
- **Orchestrator call:** The delta has the next changes revision and the complete header of the new list: `baseBranch`, the masked `displayBaseBranch` that the filters add, `unpushedCommits`, `uncommittedFileCount`, `summary`, and `omitted`. Reason: a complete header costs little and needs no rule for absent fields. The `summary` still counts only the listed rows.
- **Orchestrator call:** The delta has `removes`, a list of paths, and `upserts`, a list of rows. Each upsert gives `index`, its place in the new list. The reader removes each removed path and each upserted path, then inserts the upserts in ascending `index`. Reason: the runner sorts the kept rows by path with ICU English collation (`crates/cnd-runner/src/reports/selection.rs:59`). A reader in another ICU version cannot repeat that order exactly.
- **Orchestrator call, corrected by the options check:** The runner upserts each listed row whose fields changed. A content edit with no field change gives a delta with no rows, which carries only a new header. Reason: the tree delta of the same scan already upserts or removes each edited path (`crates/cnd-runner/src/reports/updates.rs:156`), and that makes each open file and diff of the path read again (`src/files/model/files-invalidation.ts:13`).
- **Orchestrator call:** A delta holds at most 512 removes and upserts, `FILE_CHANGES_DELTA_MAX_CHANGES`, and fits the 256 KiB event budget. A larger update goes as one full list, never as split deltas. Reason: the header must match the rows after each event.
- **Orchestrator call:** A change of the base commit or of the base branch sends one full list. Reason: each listed diff can change with no row change, and a full list makes each reader read each listed diff again. Such changes are rare.
- **Orchestrator call:** The runner selects the listed rows from the complete scan as today. It compares them with the rows of the last emitted report of this connection. A row that leaves the list, also because of the limit, is a remove. An edit of only omitted files gives a delta with no rows and new omitted totals. Reason: "Which changes stay" in the protocol is unchanged.

### Worker checks, storage, and repair

- **Orchestrator call:** The Worker applies a delta only at the next changes revision of the stream, and only when no full changes list is incomplete. Reason: the tree delta has the same rule (`worker/files/runner-reports.ts:177`).
- **Cal, 27 November 2026, decision 2 = A:** The Worker refuses a delta that breaks the contract: a revision that is not the next one, no stored changes list, such as after a repository move (`worker/files/storage.ts:194`), a remove of a path that the list does not hold, an `index` that is not ascending or not inside the new list, a repeated path, or a `summary` that does not equal the totals of the listed rows after the delta. A refused delta asks the runner for one full changes list, as decision 96 says.
- **Orchestrator call:** A delta is never a replacement, and it never ends or fails an open repair. Reason: the tree delta has the same rules.
- **Orchestrator call:** The projection keeps its 64-bucket layout. A delta reads and writes only the touched buckets, the order text, and the manifest. The changes manifest gains an optional `revision`. A list without it has an unknown revision. Reason: no migration, and a previous Worker that writes a full list leaves the field absent.
- **Orchestrator call:** The history keeps the newest full changes list and the newest delta after it. A new delta deletes the earlier delta. A new full list deletes both. Reason: the history keeps only the newest changes list today, because earlier lists fill it (`docs/protocol/chat-history.md:13`). The history then also keeps an older full list beside the newest delta, so Milestone 1 checks the Privacy sentence "It keeps the last file list and the last summary of changes". A change of that sentence waits for Cal, as `plans/follow-ups/privacy-omits-kept-tree-deltas.md` says for the legal pages.
- **Orchestrator call:** The runner filter and the workspace output filter mask the labels of each delta row, as for `changes.updated`. Reason: the filter selects by event type (`src/shared/output-fields.ts:195`).
- **Orchestrator call:** A refused delta gets a refusal marker of its own type, and the repair maps it to the changes list. Reason: older apps show nothing for a marker without a session.
- **Orchestrator call:** Only the combined integration of the chat backend accepts deltas. The standalone integration keeps complete reports. Reason: production uses the combined integration.

### Two forms at the edge of the Worker

- **Orchestrator call, the wider fix of decision 1 from the options check:** A socket of a current tab names the event forms that it reads with the parameter `forms=changes.changed` on its `/events` address. An older Worker ignores it. The edge gives each socket the older form of each form that the socket does not name. Reason: the socket address is the only place that a tab can declare its forms before its replay starts, and a later form then adds one value and one mapping, not a new parameter.
- **Orchestrator call, from the options check:** The socket attachment keeps the forms of each socket, so a socket that a woken object restores keeps them (`worker/native-sockets.ts:30`).
- **Orchestrator call:** A socket that does not name the form gets each `changes.changed` event as a `changes.updated` event with the complete list and the same event number. The Worker builds that list from the projection in the same chat-queue task that applies the delta, once for each event, only while such a socket is open. Reason: the projection then equals the list at that event.
- **Orchestrator call:** In a replay for a socket that does not name the form, the newest stored delta goes as the complete list from the projection, when the projection holds that revision. Otherwise, such as after a repository move, the replay leaves the event out. Reason: the history holds no earlier delta, and the replays already leave out deleted events.
- **Orchestrator call:** The changes read and each full list in the browser carry the optional `revision`. A tab applies a delta only at the next revision of its list. After a gap, or with an unknown revision, it reads the list again. Reason: the tree works this way (`src/files/model/files-sync.ts:150`).
- **Orchestrator call:** A delta marks as touched each path of its removes and upserts, with the previous path of each rename. A full list still marks each path of the old and the new list. Reason: the base change sends a full list, the one case that needs each listed path.

### Older runners and readers

- An older runner offers no deltas, so it sends full lists. Every reader gets them as today.
- A new runner with a Worker that does not accept sends full lists as today. This holds during each deploy and after a rollback.
- An older tab or an older Mac app gets a complete list after each edit, as today.
- **Orchestrator call:** Accept the rare case in which an older runner cannot start because its state file holds a delta (`crates/cnd-runner/src/state/store.rs:91`). Reason: each new runner event type has the same case, and it happens only after a failed start of a new release.

### Costs that still grow

These costs still grow with the list in this change: the runner scan, the full list after each connect, each Files read, the drawing of the Changes panel, and the work of each touched bucket.
**Orchestrator call:** record a follow-up item for each, except the runner scan, which the counts and omitted totals need.
Reason: the goal names the cost of each edit, and a later limit change needs these items.

## Milestone 1: Documentation and protocol

Depends on: none

State the requirements of deltas, the two forms, the history rule, the repair, and the rollout.

- [x] Update `docs/protocol/file-reports.md`: the delta event, its header, its order rule, its size limit, when a full list goes instead, the hello and welcome agreement, and the older runners and readers. Change the sentence that browser file events contain complete reports. Keep the limit text of change A as it is.
- [x] State in `docs/protocol/file-reports.md` that the runner sends a full tree and a full changes list after each connect. Delete `plans/follow-ups/full-reports-after-connect.md`, which asks for this.
- [x] Update `docs/protocol/lost-workspace-updates.md` and `docs/protocol/agent-runner.md` for the refused delta and the welcome field.
- [x] Update `docs/protocol/chat-history.md` for the newest delta.
- [x] Update `docs/protocol/workspace-events.md` with the one exception to "every open tab gets the same events": the two forms of a changes delta under one event number.
- [x] Update `docs/automatic-deploys.md` with the two releases and the rollback rule. Add the row of `CHANGES_DELTAS` to "Public variables" in `docs/deployment.md`.
- [x] Read the Terms page and the Privacy page in full, with their imported sections. Bring each sentence that restates a changed fact to Cal, with a proposed text, because a change of a legal page needs his review. Check the Privacy sentence about the last file list and the last summary of changes.
- [x] Read each guide under `src/marketing/docs/` in full. Update each sentence that restates a changed fact.
- [x] Check each relative link of each changed Markdown file.
- Note: the delta requirements live on the new page `docs/protocol/changes-deltas.md`, which belongs to File reports, so that `file-reports.md` stays near the length target.
- Note: for the length target, `docs/protocol/out-of-memory.md`, `docs/deployment/deploy-token.md`, `docs/deployment/attachment-bucket.md`, and `docs/deployment/frame-sources.md` hold moved sections, with a stub heading at each old place.
- Note: one Privacy sentence restates the history rule, in the "Your work" item of `src/marketing/privacy-uses.ts`. Its proposed text is option B of `plans/follow-ups/privacy-omits-kept-tree-deltas.md`, and it waits for Cal. No guide restates a changed fact.
- Note: nine follow-up items under `plans/follow-ups/` got the facts and the line references that this milestone moved or changed.
- Note: the link check is `.context/changes-deltas/link-check.txt`.

## Milestone 2: Wire types

Depends on: 1

Add the shared types in Rust and generate their TypeScript. Nothing sends or reads them yet.

- [ ] Add `changes.changed` with its delta types to the runner events and to the browser file events in `crates/cnd-runner-interface/`, with `FILE_CHANGES_DELTA_MAX_CHANGES`.
- [ ] Add the optional `changesDeltas` to the hello and the welcome, and the optional `revision` to `ChangesResponse`.
- [ ] Add wire cases for absent fields, a delta with no rows, and a full delta.
- [ ] Run `cargo run -p cnd-runner-interface --example export_bindings`. Commit the generated files without hand edits. Mirror the constant in `src/shared/files.ts`.
- [ ] Run `cargo test -p cnd-runner-interface` and `npm run typecheck`.

## Milestone 3: Worker applies and stores deltas

Depends on: 2

The Worker accepts, checks, stores, and repairs deltas. Its welcome reads `CHANGES_DELTAS`, which stays `"off"`.

- [ ] Parse `changes.changed` in the runner input and check its event limits.
- [ ] Apply a delta at the next changes revision only. Write the touched buckets, the order text, and the manifest with its `revision`. Write the `revision` with each full list too.
- [ ] Refuse a delta that breaks the contract, and ask for one full changes list, as decision 2 says. Map the refusal marker to the changes list.
- [ ] Mask the labels of each delta row in the workspace output filter.
- [ ] Keep the newest delta in the history beside the newest full list, and parse a stored delta in the history pages. Pass a stored file event of an unknown type through the history reader.
- [ ] Return the `revision` from the changes read.
- [ ] Add `CHANGES_DELTAS = "off"` to `wrangler.jsonc` and the binding types. Accept in the welcome only when it is `"on"` and the hello offers deltas.
- [ ] Test the next-revision rule, each refusal, the repair, the history replacement, the masking, and a rollback that resends deltas to a Worker with the variable off.
- [ ] Update `worker/files/README.md` and `worker/chat/report-repairs.md`.

## Milestone 4: Two forms for the sockets

Depends on: 3

Each socket gets the form that it asks for, live and in replays.

- [ ] Read `forms` from the `/events` address of each socket, and keep the forms in the socket attachment.
- [ ] Send each delta to the sockets that name its form. Send the complete list, built once for each event, to each other socket.
- [ ] In a replay, send the newest delta as the complete list to a socket that does not name the form, or leave it out when the projection does not hold its revision.
- [ ] Test that both forms give the same list at each event number, live and in replays, also after the object wakes, and that no socket gets an event twice or out of order.
- [ ] Update the README of `worker/chat/` that describes the browser sockets.

## Milestone 5: Browser applies deltas

Depends on: 4

The Files store applies deltas and asks for them. The Changes panel looks the same.

- [ ] Parse `changes.changed`, and the `revision` of a full list and of the changes read.
- [ ] Apply a delta at the next revision. Read the list again after a gap or with an unknown revision.
- [ ] Mark the paths of each delta as touched.
- [ ] Add `forms=changes.changed` to the address of each event socket.
- [ ] Test the order rule, the gap, the unknown revision, and the touched paths.
- [ ] Update `src/files/store.md`, if it describes the changes updates.

## Milestone 6: Runner sends deltas

Depends on: 2

The runner offers deltas and sends them when the welcome accepts.

- [ ] Offer `changesDeltas` in the hello. Keep the flag of each welcome.
- [ ] Build a delta from the last emitted rows and the new rows, with the `index` of each upsert and the complete header.
- [ ] Send one full list after each connect, after a base change, and when a delta does not fit 512 changes or 256 KiB.
- [ ] Keep all changes events of a scan before its tree update.
- [ ] Mask the labels of each delta row in the runner filter.
- [ ] Test the delta of each kind of edit, the omitted-only edit, the limit boundary, the size fallback, the base change, the reconnect, the restart, and the resend.
- [ ] Update `runner/file-reports.md`, `runner/event-limits.md`, and `crates/cnd-runner/README.md`.
- [ ] Run the Rust checks named in `AGENTS.md`.

## Milestone 7: Measurement

Depends on: 3, 4, 5, 6

Measure the cost of one agent edit before and after the change.

- [ ] Measure one edit of one file at 1,000 and at 5,000 listed rows, with `CHANGES_DELTAS` on in a local test: the Worker CPU, the rows written, the history growth, and the bytes on each socket, for a current socket and for an older socket. Save the evidence under `.context/changes-deltas/`.
- [ ] Record the summary of the results under this milestone.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci`, `npm ci --prefix runner`, the complete gate, and the Rust checks named in `AGENTS.md`.
- [ ] Record follow-up items for the costs that still grow: bounded Files reads, a bounded full list after each connect, and a virtual list for the Changes panel.
- [ ] Record a follow-up item for the activation pull request and for a check in a live sandbox.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their dates, a permalink to this plan, the follow-up items that the change adds, and the rollback rule.

## Post-merge follow-up (non-blocking)

- [ ] Open the activation pull request, which sets `CHANGES_DELTAS` to `"on"`, after the compatibility release has been live for at least one hour.
- [ ] After activation, check in a live sandbox that a current tab gets deltas, that an older tab gets complete lists, and that a reconnect keeps the Changes panel right.
