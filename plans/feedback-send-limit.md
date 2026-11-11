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

Parent item 6 remains open on 11 November 2026. It asks which failed email attempts consume the allowance. Admission code and the affected protocol requirement stay unchanged until Cal answers. The first proposal used the age of the initial admission. The fresh check found that this can permit attempts for 20 keys in a rolling hour. The checked recommendation is now E, which renews the time on each authorized attempt. This is a proposal, not approval.

Design calls from the mockup review, 11 November 2026:

- My call: reuse the failed-send notice and keep its existing recovery controls. This satisfies the approved retry-time requirement without another error state in the app.
- My call: show the UTC date and 24-hour time, rounded up to the next whole minute. Rounding never shows a time before the server's calculated deadline for that response. A later request can change availability. A year adds no useful context to an hourly wait.
- My call: add `app/feedback/send-limit` as a child page. The existing states page already has five screens.
- My call: build the server message with `sendLimitBody`. Keep one owner of the value 10 when admission is implemented. This keeps the mockup and the route in agreement.

The parent authorized a narrow factual update to the invitation follow-up on 11 November 2026. When implementation makes it true, update its stale no-limit statement and its link to the resolved feedback item. Preserve all invitation options, recommendations, actions, and limits. Parent item 5 remains separate and open.

Shared integration files: `migrations/README.md`, `src/marketing/privacy.ts`, and the Feedback text in `src/marketing/privacy-uses.ts`. Describe only stored metadata and its rate-limit purpose. Distinguish it from messages and screenshots. Add no public retention promise. No change to the shared mail sender, generic HTTP helper, API client, shared error type, or shared cron is authorized by this acknowledgement.

## Pending failed-attempt choice

Local item 1 is parent item 6. Cal has not answered it.

