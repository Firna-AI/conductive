# Markdown tables in agent replies

Status: Active. [PR #119](https://github.com/Firna-AI/remote-code/pull/119) is open on branch `calummoore/markdown-table-failure`.
The pull request that completes the work deletes this plan. The user approved
all milestones and tasks on 9 November 2026. Implementation is active.

Conductive shows agent replies in its workspace chat. The chat parser joins
unrecognized table rows into a paragraph. The file preview already renders
tables. This change adds tables to replies and shares the existing table code.

The user chose options 1A and 2A on 9 November 2026. Short rows use spanning
cells. Chat adds tables while keeping its other formatting. The change uses
the existing text events and saved messages.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md): live text and saved history.
- [Workspace tools](../docs/protocol/workspace-tools.md): existing file-preview table behavior.
- [Chat README](../src/chat/README.md): chat entry points and tests.
- [Files README](../src/files/README.md): the existing Markdown implementation.
- [Mockups README](../docs/mockups/README.md): desktop and phone visual requirements.

## Decisions

### 1. Choose how short rows render

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `src/files/markdown/markdown-tables.ts:105` and `src/chat/components/agent-text.ts:15`.
- **Terms:**
  - **Short row:** A table row with fewer cells than its header.
- **Background:** The file preview previously froze when short rows expanded into many empty cells. It now limits this expansion.
- **Problem:** New chat tables need a rule for missing cells.
- **Impact if no action:** Unlimited padding could repeat the earlier freeze.
- **Root question:** How should a reply show missing cells while keeping table layout work in proportion to its text?
- **Options:**
  - **A.** Let the final cell span the missing columns. This avoids extra cells but changes row borders. Effort: Small.
  - **B.** Allow 65,536 added empty cells per reply. Show the remaining source as text afterward. Effort: Small.
  - **D.** Keep spanning cells and bound header width times body rows across a reply. Show remaining source after that budget. Effort: Small.
  - **C.** Render only visible rows and columns. This adds substantial scrolling and focus work. Effort: Large.
- **Left out:** Unlimited padding amplifies the input. Counting parsed cell elements alone cannot detect layout work across empty grid positions.
- **Wider fix:** D bounds the logical grid. A bounds cell elements but needs the separate-border layout described below. D remains unselected.
- **Previous examples:** Decision 88 records the earlier freeze. The follow-up deleted by `db11799` also measured slow layout with spanning cells.
- **Related:** Item 2 selects the code that applies this policy. File previews keep their existing padding and cell budget.
- **Recommendation:** A, with separate borders. It avoids a new limit and removes the measured Chrome stall. D gives an engine-independent grid bound.
- **Action:** fix now, apply A in the approved implementation.
- **Chosen:** A, by the user on 9 November 2026. The user answered `1 = A`.

