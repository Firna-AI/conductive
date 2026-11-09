# Restore the New workspace draft cursor

Status: Active. On branch `calummoore/workspace-cache-cursor-position`, no pull request yet. The pull request that completes the work deletes this plan.

On 9 November 2026, the user asked the New workspace draft to remember its cursor or put it at the end. The chosen approach puts the cursor at the end when a saved draft returns. This uses the simpler alternative that the user explicitly allowed. It needs no persistent cursor state.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md).
- [Web app](../src/app/README.md).

Design call, 9 November 2026: keep ordinary edits and clicks free to move the cursor. Apply restoration only when the message field mounts with saved text.

## Milestone 1: Documentation

Depends on: none

- [ ] State the authorized cursor behavior in the create protocol.
- [ ] Read both legal pages and check whether their facts need a change.
- [ ] Keep the area README aligned with any new entry point.

## Milestone 2: Restore the cursor

Tags: ui

Depends on: 1

- [ ] Use the shared input control's public API to restore the cursor at the end in the dialog and page.
- [ ] Extend the existing draft restoration regression. Show its assertion fail before the fix.
- [ ] Check that ordinary edits keep their cursor position.

## Milestone 3: Verify and deliver

Depends on: 1, 2

- [ ] Run targeted tests and a browser smoke check.
- [ ] Run early checks and the complete gate.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete diff against `origin/main` with the implementation-review skill. Resolve findings under its rules.
- [ ] Delete this plan after the other work completes.
- [ ] Open the pull request with the dated design record and check results.
