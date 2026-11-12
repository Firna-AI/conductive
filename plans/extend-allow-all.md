# Extend the 15 minutes of Allow all

Status: Active. [PR #326](https://github.com/Firna-AI/conductive/pull/326) is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

In the Mac app, the choice "Allow all commands for 15 minutes" lets every
command from one workspace run on that Mac without asking (decision 62).
While the grant runs, a bar on the workspace shows the time left and Stop.
The user cannot add time. When the 15 minutes end, the next command asks
again, so an unattended agent stops until the user answers. This change
adds **Extend** beside **Stop**. Extend sets the end of the running grant
to 15 minutes from the moment that the Mac applies it. It does not start a
grant. It does not cover the This Mac section of the account page.

Contract owners:

- [Mac commands](../docs/protocol/desktop-commands.md).
- The [device README of the web app](../src/chat/device/README.md).
- The [device README of the Worker](../worker/devices/README.md).
- The [Mac app README](../desktop/README.md).
- The [Mac app mockup notes](../docs/mockups/mac-app.md).

## Decisions

### 1. How the user extends the 15 minutes

Answered by the user on 12 November 2026: **B**.

- **Root question:** How does a user keep "commands run without asking"
  going past its end, with no gap?
- **Options:**
  - **A.** Each command that runs moves the end to 15 minutes from that
    moment. Rejected: a busy agent keeps the grant alive while nobody
    watches, and it drops the fixed 15 minutes of decision 62.
  - **B.** Chosen. An Extend button beside Stop on the bar. It goes to the
    Mac as a settings change, like Stop. The Mac sets the end to its own
    time now plus 15 minutes, only while the grant runs.
  - **C.** A longer choice, such as 1 hour. Rejected: it does not extend
    a running grant, and it changes the four choices of decision 62.
- **Left out:** Change nothing, because the user must wait and approve
  again. A restart of the grant through the 15-minute choice, because no
  request asks while a grant runs. A native Extend in a Mac menu or a
  notification, because it cannot sit on the bar and is no safer while
  approvals already go through the Worker. B on its own route, because it
  is as safe as B and costs more. B with a confirm dialog, because the
  user rejected dialogs for requests.
- **Security:** Extend is the first settings change that grants. A
  compromised Worker could keep a running grant alive. It can already do
  more: it can send a request and approve it
  (`desktop/src/device/session.ts`). The Mac keeps the limits: it acts only
  on a grant that runs by its own clock, never starts one, takes the end
  from its own clock, and ignores a repeated operation ID.

### 2. Which result the bar shows when two stay

Open: waits for the user's answer. The mockups of Milestone 1 raised it on
12 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/desktop-commands.md`, section "Settings
  results", and `src/chat/device/AllowAllBar.tsx`.
- **Terms:**
  - **Grant:** the 15 minutes in which every command from one workspace
    runs on the Mac without asking.
  - **Control key:** the key under which the web app keeps the wait and
    the last result of one control, from `controlOf` in
    `src/chat/device/settings-results.ts`.
- **Background:** The bar has one line for a result. A Stop result stays
  until the next Stop. Extend gets its own control key, so a failed Extend
  stays until the next Extend while the grant runs. A failed Stop keeps
  the grant, so the bar keeps Extend.
- **Problem:** A failed Stop and a failed Extend can both stay. The plan
  does not say which one the bar shows. The protocol says that a failure
  stays until the next change of its control.
- **Impact if no action:** Milestone 4 must guess. Then one failure can
  leave the bar against the protocol, or the bar grows without a design.
- **Root question:** How does the user see the result of a Stop and of an
  Extend when both stay?
- **Options:**
  - **A.** The bar shows the result of its last Stop or Extend. A done
    Extend shows none. A later press hides an older failure, so the
    protocol rule gets narrower for the bar. Effort: Small.
  - **B.** The bar shows the later of the results that show. A done Extend
    shows none, so an older "Not stopped" stays beside a new 15:00. Only a
    failed Extend hides a failed Stop. The protocol rule gets narrower,
    but less than in A. Effort: Small.
  - **C.** The bar shows each result that stays, one line each. The
    protocol rule stays as it is. The bar grows in a rare case, and the
    state needs a new mockup milestone. Effort: Medium.
  - **D.** Stop and Extend share one control key, so the bar has one
    result, as in A. A waiting Extend then makes Stop busy, against the
    design call that keeps them apart. Effort: Small.
- **Left out:** Another place for the Extend result, such as a toast,
  because a toast goes away and the protocol keeps a failure in view. Hide
  Extend while a failed Stop shows, because it does not cover a failed
  Extend that a failed Stop follows.
- **Wider fix:** None. The gap is one rule of one bar. This Mac lists one
  result for each command, so it has no such gap.
- **Previous examples:** None found.
- **Recommendation:** A. The user saw the older failure before the later
  press, Stop stays in the bar, and the rule is the simplest to state and
  to test.
- **Action:** Ask the user, because A makes the protocol rule narrower
  for the bar: a failure no longer always stays until the next change of
  its control. No user decision covers that.

### Design calls

My calls on 12 November 2026:

- Extend sets the end to now plus 15 minutes. It does not add 15 minutes
  to the time left. Reason: the Mac drops a saved end more than 15 minutes
  away when it loads its permissions (`desktop/src/device/permissions.ts`),
  and decision 62 fixes the length at 15 minutes.
- No cap on the number of Extends. Reason: each Extend needs a click, and
  a cap stops no attacker who can already approve a request.
- The label is "Extend", the user's word.
- Extend shows whenever the bar shows the time left and Stop.
- Extend reports done or failed. It never reports done but not saved. The
  Mac saves the new end first, and a failed save leaves the grant as it
  was, as for the other grants. Reason: a disk error must not leave a
  grant longer in memory than on disk without the user knowing.
- When the grant ended before the Mac applies Extend, the Mac reports
  failed and starts nothing.
- An Extend result shows only while the grant runs: Not extended with its
  cause. A done Extend shows no result text, because the time left shows
  the change. Extend gets no Try again, because the button stays.
- Extend has its own control key, so a waiting Extend does not make Stop
  busy, and the reverse.
- Extend goes on the bar only. The This Mac section can get it later.

Calls from the mockups of Milestone 1, on 12 November 2026:

- Extend sits between the time left and Stop. Reason: Stop keeps its
  place at the end of the bar, so a press where Stop was still stops, and
  Extend sits beside the time that it changes.
- Extend shows the `TimerReset` icon of lucide-react, a timer with a reset
  arrow. Reason: Extend starts the 15 minutes again from now. A plus icon,
  such as `ClockPlus`, would say that it adds time.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The bar of the 15 minutes in the Mac app mockups gets Extend, and a state
for an Extend that failed.

- [x] Add Extend beside Stop in `docs/mockups/src/components/mac/AllowAllBar.tsx`,
      in each state that shows the time left.
- [x] Add the state `extend-failed`: the title Not extended, its cause, the
      time left, Stop, and Extend. Add its catalogue entry beside
      `mac-app/stop`. The entry is `mac-app/extend`. Its first screen draws
      a done Extend at 15:00 left, without result text, and its `failed`
      state draws `extend-failed`.
- [x] Update `docs/mockups/mac-app.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update `docs/protocol/desktop-commands.md`: the bar shows the time
      left, Stop, and Extend. Extend sets the end to 15 minutes from now,
      only while the grant runs. The page can answer a request that waits,
      and it can stop or extend a running grant. The settings results
      cover Extend.
- [ ] State which result the bar shows when a Stop result and an Extend
      result both stay. Waits for decision 2.
- [x] Read `src/marketing/terms.ts`, the Privacy pages, and the public
      guides under `src/marketing/docs/` in full. Update each sentence that
      restates the bar or what the user can change. Known lines:
      `terms.ts` near "stop the 15 minutes", `docs/mac-app.md` near
      **Stop**, and `docs/security.md` near "Timed permission".
- [x] Check the rows of `src/marketing/from-conductor/` for a listed
      feature that this change ships.

## Milestone 3: Extend on the Mac and the Worker

Depends on: 2

- [x] Add `{ action: 'extend-workspace'; workspaceId: string }` to
      `DeviceSettingsAction` in `src/shared/device.ts`.
- [x] Accept it in `settingsAction` of `worker/devices/broker-routes.ts`
      and in `operation` of `desktop/src/device/messages.ts`.
- [x] Add `extendWorkspace` to `desktop/src/device/permissions.ts`, and
      call it from `desktop/src/device/settings.ts`.
- [x] Tests: Worker relay, message check, permission store (runs,
      ended, failed save, timer moves), and the session path.
- [x] Update `worker/devices/README.md` and `desktop/README.md`.

## Milestone 4: Extend on the bar

Tags: ui

Depends on: 1, 3

- [ ] Add Extend to `src/chat/device/AllowAllBar.tsx` as the mockup draws.
- [ ] Give Extend its own control key and titles in
      `src/chat/device/settings-results.ts`. The titles went in with
      Milestone 3, so that the typecheck passes. The key waits for
      decision 2.
- [ ] Show the results of Stop and Extend on the bar as decision 2 says.
      Test a Stop result and an Extend result in both orders in
      `AllowAllBar.dom.test.tsx`. Waits for decision 2.
- [ ] Support Extend in `src/chat/dev/dev-mac-settings.ts`.
- [ ] Tests in `AllowAllBar.dom.test.tsx` and `mac-settings.test.ts`.
- [ ] Update `src/chat/device/README.md`.
- [ ] Check the bar in the browser with the dev Mac.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
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
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed test site, use Extend in the Mac app and check that
      the time left goes back to 15 minutes.
