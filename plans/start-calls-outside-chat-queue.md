# Start calls outside the chat queue

Status: Active. On branch `calummoore/conductor-internal-tools-2d`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each workspace Durable Object runs every chat request, runner message, and
lifecycle change in one serial queue, `ChatStore.run`. The alarm advances
a sandbox start in that queue about once a second. Each advance makes
several D1 queries and one to three Boat requests while it holds the
queue. So each chat read that arrives during a start waits until the
advance ends. The protocol requires that the chat history shows at once
while a sandbox starts.

User decision, 11 November 2026: the review "Chat Loading Issue" in
Conductor workspace 614 gave item 2, "Chat requests wait behind the
sandbox start". The user chose option D: "Make the start call the
provider and the database outside the chat queue. The start then uses the
queue only to write its state." The rejected options were A, change
nothing and measure after the history fix, B, run the alarm less often
during a start, and C, run read-only chat requests outside the queue. The
reason: D is the wider fix, because it keeps the slow calls of the start
out of the queue. Item 1 of that review, larger history pages, goes in a
separate branch.

This change covers the progress phases of the start job, from `records`
to its success. It keeps the behaviour at every boundary. It does not
cover the failure path of a start or the other lifecycle work that holds
the queue.
[Other lifecycle calls hold the chat queue](follow-ups/lifecycle-calls-hold-chat-queue.md)
records that work.

Contract owners:

