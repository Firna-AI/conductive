# The start loop

This page belongs to [Workspace Durable Object](workspace-object.md). It
gives the rules of one lifecycle run of a workspace start: how far the run
advances the start, when the next run comes, and when the start sets the
provider auto-stop.

- One lifecycle run can advance the start more than once. When an advance
  moves the start to a later phase in the order of [Creates and resumes](workspace-object.md#creates-and-resumes), the run advances it
  again at once. It does so only while the same start job exists, with no
  pending provider retry, no cancellation, and no failure. So the run that
  sees the sandbox ready, or sees a command exit, also begins the next
  phase. An advance that keeps the phase, or moves it back, such as from
  `ready` to `machine`, ends the loop. So a sandbox that still reads as
  stopped gets at most one resume call in each run. The move out of
  `records` also ends the loop, so the `machine` phase starts one second
  after the admission. The move to `runner` ends it too. One run makes at
  most 6 advances. The first advance always runs. The run starts no
  further advance when 5 seconds or more have passed since the run began.
  So slow earlier work in the same run, such as a retry of a create
  publication, never leaves a due start without progress. Each advance runs in full, with the access checks,
  the archive check, the time limit, and the start guard.
- The command phases are `fetch`, `branch`, `startup`, and `terminal`.
  When the start moves to the `ready` phase or to a command phase, it saves
  the time of the move in `waitStartedAt` in the start job. While a command
  phase waits for its running command, or the `ready` phase waits for the
  provider, the run sets the next start due time 250 milliseconds later.
  When 5 seconds or more have passed since `waitStartedAt`, it sets the due
  time one second later. A job without `waitStartedAt`, such as a job that
  an older Worker saved, gets one second. Other waits use their own due
  times. For example, a wait in the `machine` phase gets one second, and a
  pending [provider retry](provider-retries.md#the-retry-policy) waits
  until its retry time.
- The `ready` phase and the command phases set the provider auto-stop, as
  [The stop time](README.md#the-stop-time) says. They set it only when
  `autoStopSetAt` in the start job is missing or 60 seconds old or more.
  Each set saves its time in `autoStopSetAt`. The `ready` phase sets it
  only after the provider reports the sandbox ready. So the run that sees
  the sandbox ready and starts the first command makes one call. While a
  command runs, its polls set it again at most once a minute. So the
  provider does not stop the sandbox during a long command.