### 1. Count failed feedback attempts and retries

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/feedback-mail.ts`, the planned feedback counter, and `docs/protocol/feedback.md`.
- **Terms:**
  - **Worker:** the server of Conductive.
  - **Delivery key:** the stable code that makes Resend process the same email once within its 24-hour key window.
  - **Slot:** one counted permission in the person's feedback allowance.
  - **Authorized attempt:** a provider request that the Worker permits, timed by the Worker when it records that permission.
  - **Observed acceptance:** a successful Resend reply that the Worker receives. It confirms acceptance, not delivery to the inbox.
- **Background:** Cal chose 10 feedback emails per person in an hour on 10 November 2026. The limit counts feedback only. The task requires durable concurrent counting, HTTP 429 above the limit, a retry time, and the existing delivery keys. The orchestrator chose a rolling hour, so each request looks back 60 minutes. Cal has not chosen how failures and retries count.
- **Problem:** The first proposal gives an unchanged retry a free slot until one hour after its first admission. Ten keys admitted at 09:00 can fail, then retry at 09:59. When those slots expire at 10:00, ten new keys can get permission. The Worker can thus authorize attempts for 20 keys in one rolling hour. Also, a failed request can leave the Worker unable to tell whether Resend accepted the email.
- **Impact if no action:** The wrong rule can permit more keys than the intended allowance, or refuse a harmless retry. No option can promise inbox delivery times that the app cannot observe or control.
- **Root question:** How should the hourly allowance count failed or unknown attempts and later retries of the same email?
- **Options:**
  - **A.** Keep a slot for one hour from the key's first admission, including after failure. An active-key retry shares that slot and never renews its time. This bounds newly admitted keys to 10 per rolling hour. It can authorize attempts for 20 keys in one rolling hour. Repeated attempts of an active key have no count limit. After expiry, the key needs new capacity. Effort: Medium.
  - **B.** Use A's clock and retry rule, but release a slot after a definite non-acceptance. Keep it for an unknown result or observed acceptance. This bounds active retained slots to 10. It does not bound all admitted keys or provider attempts, because definite refusals free capacity. A's late-retry effect remains. Safe release needs per-key attempt state, so one refusal cannot free another attempt's slot. Effort: Large.
  - **C.** Use A's clock and retry rule, but release a slot after every unconfirmed outcome. Keep only in-flight or observed-acceptance slots, at most 10 active slots. Unobserved acceptances can then lead to many more authorized keys and possible emails. It provides no reliable bound on those unknown outcomes. Safe concurrent bookkeeping is still required. Effort: Large.
  - **D.** Count every authorized provider attempt, including each unchanged retry, for one hour. This bounds authorized attempts to 10 per rolling hour. The delivery key stays unchanged, so Resend can still suppress duplicate emails. Ten attempts of one draft can use the allowance without an observed acceptance. At capacity, an unchanged retry gets HTTP 429 even when the first attempt may have succeeded. Effort: Medium.
  - **E.** Keep one slot per delivery key for one hour after its latest authorized attempt. An active-key retry passes at capacity and renews the same slot. It never takes a second slot. This bounds keys with an authorized attempt to 10 per rolling hour. It does not bound repeated attempts of an active key. A harmless retry can extend another draft's wait, even when Resend sends no new email. Repeated retries can keep extending that wait. After an hour without an attempt, the key needs new capacity. Effort: Medium.
- **Left out:**
  - A counter only in the dialog or in memory fails the durable server limit.
  - A blanket 24-hour exemption for old keys allows old failed keys to bypass the current allowance.
  - Counting only a client draft ID is unsafe, because a crafted request can change the email body without changing that ID.
  - A provider webhook or a retained-message outbox adds routes, setup, or stored feedback content. It still needs a rule for unknown attempts while it waits.
  - Shared provider request-rate control remains parent item 5. It does not replace this feedback counting choice.
  - D is a real option. Counting a retry changes capacity, but does not change its provider key or necessarily send a duplicate email.
- **Wider fix:** E. Its renewed key reservation works for each failure type without classifying provider errors or writing delivery results afterward.
- **Previous examples:** `worker/app-api/feedback.test.ts` covers a lost reply, the same delivery key on retry, and one provider delivery. `worker/mail-sender.ts` currently maps provider refusal and request failure to the same feedback failure path.
- **Related:** This is local item 1, mapped to parent item 6. Parent item 5 owns the separate invitation and shared provider request-rate policy. A, B, C, and E do not cap repeated provider requests for an active key. This choice changes no invitation or approval limit.
- **Recommendation:** E. It bounds authorized keys while preserving an active-key retry at capacity. The fresh check replaced its earlier A recommendation after checking E. D instead bounds provider attempts, at the cost of charging every retry.
- **Action:** ask the user, because the approved record does not settle failed-attempt counting or whether a retry extends another draft's wait.

Common boundaries and sources:

- The 10-per-person threshold, feedback-only scope, HTTP 429, retry notice, and durable concurrent counter come from Cal's recorded option B and this task.
- Reusing the exact provider key comes from this task and the existing feedback protocol. A changed serialized email body makes a new key.
- Each bound above uses Worker-recorded authorization times. It does not count inbox delivery timestamps. A successful provider reply is only an observed acceptance.
- The existing feedback protocol records Resend's 24-hour key window. A retry after that period can cause another email. [Provider source](https://resend.com/docs/dashboard/emails/idempotency-keys).
- No email-service attempt occurs after failed input checks, a local log, or missing provider configuration. Those paths take no slot in the checked proposal.
- A slot expires exactly one hour after the timestamp that its option uses.
- Under E, one atomic D1 batch must expire stale rows, admit or renew, and read the result. An old inactive key must pass the capacity check.
- E renews with the later of the stored time and the attempt time. An older concurrent request must not move a row backward.
- Under E, an unknown result keeps the renewed slot. A failed database batch permits no provider request. A stopped Worker can leave a reserved slot.
- The parent's no-shared-code acknowledgement stays in force. No shared sender, generic HTTP helper, API client, shared error type, or shared cron change is authorized.
- The existing notice shows the server's calculated retry time. A later retry in another tab can change availability. Rounding avoids an early displayed time relative to that response, but cannot reserve future capacity.

Evidence: `.context/feedback-send-limit/options-check.md` and `options-e-check.md`. Both passes were read-only. No new tests or SQL execution ran for these proposals. The passed mockup and the existing independent check evidence remain intact.


## Milestone 1: Rate-limited dialog mockup

Tags: mockup

Depends on: none

- [x] Add the rate-limited state to the desktop and phone mockups without exceeding five screens per page.
- [x] Run `npm run mockups:check`. Inspect the actual desktop and phone output.
- [x] Update this design and its TODOs for any problem the mockup shows.

Evidence: `.context/feedback-send-limit/mockup-report.md`. The orchestrator also inspected the desktop and phone screenshots in both themes and the 375 × 667 phone.

## Milestone 1a: Align the mockup notes with the chosen rule

Tags: mockup

Depends on: 1 and Cal's answer to parent item 6

- [ ] Align the mockup notes with the chosen retry rule. Under E, explain that another allowed retry can move availability.
- [ ] Run the mockup check after the source notes change. Keep the reviewed screen and controls unless the chosen rule needs a visual change.
- [ ] Update the plan for any change the chosen rule needs.

## Milestone 2: Documentation

Depends on: 1a

- [ ] Update the feedback protocol for option B and its retry behavior.
- [ ] Read both legal pages and every public guide in full. Update any restated fact.
- [ ] Update the relevant area READMEs and the mockup catalogue.

## Milestone 3: Durable admission and regressions

Depends on: 2

- [ ] Add a forward migration and atomic per-person feedback admission.
- [ ] Preserve existing delivery keys and retry behavior. Return HTTP 429 with a useful retry time.
- [ ] Use `sendLimitBody` for the HTTP 429 message. Keep the copy and counter limit in one owner.
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