- [Start steps](../docs/protocol/workspace-life.md#start-steps): "The chat
  history shows at once while a sandbox starts."
- The [members README](../worker/members/README.md) and
  [lifecycle hooks](../worker/members/lifecycle-hooks.md): lifecycle
  phases capture their receiver generation before provider work. A
  suspension drains the pending starts and retains their sandbox IDs in
  D1.
- The [chat backend README](../worker/chat/README.md), with
  [History and event order](../worker/chat/history.md) and
  [The workspace lifecycle](../worker/chat/integration/workspace-lifecycle.md).
- The [workspace lifecycle README](../worker/lifecycle/README.md), with
  [Workspace Durable Object](../worker/lifecycle/workspace-object.md) and
  [The object alarm scheduler](../worker/lifecycle/alarm-scheduler.md).

## Design

Terms:

- **Queue turn:** one piece of work that holds the chat queue, from
  `ChatStore.run` in `worker/chat/store.ts`.
- **Outside call:** a D1 or Boat call, or a group of them, that a queue
  turn makes after it gives the queue up.
- **Start job:** the stored record of the running start,
  `lifecycle:start-job`, in `worker/lifecycle/start-storage.ts`.
- **Advance:** one alarm step of the start,
  `WorkspaceStartCoordinator.advance` in
  `worker/lifecycle/start-coordinator.ts`.
- **Receiver fence:** the member record `members:lifecycle-fence`, with
  its mode and generation, in `worker/members/receiver-fence.ts`.

Design calls, each made by the agent on 11 November 2026. A read-only
plan review on the same day found four flaws in the first version. Calls
4, 5, 9, and 10 hold the corrections. Call 11 fixes one more case of the
same class. A second review pass found one more flaw, and call 12 fixes
it.

1. **The start steps outside for each call.** The start keeps its code and
   holds the queue for its storage reads and writes, as today. For each
   outside call, the turn gives the queue up, makes the call, and waits at
   the back of the queue again. Reason: the storage work between two calls
   stays atomic, as today. A call that the change misses stays slow, but
   it stays correct. The start already recovers from a lost reply after
   each call, because the object can restart at any await. Rejected:
   - The pattern of Continue in `worker/lifecycle/continue.ts`, where the
     work runs outside the queue and each group of reads and writes
     enters it in one callback. Each storage group of the start would need
     its own callback. A group that the change misses would run outside
     the queue, so a miss would break correctness, not only speed.
   - A separate Durable Object for the start. It adds a class, a
     migration, and RPC hops, and it still needs the same checks.
   - A wrapper that steps outside in every D1 and Boat call of the start.
     Some of these calls run inside a lifecycle lane, such as the
     `serial` chain of `DurableLifecycle`. A turn that holds the queue can
     wait for that lane, so a call outside it deadlocks.
2. **A queue turn handle.** `ChatStore.run` gives each turn a handle. Its
   `outside(call)` reports the committed turn ends, gives the queue up,
   runs the call, and joins the back of the queue. An error of the call
   comes back after the turn holds the queue again. `settled()` and a new
   `idle()` also wait for each turn that is outside. The handle lives in
   a new file, because `store.ts` has 297 lines.
3. **The receiver generation belongs to the turn.** Today `withGeneration`
   in `worker/chat/workspace-integration.ts` keeps one shared variable,
   and it restores the earlier value at the end. That is correct only
   while one turn runs at a time. The generation becomes a value of the
   turn handle. The guarded storage and the Boat fetch check read the
   generation of the turn that holds the queue. During an outside call,
   that is another turn or no turn. So the start guard checks the
   generation of the start's own turn, before and after each call.
   Reason: a turn that is outside must not lend its generation to the
   turns that run meanwhile.
4. **The start guard.** Before each outside call, in its turn, the start
   reads the start job and the stop epoch. It also checks that the
   receiver fence is active and has the generation of its turn. After the
   call, in its turn again, it reads them again. When a value changed, the
   call throws `StartSuperseded`. The advance then ends with no write, as
   after a lost reply. The lifecycle run sets the start due time one
   second later, and the next advance continues from the stored job.
   Reason: a stop, an archive, a suspension, a failed runner readiness
   check, and a new start each change one of these records.
   - The lifecycle state is not part of the guard, because the runner,
     the input activity, and the start steps change it often. So after
     its last outside call, each start step reads again, in the same
     turn, each lifecycle value that its next write depends on.
   - The success of a start depends on the runner connection. So
     `prepareStartSuccess` reads the connection after its user check, in
     the turn that prepares and completes the start. When the runner is
     not connected, the start job stays, and the runner phase waits.
     Reason: else a runner that disconnects during the check leaves the
     workspace `starting` with no start job and no time limit.
5. **No swallowed guard.** Each `catch` around an outside call rethrows
   `StartSuperseded`: the catch of `advanceOwned`, the catch of
   `allocateWorkspace`, and the start catch of `runWorkspaceAlarm`. A
   `catch` inside one outside call cannot see the guard, because the
   guard runs after the call. `StartJobStorage.complete` takes the
   attempt of its job and ends only that job. Reason: a late result must
   never write after a stop, or end a newer start.
6. **Allocation is one outside call.** The ledger intent, the create
   request, the ledger record of the returned ID, and `assignSandbox` run
   in one outside call. The `persist` write of the encrypted request stays
   before it, in the turn. Reason: a drain must retain each sandbox ID in
   D1, so a create reply must always reach the ledger and the workspace
   row. Archive also finds the saved request in the start job, and it
   recovers the same sandbox from it.
7. **The `accepting` chain goes.** `WorkspaceStartCoordinator` keeps a
   chain for the admission and each advance. The queue already serializes
   both. `StartJobStorage.begin` also refuses when a start job exists.
   Reason: an advance that steps outside while it holds the chain
   deadlocks with an admission that holds the queue and waits for the
   chain.
8. **The drains wait for the outside turns.** `WorkspaceMembersReceiver`
   calls `idle()` in `suspend`, `restore`, and `remove`, after its fence
   write and outside any turn. Reason: the members contract requires that
   a drain ends the pending start phases and retains their sandbox IDs.
   A fence also never gets a new active generation while a turn is
   outside.
9. **Calls in a lane stay inside.** The start steps outside only in the
   coordinator and the start phase files. It never steps outside in a
   controller method, a `DurableLifecycle` method, or another lane. These
   stay in the queue:
   - The lifecycle state write, with the D1 projection of the shown state
     in `worker/lifecycle/workspace-state-projection.ts`. This is the
     state write that the user decision keeps in the queue. The queue also
     keeps the order of the D1 state and its `workspace.updated` events.
   - The admission of a start, the runner readiness check, and the D1
     publication of a create result. Each runs once for each start.
10. **The failure path stays inside.** When the advance handles a
    cancelled or failed job, or catches an error, it makes no outside
    call. Reason: the failure path detaches the sandbox in D1 and deletes
    it at Boat. Archive can retain that sandbox meanwhile, and a guard
    after the call cannot undo the delete. The failure path runs once for
    each start.
11. **The token write stays inside.** `ensureWorkspaceToken` runs in the
    turn in the `records` and `machine` phases. Reason: Archive revokes
    the workspace token in a turn. A token write from an outside call can
    land after that revoke and make the token active again. The other D1
    writes of the outside calls stay correct when they land late: Archive
    recovers the same sandbox ID, and the start makes no later write.
12. **Archive stops after the start.** When Archive ends a running start,
    it runs only its first phase in that turn. Its later phases, with the
    provider stop, run in the next lifecycle run of the alarm. Reason: a
    resume, a create, or a command of the start can still be on its way to
    Boat. A guard after the call cannot undo a resume. A lifecycle run
    starts only after the earlier run and its outside call end, so the
    final stop of Archive comes last. A Stop, an access stop, and a member
    suspension already wait for the start.

## Milestone 1: Documentation and protocol

Depends on: none

The change keeps the behaviour at every boundary, and the start steps of
`docs/protocol/workspace-life.md` already require that the chat history
shows at once while a sandbox starts. So no protocol doc changes.

- [x] Search `docs/protocol/`, `docs/architecture/`,
      `docs/architecture.md`, `src/marketing/terms.ts`,
      `src/marketing/privacy.ts`, `src/marketing/docs/`, and
      `src/marketing/from-conductor/` for statements about the chat queue
      or the calls of a start. Confirm that none changes. Save the search
      under `.context/start-calls-outside-chat-queue/`.

Evidence: `.context/start-calls-outside-chat-queue/docs-search.txt`.

## Milestone 2: Queue turns that step outside

Depends on: 1

Add the turn handle and the turn generation. No production code steps
outside yet, so the behaviour stays.

- [x] Merge `origin/main` into the branch with the `git-merge` skill.
- [x] Keep each changed file under 300 lines. On `origin/main`,
      `worker/workspace-lifecycle.ts` has 300 lines, `worker/chat/store.ts`
      297, `worker/chat/backend.ts` 296, and
      `worker/chat/workspace-integration.ts` 289. Split before you add.
- [x] Add the queue turn handle with `outside(call)` in a new file under
      `worker/chat/`, as design call 2 says. Make `ChatStore.run` pass it
      to its work.
- [x] Make `settled()` and the new `idle()` wait for each turn that is
      outside. Keep `settled()` returning the same promise while no turn
      starts or ends, or change the drain of
      `worker/test-support/native-workspace-entry.ts`, which compares
      promise identity.
- [x] Pass the handle through `WorkspaceChat.runLifecycle` and
      `WorkspaceLifecycle.run`.
- [x] Keep the receiver generation on the handle, as design call 3 says.
      Update `withGeneration`, the guarded storage, and the Boat fetch
      check in `worker/chat/workspace-integration.ts`.
- [x] Add unit tests of the handle:
  - [x] A turn that is queued during an outside call runs before the
        caller continues.
  - [x] The caller continues after the turns that were queued before its
        call ended, and before later turns.
  - [x] An error of the call reaches the caller after its turn holds the
        queue again.
  - [x] `idle()` and `settled()` wait for a turn that is outside.
  - [x] Another turn sees no generation of a turn that is outside.
- [x] Update the serial queue bullets of `worker/chat/history.md`.

## Milestone 3: Drains wait for the outside turns

Depends on: 2

- [x] Call `idle()` in `suspend`, `restore`, and `remove` of
      `worker/members/workspace-receiver.ts`, as design call 8 says.
- [x] Update the drain sentences of `worker/members/README.md`.

## Milestone 4: The start steps outside the queue

Depends on: 2, 3

- [x] Add `StartSuperseded` and the start guard of design call 4 in a new
      file under `worker/lifecycle/`.
- [x] Remove the `accepting` chain, and make `begin` refuse when a start
      job exists, as design call 7 says. Keep the epoch guard control of
      `worker/test-support/native-lifecycle-controls.ts` correct without
      the chain.
- [x] Pass the turn from `alarmLifecycle` through `controller.alarm` and
      `runWorkspaceAlarm` to `starts.advance`.
- [x] Run each D1 and Boat call group of the progress phases as one
      outside call with the guard:
  - [x] `start-coordinator.ts`: the archive read, the user checks, the
        provider client, and the workspace read, before the failure path
        starts.
  - [x] `start-records.ts` and `creation-admission-response.ts`: the D1
        reads and writes before and after the controller calls. The token
        write stays in the turn, as design call 11 says.
  - [x] `start-machine.ts`, `start-progress.ts`, and
        `start-command-execution.ts`: the token, settings, and
        environment reads, and each Boat call. The token write stays in
        the turn.
  - [x] `start-allocation.ts` and `resource-intents.ts`: one outside call,
        as design call 6 says.
  - [x] `start-completion.ts`: the user check of `prepareStartSuccess`.
        Then read the runner connection in the turn, as design call 4
        says.
- [x] Keep the failure path in the queue, as design call 10 says.
- [x] Make `WorkspaceArchive.begin` in `worker/lifecycle/archive-state.ts`
      run only its first phase when it ends a running start, as design
      call 12 says.
- [x] Rethrow `StartSuperseded` in the three catches of design call 5.
      Make `complete` check the attempt.
- [x] Make `runWorkspaceAlarm` set the start due time one second after a
      superseded advance.
- [x] Keep each changed file under 300 lines. On `origin/main`,
      `worker/lifecycle/archive-state.ts` has 298 lines,
      `worker/lifecycle/start-storage.ts` 294,
      `worker/lifecycle/workspace-controller.ts` 293, and
      `worker/lifecycle/start-coordinator.ts` 287. Split before you add.
- [x] Add hooks to `LifecycleBoat` in
      `worker/lifecycle/lifecycle-boat-test-support.ts`. One holds a
      successful create reply. Today `afterLostCreate` only holds a lost
      reply. One holds a resume request before the fake applies it.
- [x] Add integration tests with the production `Workspace`. Each test
      holds a Boat reply with the hooks of `LifecycleBoat`. Each asserts
      the event order, with a polling deadline of 10 seconds and no
      elapsed-time assertion:
  - [x] A history read settles while the reply of a start step is held.
  - [x] Archive during a held resume request, before the fake applies
        it, ends the start as stopped. No start step follows the archive
        event. The next lifecycle run stops the sandbox, and Archive
        records it as retained only after that stop.
  - [x] A member suspension during a held create reply keeps the sandbox
        ID in the ledger and in the workspace row. The start writes
        nothing after the suspension.
  - [x] A runner disconnect during the user check of the success keeps
        the start job. A later readiness report completes the start.
  - [x] A Resume during a held reply settles and adds no start job.
- [ ] Update the known limit of
      `worker/chat/integration/workspace-lifecycle.md`, and update
      `worker/lifecycle/workspace-object.md`,
      `worker/lifecycle/alarm-scheduler.md`,
      `worker/lifecycle/key-code.md`, and `worker/lifecycle/tests.md`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

- [ ] Run each new asynchronous test 10 times. Save the pass counts under
      `.context/start-calls-outside-chat-queue/`.
- [ ] Run the targeted tests, `npm run test -- worker/chat worker/lifecycle
      worker/members`, and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decision and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment at `conductive.build`, open the chat of a
      workspace while it resumes. In the Network tab of the browser,
      confirm that the `history` requests end while the start steps still
      run.
