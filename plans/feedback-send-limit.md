# Feedback send limit

Status: Active. On branch `conductor/security-feedback-send-limit`, no pull request yet. The pull request deletes this plan after the checks and review.

Cal chose option B on 10 November 2026. Each person can send 10 feedback emails in an hour. A send above the limit gets HTTP 429. The dialog keeps the draft and says when to retry. Invitation and waitlist approval emails do not count. The shared email policy remains a separate work item.

On 11 November 2026, Cal authorized implementation of agreed work in new workspaces. This plan records that approved scope. It does not request another start decision.

Contract owners:

- [Feedback protocol](../docs/protocol/feedback.md).
- [Feedback routes](../worker/app-api/feedback.md).
- [App data](../src/app/README.md).
- [Shared contracts](../src/shared/README.md).
- [Mockups](../docs/mockups/README.md).
- [Migrations](../migrations/README.md).

## Design

Use durable, feature-specific send records. Admit a new delivery atomically before a provider request. Preserve the existing delivery key and retries of the same draft. Keep feedback text and screenshots out of stored records. Return the next available time with HTTP 429. Keep the existing failed-send recovery controls unless the mockup finds a contract problem.

The implementation must settle any uncovered boundary with the parent session before dependent changes. Evidence and delegate reports live under `.context/feedback-send-limit/`.

## Milestone 1: Rate-limited dialog mockup

Tags: mockup

Depends on: none

- [ ] Add the rate-limited state to the desktop and phone mockups without exceeding five screens per page.
- [ ] Run `npm run mockups:check`. Inspect the actual desktop and phone output.
- [ ] Update this design and its TODOs for any problem the mockup shows.

## Milestone 2: Documentation

Depends on: 1

- [ ] Update the feedback protocol for option B and its retry behavior.
- [ ] Read both legal pages and every public guide in full. Update any restated fact.
- [ ] Update the relevant area READMEs and the mockup catalogue.

## Milestone 3: Durable admission and regressions

Depends on: 2

- [ ] Add a forward migration and atomic per-person feedback admission.
- [ ] Preserve existing delivery keys and retry behavior. Return HTTP 429 with a useful retry time.
- [ ] Prove the accepted tenth send, refused next send, expired window, separate people, concurrent admission, and retry behavior through the route and fake mail service.
- [ ] Run the targeted checks. Prove each new regression fails without its behavior.

## Milestone 4: Dialog integration

Tags: ui

Depends on: 3

- [ ] Show the server retry time in the kept feedback dialog, using the reviewed mockup.
- [ ] Add the focused model or rendered-dialog regression and a development state for a safe visible check.
- [ ] Inspect the actual dialog on desktop and phone without sending live email.

## Milestone 5: Checks, review, and pull request

Depends on: 4

- [ ] Run early checks and each new asynchronous test 10 times. Record test costs.
- [ ] Install desktop and runner dependencies. Run the complete gate.
- [ ] Commit and push this branch.
- [ ] Review the full diff against `origin/main` after the push with the `implementation-review` skill. Run a fresh finding check for each new finding. Apply authorized fixes, record remaining follow-ups, and re-review once.
- [ ] Delete only `plans/follow-ups/feedback-send-limit.md` after its work is resolved.
- [ ] Delete this plan under the plan deletion rules.
- [ ] Open an unmerged pull request against `main`. Preserve the dated choices and a permalink to this plan in its description.
