# Restore the New workspace draft cursor

Status: Active. On branch `calummoore/workspace-cache-cursor-position`, no pull request yet. The pull request that completes the work deletes this plan.

On 9 November 2026, the user asked the New workspace draft to remember its cursor or put it at the end. The chosen approach puts the cursor at the end when a saved draft returns. This uses the simpler alternative that the user explicitly allowed. It needs no persistent cursor state.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md).
- [Web app](../src/app/README.md).

Design call, 9 November 2026: keep ordinary edits and clicks free to move the cursor. Apply restoration only when the message field mounts with saved text.

Implementor's call, 9 November 2026: one hook, `useCursorAtEnd`, gives the page and the dialog the handle of their message field. It calls the public `setSelection` of that handle once, in a layout effect at mount, with the text length of the first render. The controlled `selection` prop was not used, because it reads as a selection that the field keeps.

## Milestone 1: Documentation

Depends on: none

- [x] State the authorized cursor behavior in the create protocol.
- [x] Read both legal pages and check whether their facts need a change. No fact changes, because the cursor keeps and sends no data.
- [x] Keep the area README aligned with any new entry point.

## Milestone 2: Restore the cursor

Tags: ui

Depends on: 1

- [x] Use the shared input control's public API to restore the cursor at the end in the dialog and page.
- [x] Use the browser smoke check as the regression evidence. Happy-dom puts the cursor of a new field at the end, so a unit test cannot fail on this defect. The check failed before the fix: the restored dialog message had its cursor at 0, not at 5.
- [x] Check that ordinary edits keep their cursor position, with the browser smoke check.

Evidence: `.context/cursor-browser-baseline.log`, `.context/workspace-draft-cursor/implementor-report.md`, and `.context/workspace-draft-cursor/browser-stability.log`.

## Milestone 3: Verify and deliver

Depends on: 1, 2

- [x] Run targeted tests and a browser smoke check.
- [x] Run early checks and the complete gate. The local gate passed before the merge of `307dd03`. CI checks the combined branch before the final report.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete diff against `origin/main` with the implementation-review skill. Resolve findings under its rules.
- [ ] Delete this plan after the other work completes.
- [ ] Open the pull request with the dated design record and check results.
