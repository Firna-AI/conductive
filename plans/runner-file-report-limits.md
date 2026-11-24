# Runner file report limits

Status: Active. On branch `calummoore/object-memory-runner-report-limits-0m1g`, no pull request yet. Cal approved implementation on 23 November 2026. Milestones 1 to 5a are complete. Milestone 6 is in progress. The pull request that completes the work deletes this plan.

Conductive keeps the latest file tree and branch changes in each workspace's Durable Object.
One object has a 128 MB memory limit.
Large reports can exceed that limit during storage, publication, or replay.
This change implements Cal's M4 = F decision of 20 November 2026.
New runners report at most 50,000 tree entries and 1,000 changed files.
The panels show the retained lists and the omitted counts.

The workspace "mokly plan reuse editor files" had about 0.7 MB of tracked tree and a projected state of 25 to 40 MB.
Its reconnects exceeded the object's 128 MB memory limit.

The limits apply to reports, not to files on disk, Git work, or permission to read a path.
This plan does not change report frequency, add changes deltas, or exclude ignored folders under `.context/`.
The other two memory plans own history reads, projection buckets, and initial tab state reads.

Contract owners:

- [File reports](../docs/protocol/file-reports.md), the report requirements.
- [Workspace tools](../docs/protocol/workspace-tools.md#files-and-changes).
- [Agent runner](../docs/protocol/agent-runner.md#the-agent-runner).
- [Repository folders](../docs/protocol/repository-folders.md#the-context-folder).
- [File mentions](../docs/protocol/file-mentions.md) and [files in answers](../docs/protocol/file-mentions-answers.md).
- [File row menu](../docs/protocol/file-row-menu.md#add-to-chat).
- [Runner reports](../runner/file-reports.md) and [event limits](../runner/event-limits.md).
- [Runner README](../crates/cnd-runner/README.md) and [interface README](../crates/cnd-runner-interface/README.md).
- [Worker files README](../worker/files/README.md) and [app files README](../src/files/README.md).
- [Mockup catalogue](../docs/mockups/catalogue-attachments-and-files.md).
- [Public guide](../src/marketing/docs/files-and-changes.md).

## Recorded decision

Cal chose **M4 = F** on **20 November 2026**.
F combines the measurement report's B and D options.

- **B, chosen:** Keep at most 1,000 changed files. Report the count and added and removed lines of every omitted file.
- **D, chosen:** Keep at most 50,000 tree entries. Report the number of omitted entries.
- **A, rejected:** Send a changes list only once every N seconds. The Changes panel would lag.
- **C, rejected:** Send changes list deltas. This needs a Large change across runner, Worker, browser, and protocol.
- **E, not chosen:** Skip ignored folders below `.context/`. The entry limit also covers these folders and files.

At 1,000 changed files, the measured CPU cost fell from about 55 ms to 27 ms per agent edit.
Rows written fell from 82 to 59.
History growth fell from 0.43 MB to 0.11 MB per edit.
The measured heap ratios suggest less than about 45 MB for one file event with 50,000 tree entries.
That estimate uses the measured path sizes and current Worker code.
It is not a fixed heap guarantee for every repository.

Cal also requires compatibility with older runners, older Mac apps, and a rolled-back Worker.
The plan uses additive optional metadata and keeps the meaning of existing fields.
It adds no protocol version or required reader upgrade.

## Approval and execution choices

Cal wrote on **23 November 2026**: "Ok progress those plans and merge when go is green".
That message approves implementation of this plan.
Cal's stage instruction of the same date records the recommended options as execution choices under that approval:

- **Item 1 = F:** Retained Changes files and their ancestors come first. Then normal and context entries fill the rest, with up to 5,000 remaining slots for context entries. Each group lends unused capacity to the other.
- **Item 2 = B:** Uncommitted changes come first, then committed changes. Path order applies inside each group.
- **Item 3 = A:** Existing tree-based mentions use the one retained inventory. The panels state the omitted coverage. Direct path reads and attachment metadata stay usable.
- The approved caps stay: 50,000 tree entries and 1,000 changed files, with complete omitted totals.

These are execution choices under the approved recommendations, not separately typed option answers.
Milestone 1 started on 23 November 2026 with mockups only. Cal sends the next stage.

## Decisions settled by the approval

The three items below keep their option analysis.
The section above records the chosen option of each.
All three decisions use the report limits that Cal selected.
They preserve direct path reads and existing access checks.

### 1. Which tree entries stay visible?

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** docs or spec.
- **Location:** `crates/cnd-runner/src/repository/snapshot.rs:104` and `crates/cnd-runner/src/reports/updates.rs:12`.
- **Terms:**
  - **Tree entry:** One file or directory record in the inventory that All files shows.
  - **Context entry:** An entry added only by the runner's special scan of ignored files under `.context/`.
- **Background:** The runner collects repository files and ignored context files in one tree. It currently sorts paths with English collation. Directories also consume entries.
- **Problem:** The 50,000-entry limit does not say which entries remain. A context folder can consume a path prefix before most repository code appears.
- **Impact if no action:** Implementors could choose different visible files. Members could lose access through the tree to their main source folders.
- **Root question:** Which entries should stay reachable through All files, mentions, answer pictures, and Add to chat above 50,000 entries?
- **Options:**
  - **A.** Keep the first 50,000 entries in stable path order. This is simple and repeatable. Context files can fill the list. Effort: Medium.
  - **B.** Keep shallow entries first, then paths at each depth. This exposes more top-level folders but can leave folders with no listed children. Effort: Medium.
  - **C.** Keep changed files and their ancestors first, then paths. This prioritizes current work but moves entries as edits change. Effort: Medium.
  - **D.** Keep normal repository entries first, then context-only entries. Use stable path order within each group. This protects source browsing but gives context files lower priority. Effort: Medium.
  - **E.** Reserve 5,000 entries for context-only entries. Give the other 45,000 to normal repository entries. Lend unused capacity across groups. Keep path order within groups. An earlier context cache can still hide later notes. Effort: Medium.
  - **F.** Prioritize retained Changes files with their ancestors, in Changes selection order. Fill remaining capacity with E, reserving up to 5,000 remaining slots for context. This favors current work and notes, but membership follows edits. Effort: Medium.
- **Left out:** An unlimited tree fails M4 = F. Paging or folder reads belong to item 3 C, because they require another inventory. Excluding ignored context folders was not chosen by Cal. A sticky selection hides all new files once full.
- **Wider fix:** None. The count cap is already the selected fix. These options choose which entries fit it.
- **Previous examples:** The end-of-turn file list keeps a prefix of 200 unique paths in `docs/protocol/agent-runner.md`.
- **Assumptions:** Cal caps file and directory entries together. Equal source priority comes from current code, not a requirement. D, E, and F drop it. C and F drop tree selection's independence from Changes. All options keep the entry budget and directory ancestors.
- **Related:** Item 2 selects the changes that C and F prioritize. Item 3 uses this retained inventory.
- **Recommendation:** F, changed from A after the options check. It protects current work, source browsing, and some context files. E is the simpler alternative.
- **Action:** ask the user, because path coverage and priority have real product trade-offs that M4 does not settle.

### 2. Which changes stay visible?

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** docs or spec.
- **Location:** `crates/cnd-runner/src/repository/changes.rs:111` and `crates/cnd-runner/src/reports/files.rs:133`.
- **Terms:**
  - **Branch changes:** Files that differ from the branch's merge base, including uncommitted and untracked work.
- **Background:** Changes currently reports every changed file in path order. M4 keeps 1,000 files and totals for the rest. The visible rows need a selection rule.
- **Problem:** The limit alone does not choose between stable paths, larger diffs, and work still waiting for a commit.
- **Impact if no action:** The runner can hide the files that a member expects to review. Different implementations can show different subsets.
- **Root question:** Which changed files should members review first when more than 1,000 files differ?
- **Options:**
  - **A.** Keep the first 1,000 files in stable path order. Rows remain predictable, but large changes later in the order stay hidden. Effort: Medium.
  - **B.** Keep uncommitted files first, then committed changes, in path order. This favors current edits but changes membership after a commit. Effort: Medium.
  - **C.** Keep files with the largest added-plus-removed line counts first. Break ties by path. Binary files have no useful line-count rank. Effort: Medium.
  - **D.** Rank generated and binary files last, using Git attributes such as `linguist-generated`. Keep path order within groups. Add one batched attribute read per scan. Unmarked generated files still rank as normal files. Effort: Medium.
- **Left out:** An unlimited list fails M4 = F. Paging saved rows retains the full projection. Live paging belongs to item 3 C. Sampling gives no useful review priority. Folder totals do not select rows.
- **Wider fix:** None. The selected cap and omitted totals address report size. This choice sets the review order.
- **Previous examples:** The runner already orders branch changes by path in `repository/changes.rs`. The turn-file limit uses a prefix.
- **Assumptions:** Cal requires full omitted file and line totals regardless of ranking. A, B, and C use current scan data. D adds an attribute read. Changes cannot require tree membership, because deleted files have no tree entry.
- **Related:** Item 1 F gives these retained files priority in the tree.
- **Recommendation:** B, changed from A after the options check. It keeps current edits visible, with stable path order inside each commit-status group.
- **Action:** ask the user, because review priority is visible behavior that the selected limit does not define.

### 3. Which paths can mentions resolve?

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** docs or spec.
- **Location:** `src/chat/mentions/MentionsContext.tsx:163` and `docs/protocol/file-mentions.md:34`.
- **Terms:**
  - **File mention:** A repository path in chat that can become a file or folder chip.
  - **Retained tree:** The entries that remain after the runner applies its tree limit.
- **Background:** The composer list, sent chips, answer links, and answer pictures resolve paths through the tree that All files uses. Add to chat also requires an offered entry. Attached-file chips have their own message metadata.
- **Problem:** A path omitted by the limit no longer resolves through that tree. Its file still exists and can pass a direct path read.
- **Impact if no action:** A member can mistake an omitted path for a deleted file. A previous answer can lose its file chip or picture.
- **Root question:** How should chat show and open a file that exists but the retained tree omits?
- **Options:**
  - **A.** Use the retained tree for all existing tree-based mention rules. Omitted paths stay text or code. Explain the limited coverage. Direct path reads and attached-file chips keep working. Effort: Medium.
  - **B.** Keep the composer list bounded, but resolve explicit mentions through authorized path reads and a label cache. This preserves explicit chips but needs more reads and loading states. Effort: Large.
  - **C.** Add a separate paged or searchable inventory for mentions. This can find all files, but adds runner commands, routes, storage rules, and user states. Effort: Large.
  - **D.** Make explicit mentions and Markdown file links usable without a matching tree entry while the tree is limited. Let the file read check existence after a press. Pictures use their current lazy read. Inline code still requires a tree entry. Mistyped or deleted paths then open a missing-file state. Effort: Medium.
- **Left out:** An unlimited second tree defeats the memory goal. Treating a missing entry as proof of deletion is wrong. Removing direct path reads is outside M4.
- **Wider fix:** C separates discovery from a bounded panel. It is broader work than M4 and needs its own approved scope.
- **Previous examples:** Decision 214 uses the saved tree for the composer list. `file-row-menu.md` already restricts Add to chat to offered entries.
- **Related:** Item 1 selects the tree that A uses. B, C, or D requires changes in chat readers outside the named app-files area.
- **Assumptions:** Decision 214 and answer-chip decision 1 use tree membership today. B, C, and D drop that check for explicit paths. All options preserve existing inline-code checks and direct path access.
- **Recommendation:** A, confirmed by the options check when item 1 F keeps current work visible. D protects explicit chat references if Cal prefers a simple tree prefix.
- **Action:** ask the user, because preserving one inventory and preserving omitted references have real trade-offs that depend on item 1's answer.

The options check added tree options E and F, changes option D, and mention option D.
Its report is `.context/runner-file-report-limits/options-check.md`.
The recommendation changed from 1 A to 1 F, and from 2 A to 2 B.
A separate fresh check covered legacy rollout in `.context/runner-file-report-limits/legacy-options-check.md`.
That check confirmed that normal runner updates already define rollout.
The task requires acceptance of older runners, so this is a design call rather than a fourth decision.
The post-push review found that cutting legacy changes reports would lose omitted-path refresh signals.
The compatible path below therefore keeps both legacy lists complete until the runner updates.

## Design

The design below uses items 1 F, 2 B, and 3 A, as approved on 23 November 2026.

### Report contract and compatibility

- **Orchestrator call, 20 November 2026:** Keep `summary` as the totals of retained changes. The previous Worker verifies those totals against listed rows.
- **Orchestrator call, 20 November 2026:** Add optional `omitted` to `ChangesResponse`. Reuse `ChangesResponseSummary` for its `files`, `added`, and `removed` totals.
- **Orchestrator call, 20 November 2026:** Add optional `omittedEntryCount` to `RunnerFileTreePart`, `FileTreeResponse`, and `FileTreeDelta`. Count files and directories once by unique path.
- **Orchestrator call, 20 November 2026:** The new runner sends explicit zero metadata when nothing is omitted. Missing metadata means a legacy report with no claimed cap.
- **Orchestrator call, 20 November 2026:** Repeat omission metadata unchanged on every part. Publish it only with the complete report, so a pending part changes no panel count.
- **Orchestrator call, 20 November 2026:** Generate all boundary types from Rust with `ts-rs`. Keep numeric counts within the non-negative JavaScript safe integer range.
- **Orchestrator call, 20 November 2026:** Keep both legacy lists complete until the normal runner update. This preserves old clients' path refresh signals and Cal's compatibility requirement. A second legacy projection adds cost without bounding incoming reports.

The changes header and tab count show retained plus omitted file totals.
Its line totals also show retained plus omitted values.
The omission notice identifies how many files are absent from the rows.
The tree notice counts omitted entries, because the cap also counts directories.
The UI uses the actual metadata, not the configured limit, for omitted values.
The mockup milestone settles the words and placement of these notices.

Older runners can still send unlimited reports with no omission fields.
The Worker accepts them without a new size rejection.
The Worker stores and publishes complete legacy trees and changes reports.
It preserves absent omission metadata as unknown.
Both caps start with the complete reports from the new runner.
The public guide states this rollout limit and the normal update path.

The previous Worker discards unknown fields in its file parsers.
It can still join a new report because `summary` matches the retained files.
Older Mac apps also discard unknown response fields.
They keep their current rows and totals, but cannot show the new omission notice.
Reapplying the new Worker after a rollback accepts stored reports whose optional metadata was discarded.
Do not synthesize zero omission metadata when loading such a saved projection.
Only a fresh complete report can establish its missing changes totals.
An in-flight report with metadata lost across versions uses the existing repair path if its parts no longer agree.
This proposed compatibility path adds no schema migration or parallel legacy format.
Keep omission metadata in the projection metadata that the memory plan makes rollback-readable.
Do not change that plan's bucket format or repair protocol here.

### Selection, deltas, and content updates

- **Orchestrator call, 20 November 2026:** Select before filtering and splitting. Selection uses real paths, so secret masking cannot change membership.
- **Orchestrator call, 20 November 2026:** Keep every retained entry's directory ancestors inside the same 50,000-entry budget. Add a raw-path tie-break to the existing collation.
- **Orchestrator call, 20 November 2026:** Apply the changes cap in the report layer. Keep repository scans, checkpoints, and turn-file comparisons complete.
- **Orchestrator call, 20 November 2026:** Keep Git status and unpushed commit counts complete. The pull request bar must not derive local work from the truncated list.
- **Orchestrator call, 20 November 2026:** Keep the reporter's last emitted selection separate from its full scan. Compare emitted state with emitted state.
- **Orchestrator call, 20 November 2026:** Use existing removes and upserts for retained membership changes that fit one byte-bounded delta of at most 512 operations. Remove outgoing entries first.
- **Orchestrator call, 20 November 2026:** Send the new omission count in that delta. Missing delta metadata preserves the previous count. A count-only update can use an empty delta.
- **Orchestrator call, 20 November 2026:** Send a bounded full tree when a membership replacement or required path refresh cannot fit one delta. Ordinary content updates keep their existing split-delta behavior.
- **Orchestrator call, 24 November 2026, review finding 27, superseding the call above for refreshes:** A full tree replaces deltas only when the refresh-only operations of an update do not fit one delta. An operation that also edits its entry goes with the other edits and may split. Reason: every affected path still refreshes, because an edit refreshes its path in whichever delta carries it. Ordinary edits may split, as the protocol already requires. Only refresh-only no-ops exist just to make readers read again, so they must arrive as one group or as a full tree. A regression shows the two-delta case.
- **Orchestrator call, 20 November 2026:** Refresh an omitted path with a remove of that absent entry. A retained path uses an unchanged upsert. Existing readers refresh that path without growing the tree.
- **Orchestrator call, 20 November 2026:** After a base change, refresh paths from both complete changes lists that neither retained list names. Include old and new rename paths. Fall back to a full bounded tree when these touches exceed one delta.
- **Orchestrator call, 20 November 2026:** Also refresh omitted paths when complete change-row metadata changes, including rename pairing without a content or base change. Compare both source lists and include each old and new path.
- **Orchestrator call, 20 November 2026:** Compare the complete changes source before truncation. An edit confined to omitted files must still produce a changes report.

Directory ancestors consume slots before their descendants.
Compute content refresh paths from both full scans' Git and readable identities, including omitted deletions.
Each chosen selection must be deterministic, unique by path, and contain at most the chosen count.
For C or F, add an ancestor closure only when it fits the remaining budget.
Skip a priority file whose ancestor closure does not fit, then continue with entries that fit.
F prioritizes the same ordered files that Changes retains, but cannot guarantee every priority path fits the directory budget.
The directory closure rule prevents synthetic app folders from increasing the cap.
Tree marks still use the complete changes source, including files outside the 1,000 retained changes.
Changes selection does not depend on tree membership.
Deleted files can appear in Changes without a tree entry.

Worker and app parsers already accept an empty `changes` array in a tree delta.
An absent-path remove leaves retained entries unchanged and invalidates that path in existing app readers.
Milestone 2 states these requirements explicitly.
When a limited tree changes its listed entries, the whole update and its omission count share one delta only when it fits both budgets.
The refresh-only operations of an update, removes of absent paths and upserts of unchanged entries, must fit one delta together. Other edits split into deltas as before, also an edit of a path that needs a refresh.
Otherwise send one full bounded tree, rather than a partially applied membership replacement.
Preserve tree metadata while ordinary content deltas advance revisions.
Measure omitted-only edits and large replacements before the final review.
Include old app readers in the cost check. Repeated absent-path removes can scan the retained tree once per path.
Use a full bounded tree below the 512-operation ceiling when measurement shows that repeated removes cost more.
Verify that the merged bucket implementation handles an absent-path remove without loading the complete projection.

Keep the 256 KiB file-event budget and the 512-change delta budget.
The full report cap does not replace those byte limits.
Filtering can add display labels, so test masked multipart reports too.
A tree or change that fits the count cap can still span many byte-bounded parts.
The entry cap alone does not give a fixed heap cost for every path length.

### Worker, output filter, and app

Extend Worker and app readers to preserve the optional metadata.
Use existing non-negative safe integer rules for present counts and line totals.
Check that every part repeats the same omission metadata.
Keep the existing validation of retained changes summaries.
Do not infer omitted totals from partial parts. Keep reports without omission metadata complete.
Avoid a stricter legacy-report validation rule.

Carry metadata through storage reload, reconnect, unavailable marks, repair, repository moves, and response filtering.
The output filter must preserve numeric metadata while it masks display text.
The existing spread-based shared filter preserves new fields, but parser reconstruction currently drops them.
Verify the complete `filterRunnerOutput` path, not only the shared helper.

Preserve tree metadata in the app's tree model and delta updates.
Show saved omission counts while the computer sleeps or its newest scan is unavailable.
Replace old counts atomically with each new complete report.
Clear an old nonzero count when a new report explicitly supplies zero.
Do not treat a limited list as a scan failure or an empty repository.
Direct reads and diffs continue to authorize the path without requiring tree membership.

Item 3 A needs no new chat inventory or resolver.
Verify the existing mention, answer-picture, attachment, and Add to chat behavior with a limited tree.
Only change those consumers if Cal chooses B, C, or D, after the extra scope is recorded.

### Mockup results

- **Orchestrator call, 23 November 2026:** The All files notice sits at the top of the tree, and the Changes notice sits under the Changes summary. Neither scrolls with the rows. Each is a neutral row with an info icon. Amber stays for a list that is out of date.
- **Orchestrator call, 23 November 2026:** A saved limited list shows its omission notice and the unavailable or failed-repair notice together, each in its own place.
- **Orchestrator call, 23 November 2026:** The display order of the retained Changes rows stays as the panel draws it today. Item 2 B sets only which rows the runner keeps.
- **Orchestrator call, 23 November 2026:** Item 3 A explains the limited coverage in the no-match line of the `@` list, only while the tree is limited. This adds words to the existing list, not an inventory or a resolver.
- **Orchestrator call, 23 November 2026:** Large counts in the Files panel use thousands separators. The mockups format the tab and summary counts. The shared `DiffStat` part in `src/ui/` still prints raw line totals, so Milestone 5 formats them.

The words of the notices:

- All files: "18,412 files and folders are not listed. Find them in the terminal, or ask the agent."
- Changes: "The totals include 1,243 files that are not listed. Review them in the terminal, or ask the agent."
- The `@` list: "Nothing matches “tsconfig”. Some files are not listed, so type the path or ask the agent."

Residual design issue for Cal: item 1 F fills its groups in path order.
A large early folder, such as `tests/fixtures/`, can then push out later root files such as `tsconfig.json`.
The mockup fixture shows this result.
Item 1 F is in force. A change, such as shallow entries first inside each group, needs Cal to reopen item 1 before Milestone 3.

### Coordination

- **Orchestrator call, 20 November 2026:** Milestone 4 waits for the memory plan's pull request to merge into `main`. It owns the overlapping report assembly and storage refactor.
- **Orchestrator call, 20 November 2026:** Omission fields live inside tree and changes payloads. The tab-state plan owns response event numbers and route freshness.

The dependency was [workspace object history and files memory](https://app.conductive.build/orgs/X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM/workspaces/Zo7I3oIgOjg3QDhgTuwotI7KXJDK4QI0bv28NeKhTDs).
Its pull request #675 merged into `main` on 24 November 2026 as `45d1ce51e`.
It added bounded history pages, 4 KiB file descriptors, the bucket projection, transaction-callback file storage, per-part fields, and final path checks.
It moved the report requirements to `docs/protocol/file-reports.md`.
This branch merged that `main` on 24 November 2026 in `429da5335`, with no conflict.
Take that merged code as the starting point for Worker edits.
Do not reimplement its 64 path-hash buckets or its last-part path validation.

[New tab workspace state reads](https://app.conductive.build/orgs/X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM/workspaces/-4VoYHRrmYl5LZ2NqfLFGVBoo2dgVTygen72sNuX1vE) owns item 4 B.
Its branch is `calummoore/object-memory-new-tab-state-reads-cesn`.
Reserve no event-number field here.
If its route changes merge first, extend its response shape without changing its event-number semantics.
Otherwise report the payload fields to its orchestrator for integration.

## Replaced ways

- Unlimited new-runner full reports become count-limited reports with omitted totals. Consumers: runner reporter, multipart splitter, wire types, and generated types. Move in Milestone 3.
- Worker and app readers that discard omission fields become readers that retain them. Consumers: part assembly, projection storage, API, output filter, app parsers, and tree model. Move in Milestones 4 and 5.
- Panels that treat listed rows as complete become panels with complete aggregate totals and omission notices. Consumers: mockup panels, app panel, tab count, public guide, and protocol requirements. Move in Milestones 1, 2, and 5.

Remove superseded internal assumptions and duplicate calculations in those milestones.
Legacy no-field readers remain a required external compatibility path under Cal's 20 November 2026 instruction.
They have no removal date until Cal approves a separate end of support for older runners and Mac apps.

## Milestone 1: Limited-list mockups

Tags: mockup

Depends on: Cal approves the plan and answers items 1 to 3. Both done on 23 November 2026.

Draw the limited All files and Changes panels on desktop and phone.
Use the current workspace layout, shared components, and existing notice patterns.

- [x] Read the `mockups` and `product-ui` skills. Check `@firna/ui` and existing shared file components first.
- [x] Add linked catalogue states for each limited list, with actual retained and omitted counts in fixtures.
- [x] Show full aggregate Changes totals and distinguish them from visible rows.
- [x] Show the tree notice with files and directories counted as entries.
- [x] Draw saved limited lists beside unavailable or failed-repair notices without conflicting messages.
- [x] Show the mention consequence of item 3 in an existing linked screen when the chosen option needs it.
- [x] Run `npm run mockups:check`. Check desktop and phone, in both color schemes.
- [x] Save PNG screenshots under `.context/runner-file-report-limits/` for the report. Commit no generated output.
- [x] Update this plan's design and TODOs for every problem that the mockups show. Raise only choices that pass the decision test.

The implementor report is `.context/runner-file-report-limits/m1-implementor-report.md`.
The screenshots are in `.context/runner-file-report-limits/screenshots/`.
Review round 3 confirmed five mockup findings, 6 to 10. The fix round applied all five. The review folder of the branch holds the reports.
Review round 4 confirmed findings 11, 13, and 14, and its check removed finding 12. Fix round 2 applied 13 and 14. Finding 11 is a follow-up item, `plans/follow-ups/saved-list-links-keep-notice.md`.

## Milestone 2: Documentation and protocol

Depends on: Milestone 1, and the memory plan's final pull request merged into `main`.

- **Orchestrator call, 23 November 2026, at Cal's instruction:** The memory plan also edits `runner/file-reports.md`, `docs/protocol/workspace-tools.md`, and `worker/files/README.md`. So Milestone 2 starts only after that pull request merges and this branch merges `main`.
- **Cal, 24 November 2026:** Milestone 2 is released. Report semantics go in `docs/protocol/file-reports.md`. Create no competing split from the old `workspace-tools.md` content. This stage owns the edits of the legal pages and the public guides until Milestone 2 finishes.
- **Cal, 24 November 2026:** The tab-state workspace owns `workspace-events.md`, the Events split of `chat-and-events.md`, `lost-workspace-updates.md`, `skill-mentions.md`, and the Chat protocol index. Do not edit them. Send a needed link line to Cal's root session for a sequential handover.
- **Cal, 24 November 2026:** A code-area README changes with the milestone that changes its code, unless a useful new boundary fact exists earlier.

State the chosen limits, omitted totals, selection, mention coverage, and compatible report rules before the implementation starts.

- [x] Update `docs/protocol/file-reports.md` with the new meaning of complete reports and summaries, tree updates, and selection rules. Update the Files and changes section of `docs/protocol/workspace-tools.md` for the panel totals and notices.
- [x] Keep part identity, revision, atomic replacement, refusal, reconnect, and repair rules intact.
- [x] State omission-count delta semantics, empty count-only deltas, absent-path refreshes, and omitted-diff refresh after a base change.
- [x] State the new-runner rollout boundary. Keep unlimited legacy trees and changes readable until their runner updates.
- [x] Keep report semantics in `docs/protocol/file-reports.md`. Split it into a linked child page only if it exceeds the documentation skill's length target. Create no second report page.
- [x] Update the context coverage statements in `repository-folders.md`, `file-mentions.md`, and `file-mentions-answers.md` for the approved selection.
- [x] Keep `file-row-menu.md` aligned with the approved mention coverage and Add to chat rule.
- [x] Update the full-report references in `agent-runner.md`, `runner/file-reports.md`, and `runner/event-limits.md`. Preserve the independent 200-file turn limit.
- [x] Update `src/marketing/docs/files-and-changes.md` with the two limits, totals, notices, and the terminal or agent as the route to omitted files.
- [x] Read both legal pages in full, including imported sections of `src/marketing/terms.ts` and `src/marketing/privacy.ts`. Update each sentence that restates a changed fact.
- [x] Read every guide under `src/marketing/docs/` in full. Update each sentence that restates a changed fact, including mention and attachment coverage.
- [x] Leave code-area READMEs and `src/files/store.md` to the milestone that changes their code, unless a useful new boundary fact needs one now. Keep requirements in protocol docs and mechanics in code.
- [x] Check every changed Markdown link. Save the reading checklist under `.context/runner-file-report-limits/docs-check.md`.

The reading checklists are `.context/runner-file-report-limits/docs-check.md` and `public-docs-check.md`.
The legal pages restate no changed fact, so they did not change.

- **Orchestrator call, 24 November 2026:** A full tree replaces split deltas only while the tree omits entries before or after an update that changes its listed entries, or when the refreshes of an update do not fit one delta. Every other large update still splits into deltas of at most 512 changes, as today. Reason: the plan keeps the existing split-delta behaviour for ordinary updates, and this still prevents a partly applied swap of listed entries.
- `workspace-tools.md` passed its length target. `plans/follow-ups/workspace-tools-picture-rules-page.md` moves its picture rules later.
- **Cal, 24 November 2026:** The documentation skill splits a touched doc past about 250 lines, and the earlier scope instruction forbade only a duplicate of the report rules. So the picture rules moved unchanged to `docs/protocol/file-pictures.md` in the same stage, and the follow-up item above is deleted.

## Milestone 3: Runner limits and generated types

Depends on: Milestone 2.

Bound reports from new runners while keeping complete Git scans and turn comparisons.
The existing Worker must still accept the emitted reports at this milestone's end.

- [x] Add the two limit constants and optional fields in `crates/cnd-runner-interface/`, with Rust as the type owner. Mirror needed runtime limits in `src/shared/files.ts` through the existing constant parity check.
- [x] Add stable selection in the report layer. Apply Cal's answers, directory closure, omitted counts, and omitted line totals before splitting.
- [x] Keep full source state for content detection, marks, Git status, unpushed counts, and turn-file comparisons.
- [x] Compare the last emitted selection for deltas. Keep membership replacement, count updates, and absent-path refreshes atomic within one delta, or send a full bounded tree.
- [x] Repeat metadata in all parts. Include it in serialized byte budgeting and preserve it through credential filtering.
- [x] Extend existing report tests for the cap boundary, deterministic retained paths, exact omitted totals, directory ancestors, and ignored context entries.
- [x] Cover growth across the tree limit, return below it, selected-entry eviction, empty count updates, omitted deletions, base transitions to empty diffs, rename reclassification, and requested repairs.
- [x] Keep the existing whole-entry, 256 KiB, 512-change, restart, and resend assertions.
- [x] Extend wire serialization cases for absent fields, explicit zeros, and nonzero metadata. Verify the previous Worker's retained-summary check accepts new report samples.
- [x] Run `cargo run -p cnd-runner-interface --example export_bindings`. Commit generated output without hand edits.
- [x] Update `crates/cnd-runner/README.md` and `crates/cnd-runner-interface/README.md` for useful entry-point or boundary changes.
- [x] Run `cargo test -p cnd-runner-interface` and `cargo test -p cnd-runner`. Record test costs and assertion-failure proof for new cases.

The implementor report, test costs, and failure proofs are `.context/runner-file-report-limits/m3-report.md` and `m3-checks/`.
The current-Worker compatibility check is in `.context/runner-file-report-limits/compat/`.

- **Orchestrator call, 24 November 2026, review finding 15:** When the scans behind the last emitted tree and the last emitted changes report differ, such as after a repair of only one report kind, and a changes list omits files, the next tree update is one full bounded tree. A full tree makes every reader read each open file and diff again. A repair still sends only its own kind. Reason: the per-path refresh plan needs both histories from one scan, and a full tree is always a valid report.
- **Orchestrator call, 24 November 2026, review finding 16:** The priority pass skips a listed change whose tree entry is an unmarked folder. Changed submodules and files on disk keep priority.
- Review round 5 confirmed findings 15 to 19. The fix round applied 15, 16, 17, and 18. Finding 19 keeps the current exact sums.
- **Orchestrator call, 24 November 2026, review finding 20:** The runner sends one full tree whenever the scans behind the last emitted tree and the last emitted changes report differ, also with complete lists. This replaces the omitted-files condition of the finding 15 call. A "listed changes report" in the refresh rule is a report that the runner sent.
- **Orchestrator call, 24 November 2026, review finding 21:** In each scan that sends both reports, every changes part goes before the tree update. So the workspace stores the new base branch before a refresh makes a diff read again.
- **Orchestrator call, 24 November 2026, review finding 22:** The tree update plan keeps three groups: a listed-entry swap of a limited tree in one delta or one full tree, the required refreshes in one delta or one full tree, and all other edits in split deltas.
- Review round 6 confirmed findings 20 to 24. Fix round 2, the last, applies all five.

## Milestone 4: Worker metadata and compatibility

Depends on: Milestone 3, and the tab-state pull request merged into `main`. The memory pull request #675 merged on 24 November 2026. Cal releases this milestone.

Preserve omission metadata through the merged bucket projection, full report assembly, filtering, storage, and API publication.

- [x] Read and integrate the merged memory change before editing `worker/files/runner-reports.ts` or projection storage.
- [x] Update `worker/files/README.md` for useful boundary changes.
- [x] Extend `worker/files/parsers.ts` and `runner-input.ts` to retain optional metadata while accepting legacy reports.
- [x] Check repeated metadata when the report completes. Keep the retained-summary equality check and existing repair behavior.
- [x] Preserve both legacy lists without a Worker cutoff. Check that a legacy report above 1,000 changes still refreshes an open diff after a base-only change.
- [x] Store and reload metadata with complete projections. Preserve it through deltas and unavailable marks, and replace it with the next full report.
- [x] Verify empty deltas and absent-path removes against the merged bucket implementation. An empty delta reads no row bucket. A delta with removes reads each tree bucket at most once, one at a time, and an absent remove writes no row or order chunk.
  - **Orchestrator call, 24 November 2026:** Keep the merged remove path, which visits every tree bucket once per delta because a folder's entries can be in any bucket. So an absent-path refresh costs what an ordinary deletion costs, and the projection is never loaded at once. Milestone 6 measures bursts and can choose a runner-side full-tree fallback. An index of folder descendants was not chosen, because it needs a storage change for no measured need.
- [x] Extend `src/shared/output-fields.ts` only where needed. Verify `worker/chat/runner-output.ts` preserves counts across filtering and masking.
- [x] Serve optional fields inside existing tree and changes payloads. Preserve any event numbers introduced by the tab-state plan.
- [x] Extend existing Worker integration tests for multipart join, omitted totals, reload, reconnect, explicit-zero replacement, and legacy missing fields.
- [x] Use one-time fixtures to check new runner to previous Worker, old runner to new Worker, and previous reader to new stored data.
- [x] Check rollback and re-upgrade with a saved no-field projection and an in-flight report. Preserve unknown counts or repair the report, rather than inventing zeros. Also check that a tree delta with `omittedEntryCount` sets the count of a saved tree without one.
- [x] Include masked multipart publication and failed-part repair in the existing chat report coverage.
- [x] Run `npm run test -- worker/files` and the affected `worker/chat` report and output-filter tests.

The implementor report, test costs, and failure proofs are `.context/runner-file-report-limits/m4-report.md` and `m4-checks/`.
The one-time compatibility suite against the previous Worker at `4fdb5bc7d` is in `.context/runner-file-report-limits/compat-m4/`.

## Milestone 5: Files and Changes panels

Tags: ui

Depends on: Milestones 1 and 4.

Render the approved mockups with real retained lists and omitted totals.

- [x] Extend `src/files/api/` readers with generated types. Preserve optional metadata in the tree model and every synchronization path.
- [x] Show the approved All files and Changes notices. Use full aggregate totals for the Changes header and tab count.
- [x] Keep omission notices with saved lists during sleep, restart, and unavailable scans. Remove them after an explicit-zero replacement.
- [x] Keep file and diff reads usable when their paths are outside the retained lists. Check refresh after omitted-content changes.
- [x] Verify the approved mention behavior, answer links and pictures, Add to chat, and attached-file chips. Add no second tree under item 3 A.
- [x] Show the limited-coverage words in the no-match line of the `@` list while the tree is limited, as `app/file-mentions/list/limited` draws.
- [x] Format the counts of the Changes tab, the Changes summary, and both `DiffStat` copies with one shared count formatter in `src/ui/`. Move the mockup copies of the format in `docs/mockups/src/components/files/listNoticeCopy.ts` and `docs/mockups/src/components/common/LinkTabs.tsx` to that formatter.
- [x] Extend existing parser, tree, synchronization, and panel tests at the lowest level that protects each changed requirement.
- [x] Update `src/files/README.md` and `src/files/store.md` for useful boundary changes.
- [x] Run `npm run test -- src/files` and only the affected mention or row-menu tests.
- [x] Smoke-test the real panels against controlled reports on desktop and phone. Save PNG screenshots under `.context/runner-file-report-limits/`.

The implementor report, failure proofs, catalogue comparison, and screenshots are `.context/runner-file-report-limits/m5-report.md`, `m5-checks/`, and `m5-screenshots/`.

- **Orchestrator call, 24 November 2026:** The runner sorts the listed changes by path after it selects them, so older apps keep today's row order. The tree priority still uses the selection order. The app shows rows in the order that it receives them, with no second sort.
- **Orchestrator call, 24 November 2026:** The notice part and its words moved to `src/ui/components/files/`, because the app uses them. `tools/ui-move/map.json` lists the three moved paths.
- The app does not read `FILE_TREE_REPORT_MAX_ENTRIES` or `FILE_CHANGES_REPORT_MAX_FILES`. The notices use the reported counts. The development fixture sizes its limited lists with them, and the parity test keeps them equal to Rust.

## Milestone 5a: Mockup alignment for changed folders

Tags: mockup

Depends on: Milestone 1.

Milestone 5 found that the limited All files mockup draws `tests/fixtures` closed, although it holds listed changed files.
The app on `main` opens every folder that holds a changed entry, and the canonical mockups draw changed folders open.
So the new mockup state is the side that changes.

- [x] Draw every folder that holds a listed changed file open in the limited mockup states, as the app draws it. Run `npm run mockups:check`, compare the build with a baseline, and retake the affected screenshots.

The catalogue comparison is `.context/runner-file-report-limits/m5-checks/catalogue-compare-5a.json`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: Milestones 1 to 5, and the memory plan's merged pull request.

Verify the combined change, compare report costs, and prepare one pull request into `main`.

- [x] Run early format, lint, and file-length checks with Node 24.
- [x] Prove that each new test fails on the behavior it protects. Run each new asynchronous or browser test 10 times and record its cost.
- [x] Run a one-time cost check for 1,000 changes, 50,000 tree entries, and omitted-only edits. Compare CPU, rows, history bytes, and heap with the supplied measurements.
- [x] Rerun `worker/chat/runner-file-parts.test.ts > refuses inconsistent changes metadata and empty multipart reports` at default concurrency, 10 times on the branch head and 10 times on `main` at `4fdb5bc7d`. It timed out once at 15 s during Milestone 4. The evidence is `.context/runner-file-report-limits/m4-checks/guard-timeout-evidence.md`. Fix the cause if the branch made it slower.
- [x] Measure the first draw of All files with a limited tree whose changed folder holds about 45,000 entries. The app has no virtual list. Ask Cal if the measured time needs a new design choice.
- [x] Measure a burst of absent-path refreshes in existing app readers. Choose a full-tree fallback before repeated scans dominate the cost.
- [x] Save cost and compatibility evidence under `.context/runner-file-report-limits/`. Ask Cal if a new design choice is needed.
The cost evidence is `.context/runner-file-report-limits/m6-costs-report.md` and `m6-costs/`. The timeout comparison is `m6-guard/result.md`.

- **Orchestrator call, 24 November 2026:** Keep the 512-operation delta budget for absent-path refreshes, with no earlier full-tree fallback. A delta cost less Worker CPU, storage, and wire bytes than a full tree at every size. One app reader is slower with a large delta from about 64 removes, but Worker and reader together still favour the delta, and a full tree also makes every open file read again.
- The heap of a 50,000-entry full resend peaked at up to 59.4 MB, above the estimate of about 45 MB and below the 128 MB limit. A legacy tree of 68,412 entries peaked at up to 75 MB.
- The first draw of a changed folder with 45,000 entries takes 7 to 8 s with both legacy and limited reports. It is outside the scope: `plans/follow-ups/large-changed-folder-first-draw.md`.
- The guard test times out on `main` under the same load. The two head-only timeouts stay unclassified until exact-head CI.

- [ ] Run the complete npm gate in CI on the exact head of the pull request, as Cal asked on 23 November 2026, in place of a local run.
- [ ] Run the Rust checks, including the doc-tests, in the `Rust gate` CI job on the exact head. `rustdoc` is missing on this computer, so the doc-tests did not run locally.
- [ ] Run the Rust release build in the `Rust gate` CI job on the exact head.
- [x] Regenerate shared bindings and check for generated drift. Check each changed Markdown link.
- [ ] Commit with the `git-commit` skill and push this workspace branch.
- [ ] Review the full diff against `origin/main` with the `implementation-review` skill after the push. Report findings and apply the fix rule.
      Fix `fix now` findings, record follow-up items for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill permits it. Preserve its dated decisions and design calls in the pull request description.
- [ ] Open the pull request into `main`. Include the plan permalink, compatibility path, approved coverage changes, and follow-up items. Watch CI. Cal merges.

## Post-merge follow-up (non-blocking)

- [ ] Check a sandbox after its normal runner update. Confirm both caps and notices, a reconnect, and access to an omitted path.
      This needs the deployed runner and remains outside the pre-merge completion boundary.
