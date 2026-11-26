# Provider switches

This guide belongs to the [lifecycle README](README.md). It describes the
hidden image build that moves new workspaces to another provider account.
The [Switch account protocol](../../docs/protocol/switch-account.md) holds
the requirements. The [operator API](../operator/README.md#provider-account-switches)
owns the request, its access check, and its retained record.

## Activation and rollback

The compatibility release ships all switch execution with `PROVIDER_SWITCH`
set to `"off"` in `wrangler.jsonc`. Only operator POST admission uses this
variable. Waiting member builds, execution, repair, Stop, and all reads
stay active when it is off.

Activation is a separate pull request that changes `PROVIDER_SWITCH` to
`"on"`. Merge it only after the compatibility release has been live for
at least one hour. After activation, a rollback must not cross before
that release while a switch is open or a member build waits for one.
Stop each open switch first. Confirm that no member build still waits
before crossing that release. [When a deploy fails](../../docs/automatic-deploys.md#when-a-deploy-fails)
gives the recovery steps.

## Admission and inputs

`progressProviderSwitch` reads the open switch and the executing job.
It ends only the job ID that the operator's saved choice names. The
ordinary build failure writer saves `SWITCH_STOPPED_BUILD` and its log.
Uncertain allocations retain their cleanup phase and ownership.

Without that choice, the switch waits for the executing job. It also
waits for an active org and an active admin. A switch with no good image
changes the org account without a build once no job executes. That
conditional account update and switch completion share one D1 batch.

The switch copies repositories and captured folders from the published
image. Each repository takes its saved name and default branch, as a refresh
does. Its install script and settings revision come from the newest
successful full build on that source account. A refresh can hold saved
script text that it never ran, so it does not supply these two inputs.

Admission records a full build of kind `build` on the target account.
Its `operator_switch_id` identifies the switch on every attempt. It pins
the matching ready software image of the target account, or starts from
that account's base. It records no previous image. An older org image on
the target account cannot become its starting image.

`insertBuild` checks the open switch, its source image, and the active
admin again in its atomic batch. It records the job and changes the
switch to `building` together. A competing admission joins the executing
build. No second hidden job can take the execution slot.

## Member build waits

An admin request during a switch records one member build. It captures
the requested settings and repositories. The row keeps kind `build` and
state `running`, so existing app clients can read it. A repeated request
joins that row. The first log event uses `WAITING_BUILD_LOG` from
[`build-switch-admission.ts`](build-switch-admission.ts).

The waiting row initially keeps the old org account and allocates no
computer. `waiting_for_switch_id` keeps it outside the executing-build
index and readers. Operator running-build counts exclude it too.

Admission and promotion include ended-switch repair in the same D1 batch
as their guarded account selection for member execution. Their SQL
also prevents execution while the org has a `building` switch whose
account remains unresolved. A race before the batch therefore retains
the member wait. A concurrent switch result cannot pin the old account
and then change the org account separately.

`promoteWaitingImageBuild` checks that no job executes. In that D1 batch,
it pins the org's current account and image, updates the job's previous
image account, clears the wait, and records `execution_started_at`.
Competing promotions cannot both take the execution slot. A build after
a failed or stopped switch uses the old account. A build after a good
switch uses the new account.

The public `startedAt` stays the request time. Build time limits and
provider retry deadlines use `execution_started_at`, with `started_at`
as the fallback for older rows. A waiting row has no execution deadline.
Build computer, Try again, and repository adds use this same admission.

A waiting row writes no [step records](image-builds.md#step-records).
Its job stays in phase `create` until promotion, so its first steps begin
at its allocation, after the wait. A hidden switch build writes the step
records of any build, and the shared end writer closes them.

## Publication, failure, and stop

The shared end writer publishes the target image, changes the org account,
completes the switch, and ends the build in one D1 batch. It checks the
active org, starter, current account, and current switch attempt. A stop
or suspension that wins first prevents later publication.

The old account's image stays. Its refresh deadline and pending push mark
clear at publication. Existing workspace records never change account.
A switch build takes `cleanup`, never `cleanup-build`, so it starts no
added build for unsaved settings or waiting repositories.

The failure writer saves the provider, script, or time-limit cause with
the switch end. A failed switch leaves the old account and its image.
Suspension instead leaves the switch waiting for an active org or admin.
All failed attempts keep their switch link and remain hidden.

Stop records its operator and time first. It then fails the hidden build,
tries cleanup, releases an eligible member wait, and schedules remaining
image work. Failed cleanup stays owned by its saved job.

### Results from an older coordinator

An older coordinator can end a hidden build without updating its switch.
Before selecting an executing job, `progressProviderSwitch` checks the
build of a switch that is still `building`.
[`repairEndedProviderSwitch`](provider-switch-repair.ts) reads its stored
result. A running build stays with ordinary progression.

One guarded D1 batch repairs an ended build. A success completes the
switch only while the target image names that build. It uses the normal
publication guards for the org, starter, deletion, and source account.
The completion depends on the account write changing one row in that
same batch. The old image keeps its snapshot and loses its refresh marks.
The target image keeps its pending push mark.

The batch changes `cleanup-build` to `cleanup`, so the hidden build starts
no added build. It retains every other cleanup phase and resource owner.
An account-write failure rolls back these changes too. Every write checks
the stored switch state, so a Stop committed before repair prevents
completion. A blocked publication leaves the account unchanged.
Deletion, org suspension, or starter suspension moves the switch to its
existing Restore, Lift, or admin wait. Another account change fails the
switch with the stored build's cause mapping. No ended attempt stays
`building` merely because its publication guard failed.

A failed build or a success that the target image no longer names fails
the switch when no suspension or deletion wait applies. Repair shares the
retained time-limit and provider-retry messages with `switchBuildFailureCause`
in the live failure writer. A generic
older error has no retained provider class and uses the existing `script`
fallback. Repair preserves the stored build-completion time. It records
the actual repair time as the account-change time.

Progression then reads the open switch again. A completed, failed, or
stopped switch no longer keeps the one-second switch alarm active.
Ordinary image cleanup and refresh scheduling continue.

## Member reads

`readBuildHistory` and `readBuildSnapshot` exclude operator switch rows.
The snapshot reader applies the org and visibility conditions to its log
query too. SSE uses that reader. Guessing a hidden ID gives the same
answer as an unknown build. `readBuildJob` remains an internal reader.

When the actual image pointer names a hidden build, the member reply uses
the newest visible successful build. Normal image pointers keep their
existing behavior. Script and repository notices still compare against
the real published inputs, including hidden copied inputs. This keeps a
saved script change visible after a switch.

## Wakes and pushes

The operator route, org Lift, user Lift, Restore after activation, and the
image alarm wake a waiting switch. User suspension can select another
active admin for a new attempt. The org deletion batch records a switch
as waiting for Restore. Every hidden build advance checks its switch and
suspension state before provider work.

A push during a switch marks both source and target image records in one
statement. The target mark survives publication and starts its refresh.
The source mark still serves a failed switch. Refresh discovery and
repository-change checks read only the org's current account. A failed
build on another account cannot block those checks.

`wakeProviderSwitch` arms the image coordinator before admission. A failed
wake keeps the switch and advances the D1 repair signal when an image row
exists. On every Cron run, repair also reads waiting and building switches
directly from `org_provider_switches`. It uses the existing active-org and
active-admin eligibility and the shared limit of 50 orgs. It does not need
a good image or an overdue refresh deadline.

Cron only schedules the image coordinator. It does not progress switches.
The next coordinator alarm resolves the result or resumes the wait. This
also restores a wake after an older idle scheduler saved a daily deadline.

## Key code

- [`provider-switch-builds.ts`](provider-switch-builds.ts): open-switch progression and target build admission.
- [`provider-switch-inputs.ts`](provider-switch-inputs.ts): published repository, folder, and installed script inputs.
- [`provider-switch-data.ts`](provider-switch-data.ts): wait and no-image completion writes.
- [`provider-switch-control.ts`](provider-switch-control.ts): wakes, stop, suspension, and advance fences.
- [`provider-switch-end.ts`](provider-switch-end.ts): guarded switch failure and publication statements.
- [`provider-switch-repair.ts`](provider-switch-repair.ts): guarded completion or failure of builds ended by older coordinators.
- [`provider-switch-repair-data.ts`](provider-switch-repair-data.ts): shared repair statements inside progression, member admission, and promotion batches.
- [`waiting-image-data.ts`](waiting-image-data.ts): queued member selection and atomic execution admission.
- [`build-switch-admission.ts`](build-switch-admission.ts): admission predicates, switch claim, and first waiting log.
