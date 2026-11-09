# Hibernate workspace connections

Status: Active. On branch `calummoore/workspace-open-error`, no pull request yet.
This is a plan-only change. Implementation waits for approval of this plan.
The pull request that completes the work deletes this plan.

Conductive keeps a Durable Object for each workspace and another for each
connected Mac user. Standard WebSockets and recurring timers keep these
objects active while idle. The free daily duration allowance ran out on
9 November 2026. Workers Paid restored access, but idle duration remains.

On 9 November 2026, the user chose hibernation after the runtime cost discussion.
This plan moves the browser, runner, and Mac server sockets to Cloudflare's
hibernation API. Live updates, existing clients, and access checks continue.
There is no screen change, so this plan has no mockup milestone.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#events).
- [Agent runner](../docs/protocol/agent-runner.md).
- [Access and security](../docs/protocol/access-and-security.md#orgs-and-workspaces).
- [Operator actions](../docs/protocol/operator-actions.md#workspace-tokens-and-runners).
- [Mac app](../docs/protocol/desktop-app.md#mac-commands).
- [Agent tools](../docs/protocol/agent-tools.md#mac-commands).
- [Workspace lifecycle](../docs/protocol/workspaces-and-sandboxes.md#stop-and-resume).
- The [chat README](../worker/chat/README.md), [device README](../worker/devices/README.md),
  and [security README](../worker/security/README.md).

## Chosen approach

### 1. Idle connections hold runtime capacity

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** performance.
- **Location:** `worker/chat/sockets.ts`, `worker/security/connection-access.ts`, and `worker/devices/broker-routes.ts`.
- **Terms:**
  - **Durable Object:** Cloudflare's service instance that owns one workspace or one user's Mac connection.
  - **Hibernation:** Cloudflare keeps accepted sockets connected while an idle service leaves memory.
- **Background:** Workspace services deliver live chat and runner events. A separate service relays each user's Mac commands.
- **Problem:** Their ordinary accepted sockets and recurring timers prevent idle sleep.
- **Impact if no action:** Idle connected services continue to consume paid runtime as more users connect.
- **Root question:** How should Conductive reduce idle runtime while keeping live workspace and Mac connections?
- **Options:**
  - **A.** Keep the transports and close unused apps manually. Savings depend on each user's habits. Effort: Small.
  - **B.** Disconnect hidden pages and replay on return. Background updates arrive later, and other connection types still hold runtime. Effort: Medium.
  - **C.** Use hibernatable server sockets and durable alarm checks. Restore connection state on wake while keeping existing clients and live delivery. Effort: Large.
  - **E.** Add Worker-owned terminal and preview bridges to C. This removes another workspace sleep blocker, but needs routing, isolation, and long-lived Worker CPU checks. Effort: Large.
- **Left out:** D, separate proxy Durable Objects, moves the bridge duration charge instead of reducing it. Slower checks alone leave ordinary sockets active. Removing access checks fails the security requirements. Moving the whole backend drops the user's choice of Cloudflare hibernation.
- **Wider fix:** C. A shared native socket lifecycle and alarm scheduler replace callback-owned connection lifetime for all three server socket roles.
- **Previous examples:** Existing chat adapter tests preserve storage through eviction. They reconnect clients, so they do not prove hibernation with retained sockets.
- **Recommendation:** C. It is the approach the user selected and preserves the current live connection behavior.
- **Action:** fix now, apply C after plan approval. The user selected hibernation on 9 November 2026.

The options keep live event ordering, replay, and access revocation from the
protocols. They keep Cloudflare as the host because the user selected its
hibernation approach. Separate tool proxy ownership is not selected by that
choice. Worker-owned bridges remain option E, rather than an implicit part of C.
The options check on 9 November 2026 confirmed C and added E.
It also clarified the alarm and auto-response constraints below.
Its report is `.context/hibernation/options-check.md`.

## Design

### Connection state

Design call, 9 November 2026: keep the wire formats and protocol versions.
Older Mac clients and runners from existing images must keep working.
Use the existing Durable Object class and namespace without a D1 migration.

Accept native browser, runner, and Mac server sockets through the object context.
Dispatch native message, close, and error events by a trusted socket role.
All three roles use the existing serialized operation queues.
The constructor must restore native connections before an RPC, alarm, or
socket event uses them. Restoration must not start model work or repeat a handshake.

Use small, typed socket attachments for identity, role, generation, and
transport cursors. Keep metadata inside Cloudflare's attachment capacity.
Use existing durable records, or explicit durable delivery state, for data
that can grow. Do not put transcripts or unbounded command ID sets in attachments.
Do not copy session cookies, workspace bearer tokens, agent logins, or env values there.

Restoration preserves the current runner connection ID and Mac pairing.
It sends no second `welcome`, `device.connected`, or browser history replay.
Replacing a connection still invalidates the older connection.
Closing sockets that remain visible to the platform cannot restore older authority.
Restore file-report delivery and in-flight file request ownership too.

Keep already saved chat, command, and repair records readable. Hibernation
does not clear their prefixes, reset event numbers, or alter acknowledgement rules.
Actual disconnect, process eviction with socket closure, and hibernation
remain separate paths, with their existing recovery and cleanup semantics.

### Access and alarms

Design call, 9 November 2026: preserve the current access and liveness timing.
Browser and runner checks retain their 15-second cadence.
Browser grants retain their 30-second deadline and checks before each send.
The Mac retains its 10-second heartbeat and 30-second lease.
Mac session checks retain at least their existing heartbeat cadence.
Commands and results still check current access before they reach another component.

Move socket-lifetime timers into the existing shared `WorkspaceAlarms` helper.
Schedule the earliest access check, grant expiry, lease expiry, and command deadline.
Coexist with lifecycle, device, preview, and GitHub alarm sources.
A late alarm or failed access read must not extend a stale grant.
Use stored deadlines and the current clock when the object wakes.
Access, grant, lease, and command deadline work must run despite an early
return that pauses member or lifecycle work. It must not depend on a
lifecycle write succeeding. Keep provider and lifecycle writes fenced,
and close stale transports even when their org is deleted or paused.

Let Cloudflare answer the existing exact Mac heartbeat with an auto-response.
Configure this response only for a verified Mac broker object.
Do not install it unconditionally in the shared workspace constructor.
Browser and runner objects must not inherit a Mac heartbeat response.
Use its last auto-response timestamp for lease freshness after wake.
Automatic pongs grant no command permission and cannot replace session checks.
Preserve sleep, sign-out, replacement, and command watchdog behavior.

Short-lived requests may still keep the object active. Examples are a
settings reply, an activity write, a model timeout, and an active proxy.
Do not discard their pending promises or weaken their limits to force sleep.
Genuine in-flight work finishes through its current completion path.

### Tool proxy boundary

Terminal and preview bridges retain their current behavior in this change.
Their outbound sockets cannot hibernate and may keep their workspace active.
No terminal is disconnected because a panel hides or a connection becomes idle.
No running terminal command is sacrificed to obtain a lower duration number.
The Mac broker remains a separate object that can sleep independently.
Document and measure this limit instead of claiming that every open workspace sleeps.

### Replacement and compatibility

Replaced ways:

- Ordinary server acceptance and event listeners for the three socket roles
  become native hibernation acceptance, handlers, and state restoration.
  Consumers: chat sockets, browser registrations, runner channel and delivery,
  Mac broker, device routing, workspace composition, and their fixtures.
  Move and remove each old role path in its milestone below.
- In-memory socket-lifetime access timers for browser and runner connections
  become durable alarm deadlines. Move their production and test consumers
  with the socket roles. Keep timer helpers that terminal or preview code still uses.

The generic peer interfaces and memory-only feature tests may remain when
they still test the same live behavior. They are not a second production
socket transport. Remove a temporary bridge by the end of the plan.
The existing external wire format remains the sole format throughout.

## Milestone 1: Documentation and contract check

Depends on: none

Explain the new transport ownership and verify the requirements before implementation.

- [ ] Read the contract owners in full, including runner token revocation and Mac command cancellation.
- [ ] Update the chat, device, and security READMEs for native socket restoration, alarm ownership, and testing entry points.
- [ ] Document the active terminal and preview limitation in the relevant area README.
- [ ] Keep protocol requirements unchanged when only internal mechanics change.
      Raise any new boundary choice before dependent code starts.
      If a protocol or architecture fact changes, read both legal pages in full and update restated facts.
- [ ] Keep deferred runner liveness and preview activity decisions outside this change.

## Milestone 2: Native lifecycle and Mac broker

Depends on: 1

Introduce the shared native transport with the contained Mac role first.

- [ ] Add trusted socket roles, bounded attachments, native event dispatch, and restoration at the workspace boundary.
- [ ] Convert the Mac broker socket and restore its existing pairing without calling its new-connection path again.
- [ ] Preserve durable pending commands and current connection authority across wake.
- [ ] Add heartbeat auto-responses, timestamp-based lease freshness, and alarm-driven session checks at the preserved cadence.
- [ ] Scope auto-responses to Mac broker objects, including after restoration.
- [ ] Keep settings request promises, command deadlines, approvals, and replacement behavior intact.
- [ ] Extend existing native device integration cases for wake, replacement, expired access, and command completion with the original socket.
- [ ] Remove the Mac role's old ordinary-accept and callback handlers after its consumers move.

## Milestone 3: Browser events and access grants

Depends on: 2

Move live browser tabs to the native lifecycle while retaining ordered delivery.

- [ ] Convert browser event acceptance and restore registrations, tab identity, and grant deadlines.
- [ ] Move browser refresh and expiry timers to shared alarm deadlines.
- [ ] Preserve history-first admission, event ordering, duplicate prevention, and stopped or archived chat access.
- [ ] Preserve sign-out, removal, suspension, and expiry handling before history and every live send.
- [ ] Run security deadlines despite paused, deleted, or stale lifecycle fences, without bypassing the fences on lifecycle writes.
- [ ] Extend the native chat integration case to deliver new events to the original browser socket after forced hibernation.
- [ ] Extend existing access cases to cover wake with expired or revoked access, using the fixture clock and alarm controls.
- [ ] Remove the browser role's old ordinary-accept and lifetime-timer path after all consumers move.

## Milestone 4: Runner transport and delivery

Depends on: 3

Make runner wake transparent to the wire protocol and accepted turns.

- [ ] Convert the runner socket and restore its stream, readiness, token hash, connection ID, and file channel binding.
- [ ] Preserve delivery progress without an unbounded socket attachment or a new acknowledgement format.
- [ ] Move runner token timers to shared alarm deadlines and keep current checks before delivery and login release.
- [ ] Preserve runner cursor, confirmation, retry, repair, model, interrupt, and turn de-duplication behavior across wake.
- [ ] Extend native runner integration cases for output and command delivery through the original socket after wake.
- [ ] Verify wake does not restart a turn, resend an ended turn, lose file results, or revive a replaced runner.
- [ ] Verify a Mac heartbeat cannot bypass runner message authorization through an inherited auto-response.
- [ ] Remove the runner's old ordinary-accept and lifetime-timer path after all consumers move.

## Milestone 5: Combined behavior and local smoke check

Depends on: 4

Verify the full workspace composition and the retained active-work limits.

- [ ] Check every production server socket role and timer caller for a leftover old role path.
- [ ] Verify lifecycle, access, lease, preview, and GitHub deadlines coexist in the shared alarm helper.
- [ ] Check close and error cleanup runs once, including after wake and connection replacement.
- [ ] Run a native smoke check with browser, runner, and Mac sockets through wake and live operations.
- [ ] Verify terminal and preview bridges continue to work and retain their documented active duration behavior.
- [ ] Record the allowed idle case with no active proxy or unfinished request. Do not promise a measured saving before runtime evidence exists.

## Verification design

The pinned Miniflare package exposes
`unsafeEvictDurableObject(worker, className, { name, webSockets: 'hibernate' })`.
Use it to retain the original client sockets while a new object instance restores state.
The existing adapter restart helper omits `webSockets`, so its reconnect
case remains useful but cannot replace the new retained-socket case.

Use a test-only fixture construction marker to prove a wake occurred.
Keep this instrumentation out of production routes and wire frames.
Exercise the product entry points, existing stores, native sockets, and alarm helper.
Align the fixture clock with captured platform auto-response timestamps.
Use readiness signals and explicit event order, without wall-clock sleeps or elapsed-time assertions.

Extend existing requirement tests rather than adding a separate test for every input.
Prove each new case fails on a meaningful assertion without its restoration change.
Run new asynchronous cases 10 times and record their cost under `.context/hibernation/`.
Do not add tests for this plan or third-party framework internals.
Native API inspection evidence is in `.context/hibernation/miniflare-api.txt`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: 5

- [ ] Run targeted native device, chat, access, file, and lifecycle tests for the changed behavior.
- [ ] Run typecheck, lint, format, file length, and export checks. Keep TypeScript files below the repository's line limit.
- [ ] Install the root, desktop, and runner check dependencies, then run the complete `npm run check` gate.
- [ ] Verify every relative link of changed Markdown and record native smoke and test evidence under `.context/hibernation/`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push.
      Fix the `fix now` findings, record deferred or open findings under `plans/follow-ups/`, re-review once, and report.
- [ ] Delete this plan under the `plans` skill when the implementation is complete.
- [ ] Open the pull request. Preserve this plan's dated choices, a permalink, and follow-up items in its description. Wait for applicable CI.

## Post-merge follow-up (non-blocking)

- [ ] Verify browser, existing Mac client, and an older-image runner on the deployed change.
- [ ] Compare per-object duration during representative idle and active periods. Separate Mac, workspace, and active proxy workloads.

## Platform references

- [Hibernatable WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
- [Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).
- [Native socket state and automatic responses](https://developers.cloudflare.com/durable-objects/api/state/).
