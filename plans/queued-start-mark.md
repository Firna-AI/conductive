# List mark light only for a start with a waiting message

Status: Active. On branch `calummoore/loading-when-pending-p2f2`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

PR #667 (`459af2a78`) made the list mark run its light for every workspace
in the `starting` state. So a workspace that resumes only because a member
opened it looked busy, though no work waited on it. The list mark is the
3 × 3 grid beside a workspace name in the sidebar, the command palette,
and the chips.

Decision of 26 November 2026 (Cal, item 1, option A): the light runs
during a start only when a message waits in the queue of the workspace.
The Worker computes the answer when it reads the list. It asks the
Durable Object of each starting workspace, and it sends the answer as a
new optional field `messageWaiting` on the workspace record. Rejected
options:

- B. Option A, plus live updates from the Durable Object on each queue
  change. Rejected: Large, and new wiring in the queue code for a delay
  of at most one list read.
- C. A stored database column. Rejected: a migration and triggers, and a
  missed trigger leaves a stale value.
- Left out in the brainstorm: the open workspace only (other rows never
  show the light), a guess from the age of the workspace (misses a
  resume), a reuse of an existing state or a new state value (the row
  must say Starting, and older Mac app copies fail on a new state), and
  the cause of the start (misses a message sent after the start began).

Design calls (my calls, 26 November 2026):

- A start with no waiting message shows the still mark of the other
  states: the GitHub colour, or dim. Reason: the protocol already gives
  each other state this look, and the user rejected a new still shape.
- With reduced motion, a start with a waiting message keeps the lit ring
  of the 24 November 2026 decision.
- A waiting message is each queued message with a pending command, the
  test of the automatic restart (`oldestWaitingMessageAt`). The first
  message of a new workspace that the chat has not accepted yet counts
  too. Reason: one test for one meaning, and a first start never looks
  idle.
- Running checks still move the mark during any start, as the rule for
  running checks says.
- The header glyph, the start steps, and the automation run glyphs do not
  change. They use `StatusGlyph`, which shows the state of the computer.
- Screen readers hear "Starting" for both kinds of start, as before.
- An event record has no `messageWaiting`. A listed row keeps its value
  only while both the row and the event are `starting`. Reason: a value
  from an earlier start must not light a later start.
- The mockup and app test fixtures mark their starting rows with a
  waiting message, because each is a new workspace with a first message.
- The list read asks the object with an optional argument of the existing
  `readChatWorkspaceSummary`, not a new method. Reason: an old object can
  run for minutes after a deploy, and it ignores the argument.

Contract owners:

- [Workspace list marks](../docs/protocol/workspace-marks.md).
- The public [Workspaces guide](../src/marketing/docs/workspaces.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

- [x] Add `messageWaiting` to the mockup workspaces. Set it on the three
      starting rows, which are new workspaces with a first message.
- [x] Pass it to the mark in the mockup rows and chips.
- [x] Add the pages "Starting with a message" and "Starting" to the
      Workspace mark entry.
- [x] Run `npm run mockups:typecheck`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Replace the 23 November 2026 start rule in
      `docs/protocol/workspace-marks.md` with the new dated decision.
- [x] Update the public Workspaces guide, the mockup texts of the list
      mark, and the reduced-motion comment of `WorkspaceMark.module.css`.
- [x] Search the Terms and the Privacy pages for the fact. Neither names
      the list mark.

## Milestone 3: The Worker sends `messageWaiting`

Depends on: 2

- [x] Add the optional `message_waiting` field to the Rust `Workspace`
      record and regenerate the TypeScript.
- [x] Read the field in `src/shared/workspace-read.ts`.
- [x] Let `readChatWorkspaceSummary` answer whether a message waits when
      the caller asks (`worker/lifecycle/waiting-summary.ts`).
- [x] Ask for starting rows in `workspaceForViewer`.
- [x] Test the summary, the lifecycle fallback, and the list read.

## Milestone 4: The mark reads `messageWaiting`

Tags: ui

Depends on: 3

- [x] Run the light for a start only when `messageWaiting` is true, in
      every caller of `WorkspaceMark`.
- [x] Keep the listed value across events while the row stays starting.
- [x] Test the mark and the list change.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests, the Rust checks, and the complete gate.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review round 1 found five Low findings. Items 2, 3, and 5 are
      fixed. Items 1 and 4 are follow-up items
      `plans/follow-ups/new-workspace-waiting-gap.md` and
      `plans/follow-ups/starting-read-double-call.md`.
- [x] Review round 2 found six Low findings. Items 7, 8, 9, 10 (a list
      test), and 11 are fixed. Item 6 and the type change of item 10 are
      follow-up items `plans/follow-ups/waiting-answer-one-turn.md` and
      `plans/follow-ups/mark-inputs-required.md`. Two problems outside
      the scope are `plans/follow-ups/registered-parts-over-page-limit.md`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, and the follow-up items
      that the change adds.