### 2. Choose the Markdown scope

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/components/agent-text.ts:22` and `src/chat/components/AgentText.tsx:54`.
- **Background:** Chat and file previews use different Markdown parsers. File previews already support tables.
- **Problem:** Chat joins valid table rows into a paragraph.
- **Impact if no action:** Agent tables remain hard to read.
- **Root question:** How should Conductive add tables to agent replies?
- **Options:**
  - **A.** Add tables to chat and share table code with file previews. Preserve other chat formatting. Effort: Medium.
  - **E.** Add chat-only table code. This avoids file-preview changes but duplicates table rules and rendering. Effort: Medium.
  - **B.** Share the complete Markdown renderer. Headings, links, quotes, and other formatting would also change. Effort: Large.
  - **C.** Adopt a Markdown library. This adds a dependency and requires a safety review. Effort: Large.
  - **D.** Build one configurable parser with separate chat and file profiles. This requires more compatibility work. Effort: Large.
  - **F.** Parse outside the browser and send table blocks in events. This changes event contracts and history without removing browser layout cost. Effort: Large.
- **Left out:** Plain pipe text and agent instructions to avoid tables fail the goal. Selecting richer Markdown only for table replies changes other formatting.
- **Wider fix:** B prevents Markdown support from differing between chat and files.
- **Previous examples:** None found beyond the current chat and file-preview difference.
- **Related:** Item 1 sets the short-row policy.
- **Recommendation:** A. It fixes the reported problem with the smallest visible change. B removes the broader renderer difference.
- **Action:** fix now, apply A in the approved implementation.
- **Chosen:** A, by the user on 9 November 2026. The user answered `2 = A`.

Both choices assume that agents send pipe tables and that the browser renders
them from plain text. The screenshot and existing event contracts supply these
assumptions. This change keeps both assumptions and adds no backend work.
The options check rejected another assumption: cell element count alone does
not bound browser layout work. The selected approach also needs separate borders.

## Behavior and design

Agent design calls, dated 9 November 2026:

- Share the row reader, alignment rules, and separator checks between chat and file previews.
  Put the pure shared reader in `src/markdown/table-rows.ts`.
- Share a pure native table view under `docs/mockups/src/components/common/`.
  Each caller supplies its cell content. Chat keeps its current code and bold formatting.
- Use native table semantics. The inspected `@firna/ui/table` uses flex rows and plain-text headers.
- Draw the shared view with `border-collapse: separate` and `border-spacing: 0`.
  Keep one neutral 1 px line between cells and preserve the file preview's appearance.
- Keep file-preview padding, its 65,536-cell budget, and worker parsing unchanged.
  Chat keeps the actual cells of each row and spans missing columns without adding cells.
- Respect the [HTML span maximum](https://html.spec.whatwg.org/multipage/tables.html#attr-tdth-colspan) of 1,000 columns.
  Set the final span to the smaller of 1,000 and the missing-column count plus one. Further positions stay empty.
- Recognize a header followed by a matching separator, including alignment and escaped pipes.
  Accept the optional outer pipes that the existing row reader supports.
- Clip cells beyond the header width, as the existing table reader does.
  Preserve the original message text in chat state and saved history.
- Recognize tables directly after prose. A blank line or a line without a pipe ends the table.
  Table-like text inside fenced code stays code. Unsupported or malformed text stays readable.
- Show received text immediately. Recognize a table when its separator arrives.
  This follows the existing live-text requirement and needs no completion state.
- Parse the current complete reply on each update, as today.
  Live events and saved history must produce the same completed table.
- Keep folded-message previews on one line. Show the full table when the message opens.
  Keep native tables outside the phrasing-only `<summary>` element.
- A spanning cell keeps its text at its start, so a value stays under its first column.
  A closed table-message preview lists cells in row order with a middle dot between cells.
- The open message line keeps blocks before the first table. The table and later blocks form its expanded body.
  Messages without a table retain their current markup.
- Shared data types use plain TypeScript modules, so fixture imports also compile in projects without JSX.
- Scroll wide tables inside the reply. Keep the workspace within the viewport.
- Render cells as React text and elements. Supplied HTML remains text.
- Keep sample rows in mockups, development fixtures, and tests.
  Add no dependency, input rejection, validation rule, or new gate.
- The source-preserving row-reader extraction can follow the mockups independently of documentation.
  Behavioral chat changes still depend on the requirements milestone.
- Keep the chat and files README entry points short and move their detail into topic guides.
  Preserve their old anchors as linked sections so existing readers keep working links.
- Check for tables before list and heading rules, after the code-fence rule.
  This applies the approved pipe-table grammar without changing non-table formatting.
- Treat an indented table after a flat list as the next block, so rows never join the item text.
- Clip extra cells in the chat parser for the closed message preview.
  The shared view also clips other callers, so the preview and opened table agree.
- Render a folded message's native table only while its line is open, so closed previews do no hidden table layout.
- Keep a table-first line's preview in a visually hidden span while open, so its summary keeps an accessible name.
- Put the scripted table reply behind `answer=tables` on the development page.
  Keep `answer=text` as the default to preserve the existing example and its timing.

## Replaced ways

- Mockup message `paragraphs` become ordered `blocks` in Milestone 1.
  All fixtures, `ChatItemView`, and the mockup work-fold message line use the new field.
  The old keys and the inline work-fold helper are removed after their consumers move.
- File-local row reading becomes shared row reading in Milestone 2a.
  Consumers: the file table parser and the new chat table parser.
  Remove the original row-reading helpers after both consumers use the shared reader.
- File-local table markup becomes a shared table view in Milestone 3.
  Consumers: `src/files/markdown/MarkdownView.tsx` and `src/chat/components/AgentText.tsx`.
  The opened body of `src/chat/components/MessageLine.tsx` also uses the shared view.
  Remove the replaced markup and unused table styles after both consumers move.
- The file table parser remains responsible for file-specific padding and its budget.
  Keep no duplicate row reader or permanent re-export for the replaced helpers.

## Milestone 1: Table mockups

Tags: mockup

Depends on: none

Status: Completed on 9 November 2026.

Show table replies before changing the app.

- [x] Add a reachable child page under `app/chat` for table replies.
- [x] Show the resource table, a short row, and a wide table in desktop and phone variants.
- [x] Show a reply before its separator arrives and after its table appears.
- [x] Show table messages inside an open work fold, with a closed preview and an expanded table.
- [x] Build the pure shared table view with current typography, colors, borders, and alignment.
- [x] Use separate borders with the existing single-line grid appearance in both table callers.
- [x] Keep each catalogue page within the existing five-screen limit.
- [x] Update the mockup catalogue and design notes where needed.
- [x] Capture marketing pictures again if a changed screen or shared part appears in them.
- [x] Run `npm run mockups:check`. Inspect both viewports in both color schemes.
- [x] Save screenshots under `.context/markdown-table-support/`.
- [x] Update this plan's design and TODOs for problems that the mockups show.

Evidence: `.context/markdown-table-support/milestone-1-report.md`.

## Milestone 2: Requirements and documentation

Depends on: 1

Status: Completed on 9 November 2026. The user requested another attempt
with the prescribed Claude model after its capacity returned. No model
override was given.

Document the chosen table behavior without changing unrelated Markdown requirements.

- [x] Add `docs/protocol/chat-markdown.md` with table syntax, short rows, streaming, safety, and scrolling requirements.
- [x] State the native span maximum and readable incomplete-input behavior. Keep border mechanics in code documentation.
- [x] Record the chosen approach and its reason beside the requirements.
- [x] Link the protocol from `src/chat/README.md` and the relevant mockup entry.
- [x] Update the chat and files READMEs for the shared table entry points as those entry points land.
- [x] Move long README details into linked guides where needed. Preserve live content and links.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
- [x] Update each legal sentence that restates a changed fact.
- [x] Check every relative link in changed Markdown.

Evidence: `.context/markdown-table-support/milestone-2-report.md` and `m2-parent-check.md`.

## Milestone 2a: Shared table row reader

Tags: ui

Depends on: 1

Status: Completed on 9 November 2026.

Extract existing file-preview logic without adding or changing behavior.
This preparation does not depend on the new chat requirements.

- [x] Move shared table data types into the neutral plain TypeScript module.
- [x] Extract row reading, alignment, and separator checks from the file table parser.
- [x] Move the file parser to the shared reader while preserving its padding and budget.
- [x] Move every type and helper consumer to the new owner. Remove the replaced helpers and type module.
- [x] Run the existing file Markdown tests and relevant typechecks, lint, and formatting checks.

Evidence: `.context/markdown-table-support/milestone-3-core-report.md`.

## Milestone 3: Tables in agent replies

Tags: ui

Depends on: 2 and 2a

Status: Completed on 9 November 2026.

Share the existing table rules and render chat tables with the chosen short-row behavior.

- [x] Add a failing regression through the public `AgentText` component for the reported table shape.
- [x] Move the file renderer to the shared table view while preserving its current presentation.
- [x] Add table blocks to the chat parser before paragraph lines join.
- [x] Render chat tables with actual row cells and a final cell that spans missing columns.
- [x] Apply the native span maximum without rejecting message input.
- [x] Update `MessageLine` for table blocks. Keep its inline preview and render opened tables outside `<summary>`.
- [x] Keep current inline formatting, fenced code, and readable incomplete input.
- [x] Constrain the table wrapper to scroll inside the chat column.
- [x] Add a streamed table to the chat development page.
- [x] Remove replaced table markup and unused styles after all callers move.
- [x] Update the READMEs with the final entry points and check their links.

Evidence: `.context/markdown-table-support/milestone-3-ui-report.md` and `final-code-guides-report.md`.

## Milestone 4: Verification, commit, review, and pull request

Status: Completed on 9 November 2026. The plan was deleted and PR #119 opened before the later main update.

Depends on: 3

Verify table behavior through the public component and chat events.

- [x] Extend the component regression for cells, alignment, escaped pipes, and current inline formatting.
- [x] Cover fenced table examples and malformed table-like text without repeating parser tests.
- [x] Check short rows use the correct span and add no empty padding cells.
- [x] Check a gap beyond 1,000 columns leaves further positions empty and preserves actual cell content.
- [x] Use chat events to split a table across header, separator, and body updates.
- [x] Check the completed reply and saved-history reply through the same harness.
- [x] Extend the work-fold DOM regression for a table message's preview, expanded table, and retained reading position.
- [x] Keep the existing file-preview table safety tests and run them after extraction.
- [x] Observe each new regression fail on its intended assertion before the fix.
- [x] Run targeted chat and Markdown tests. Run each new asynchronous test ten times.
- [x] Measure the known sparse shapes at about 24 KB and 40 KB in Chrome and WebKit with the final shared view.
- [x] Stream the 24 KB shape one row at a time. Check spans, alignment, responsiveness, and the single-line borders.
- [x] Save results under `.context/`. Report unavailable engines and their blockers. Add no timing test or new CI gate.
- [x] Raise a new decision only if a measured failure needs a different policy. Keep option D unselected without user approval.
- [x] Run format, lint, file length, and unused-export checks.
- [x] Smoke-test resource, partial, short-row, and wide tables in the chat development page.
- [x] Inspect desktop and phone layouts in both color schemes. Save evidence under `.context/`.
- [x] Install root, desktop, and runner check dependencies. Run `npm run check`.
- [x] Verify the combined tree after the latest main merge with the complete gate.
- [x] Commit with Conventional Commits and push the current branch.
- [x] Review the complete local diff against `origin/main` after the push with the `implementation-review` skill.
- [x] Report findings. Fix `fix now` findings, record the rest as follow-up items, and re-review once.
- [x] Delete this plan when the `plans` skill requires it.
- [x] Open the pull request with dated decisions, design calls, the plan permalink, and new follow-up items.

Evidence: `.context/markdown-table-support/browser/final-measurements.md`, the browser JSON results, screenshots, `complete-gate-1.log`, and `complete-gate-2.log`.

Review: `.context/reviews/calummoore/markdown-table-failure/round-2-review.md` found no issues. No fix round or fix re-review was needed.

Options review: `.context/markdown-table-support/options-check.md` confirms both
choices. Its layout evidence is under `.context/markdown-table-support/measurements/`.
The selected border model removes the measured Chrome stall. WebKit remains
unmeasured and is part of the planned implementation verification.


## Milestone 5: Compatibility with workspace link chips

Tags: ui

Depends on: 4

Status: Completed on 9 November 2026.

Main added workspace numbers and link chips after the table review. Preserve
both approved features. This is merge compatibility work. The existing table
and workspace-link mockups already specify their parts. It needs no new
visual design or user decision.

Design call, 9 November 2026: render hidden table-first summary text without chips, so no invisible link can receive focus. The visible table keeps its chips.

Design call, 9 November 2026: use main's `LinkedText` and mockup `MessageText`
formatters in table cells and folded previews. Do not keep the retired
`InlineMarkdown` or `inlineParts` interfaces. This preserves the current
workspace-link behavior and the selected table grammar.

- [x] Resolve each UI conflict while keeping tables and main's link chips.
- [x] Move every new mockup fixture consumer from `paragraphs` to `blocks`.
- [x] Preserve link clicks in folded messages without toggling their lines.
- [x] Add a public regression for workspace links in table cells. Observe a deliberate failure and restore.
- [x] Resolve the README and architecture conflicts without dropping live main or table content.
- [x] Align table protocols and guides with the current inline formatter and moved protocol anchors.
- [x] Read both legal pages in full and check changed Markdown links.
- [x] Install main's added dependencies and run the relevant early checks and targeted tests.

Evidence: `.context/markdown-table-support/merge-links-ui-report.md`, `merge-links-docs-report.md`, and `m5-main-preservation.txt`.

## Milestone 6: Verify and finish the integrated change

Design call, 9 November 2026: agent tables use normal word wrapping. Main's anywhere wrapping stays on prose. This preserves the selected wide-table scrolling and file-preview behavior.

Depends on: 5

- [x] Verify the merged main additions and all conflict resolutions path by path.
- [x] Check current table layouts, workspace-link cells, folded previews, and accessibility.
- [x] Run the complete gate on the integrated tree.
- [x] Commit and push the merge and compatibility work.
- [x] Run a fresh implementation review against origin/main. Apply the fix rule.
- [ ] Delete this restored plan after its required work and review complete.
- [ ] Update PR #119 with the new plan permalink, decisions, checks, and follow-ups. Watch CI to completion.


Integrated review: `.context/reviews/calummoore/markdown-table-failure/round-3-review.md` found no issues. CI run `42677662206` passed the integrated table source. The later main sync preserves all table, formatter, and test files byte for byte. Final-head CI remains part of the pull request completion task.
