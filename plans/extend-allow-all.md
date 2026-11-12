# Extend the 15 minutes of Allow all

Status: Active. On branch `calummoore/porto-4ubu`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

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

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The bar of the 15 minutes in the Mac app mockups gets Extend, and a state
for an Extend that failed.

- [ ] Add Extend beside Stop in `docs/mockups/src/components/mac/AllowAllBar.tsx`,
      in each state that shows the time left.
- [ ] Add the state `extend-failed`: the title Not extended, its cause, the
      time left, Stop, and Extend. Add its catalogue entry beside
      `mac-app/stop`.
- [ ] Update `docs/mockups/mac-app.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update `docs/protocol/desktop-commands.md`: the bar shows the time
      left, Stop, and Extend. Extend sets the end to 15 minutes from now,
      only while the grant runs. The page can answer a request that waits,
      and it can stop or extend a running grant. The settings results
      cover Extend.
- [ ] Read `src/marketing/terms.ts`, the Privacy pages, and the public
      guides under `src/marketing/docs/` in full. Update each sentence that
      restates the bar or what the user can change. Known lines:
      `terms.ts` near "stop the 15 minutes", `docs/mac-app.md` near
      **Stop**, and `docs/security.md` near "Timed permission".
- [ ] Check the rows of `src/marketing/from-conductor/` for a listed
      feature that this change ships.

## Milestone 3: Extend on the Mac and the Worker

Depends on: 2

- [ ] Add `{ action: 'extend-workspace'; workspaceId: string }` to
      `DeviceSettingsAction` in `src/shared/device.ts`.
- [ ] Accept it in `settingsAction` of `worker/devices/broker-routes.ts`
      and in `operation` of `desktop/src/device/messages.ts`.
- [ ] Add `extendWorkspace` to `desktop/src/device/permissions.ts`, and
      call it from `desktop/src/device/settings.ts`.
- [ ] Tests: Worker relay, message check, permission store (runs,
      ended, failed save, timer moves), and the session path.
- [ ] Update `worker/devices/README.md` and `desktop/README.md`.

## Milestone 4: Extend on the bar

Tags: ui

Depends on: 1, 3

- [ ] Add Extend to `src/chat/device/AllowAllBar.tsx` as the mockup draws.
- [ ] Give Extend its own control key and titles in
      `src/chat/device/settings-results.ts`.
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
