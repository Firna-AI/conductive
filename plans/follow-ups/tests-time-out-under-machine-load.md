# Tests time out under heavy machine load

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the branch `calummoore/chat-title-rename`, where several agents ran tests, a mockup build, and Chrome on one machine at the same time.
- **Location:** `worker/chat/retry.test.ts`, `worker/chat/retry-queue.test.ts`, `worker/lifecycle/runner-environment.test.ts`, `worker/lifecycle/disk-retention.test.ts`, `worker/operator/suspension-race.test.ts:20`, two Git tests of the agent runner under `runner/src/`, `worker/tools/sessions.test.ts:48`, `worker/chat/adapter.test.ts`, `worker/lifecycle/skills-environment.test.ts`, and `worker/lifecycle/image-lease-builds.test.ts`.
- **Reason:** The original branch changed none of the first five tests. Each passed alone and in two complete gate runs.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Complete gate:** `npm run check`, which CI runs on each pull request.
- **Background:** On 8 November 2026, a machine with 4 CPUs and 8 GB of memory ran two agents' targeted tests, a mockup build, and a headless Chrome capture at the same time. These failures came only under that load:
  - `worker/chat/retry.test.ts`, "rejects a stale second tab after newer queued, running, finished, and failed work": `Test timed out in 15000ms`. Alone it took 1,796 ms.
  - `worker/chat/retry-queue.test.ts`, "commits retry eligibility with a failed turn at both commit boundaries": `Test timed out in 15000ms`. Alone it took 2,341 ms.
  - `worker/lifecycle/runner-environment.test.ts`: `Test timed out in 15000ms`, then its worker ran out of memory and stopped with SIGABRT.
  - Two existing Git tests of the runner: `Test timed out in 5000ms`.
  Each test passed alone, and the complete gate passed twice on the same machine with no other load.
- On 10 November 2026, the main merge into `calummoore/waitlist-global-toggle-brainstorm` ran selected tests beside type, lint, format, file-length, app-build, and mockup checks. `worker/lifecycle/disk-retention.test.ts > keeps a stopped disk through startup and stop failures without a stale stop after user open` failed with `Error: Test timed out in 15000ms.` The other 170 tests passed. Both tests of that file then passed alone with no assertion or timeout change. This branch changes neither that test nor its lifecycle implementation. The suspected source is machine load during the native fixture work.

  On 10 November 2026, CI run `42780530781`, attempt 1, ran the complete gate on commit `3503d628` of the branch `calummoore/workspace-open-error`. Its app and Worker suite ran 704 files: 2,016 tests passed, 2 failed, and none was skipped. One failure was this timeout:
  - `worker/operator/suspension-race.test.ts:20`, "cancels an in-flight allocation and cleans its delayed computer after actor recovery": `Error: Test timed out in 15000ms.`

  The other failure of that run was an assertion. The [completed native-harness record](https://github.com/Firna-AI/remote-code/blob/02ae69421b4b128eba6b1041d829e99f221cd360/plans/follow-ups/tests-fail-under-load.md) preserves it. Main commit `5386af5a` fixed that harness and deleted its record. That branch changed no timeout or assertion of this test. The test file and each module that it imports directly equal `main` at `8567cfb6`. Modules that those imports reach in turn changed on that branch, such as `worker/features/alarms.ts`.

  On the same commit, the unchanged file then passed alone in a local run: 3 of 3 tests, with no skip, in 5.09 seconds. The case then passed three more local runs alone, with no failure. Each of those runs selected only this case by name, so each reported the 2 other tests of the file as skipped. The await that blocked, the cause, and the load of the CI machine are not known. A pass alone does not show that load caused the timeout.
- On 11 November 2026, branch `conductor/background-work-keeps-turn-open-implementation` ran selected contract tests beside type, lint, format, and file-length checks.
  The existing case at `worker/tools/sessions.test.ts:48` failed.
  Its name is "runs CLI session creation, reads, and replayed messages through the stored caller".
  Its error was `Error: Test timed out in 15000ms.`
  The run passed 18 tests and failed 2.

  The other failure was a new test of that branch.
  Its implementor changed it to a direct Worker tool client and kept its storage, restart, and transcript assertions.
  After the heavy checks ended, the existing CLI test passed its single rerun in 3,235 ms.
  All 20 selected tests passed that rerun, with no assertion or timeout change in the existing test.
  Machine contention is the suspected source, but the rerun does not prove the cause.
- On 12 November 2026, the merge of `origin/main` at `b1d68cd38` into
  `calummoore/porto-a8k1` met Worker timeouts in two complete gate attempts.
  The first checkout was under `/home/user/code/remote-code`.
  The second checkout was under `/tmp`, with the same tracked tree.
  Both attempts were interrupted after repeated Worker timeouts.
  The second attempt reported 31 failed cases before interruption.
  The affected areas included Continue, native browser access, Mac input,
  workspace publication, creation, archives, session reads, and model requests.
  No Worker, shared-type, package, or lockfile change differs from that main commit.
  A baseline checkout of `b1d68cd38` then ran
  `npm run test -- worker/features/continue-routes.test.ts` alone.
  Its only case, "resumes Continue through real routes and socket wake, fences sends and Archive, expires recovered credentials, and routes new-branch GitHub events",
  failed with `Error: Test timed out in 15000ms.`
  It also failed in both merged-tree gate attempts.
  The baseline took 18.13 seconds in total.
  This reproduces the failure outside the merge diff and outside the home folder.
  The blocked await and the cause remain unknown.
  Machine load is not established as the cause of these failures.
- On 13 November 2026, a selected device suite on `calummoore/porto-4ubu` timed out in two unchanged Worker cases:
  - `worker/devices/lifecycle.test.ts`, "relays all four approval choices only from the paired desktop session": `Error: Test timed out in 15000ms.`
  - `worker/devices/request-key.test.ts`, "uses hashed URL keys for dot retry IDs while device frames keep their exact IDs": `Error: Test timed out in 15000ms.`
  The files match main at `b409ef7f2a63de3065ed756e66871a3a3491aa85`.
  Both files then passed unchanged together: 9 tests, no failures or skips, in 59.72 seconds.
  Machine contention during native fixture work is suspected. The blocked await and the cause are not established.
  The selected suite also found a malformed Extend result in the branch's settings relay test data. That test data was corrected separately.
- On 13 November 2026, the branch `calummoore/oslo-tq4m`, which then changed no Worker file, ran the complete gate on a machine with 4 CPUs and 8 GB of memory, beside a dev server and a headless Chrome. 113 Worker test files failed, most with `Test timed out in 15000ms`. The 440 files of the web app and the 88 files of the runner passed. A rerun of the 113 files with `--maxWorkers=2`, beside two review agents, failed each of the first 71 files again. Then a test worker hung for over an hour next to a defunct `workerd` process, with a load average near 0, and the run was stopped. `worker/app-api/feature-shell-sections.test.ts` passed alone two times, and a reviewer saw it time out alone while the rerun ran. `worker/lifecycle/continue-native.test.ts` failed for another reason: its test helper rewrote each `/home/user` of a command, also the fixture folders of a checkout under `/home/user`. The same branch fixed that helper.
- On 13 November 2026, the branch `calummoore/milan-ofz5` ran test files on 4 CPUs that other sessions shared, with a load near 5.
  `worker/lifecycle/workspace-runtime.test.ts:47` timed out at its own 20-second limit, at about 21 s.
  It did so in 2 of 2 runs on the branch, and in 1 of 1 run on its merge base `c194159bf`.
  The branch changes no line of that test. Machine load is the suspected source.
- On 15 November 2026, the main merge into `calummoore/perth-lc63`
  passed static checks, builds, and all 275 runner tests.
  Its full app and Worker test run was interrupted after 45 Worker files
  reported failures, mostly `Error: Test timed out in 15000ms.`
  The run used an exact source copy under `/tmp` to avoid home-folder
  fixture rewriting and cross-device rename errors.
  A clean copy of main at `09be0b3df` then ran these two files alone:
  - `worker/features/continue-routes.test.ts`, "resumes Continue through real routes and socket wake, fences sends and Archive, expires recovered credentials, and routes new-branch GitHub events".
  - `worker/chat/integration/failed-first-start-retry.test.ts`, "retries the same failed workspace with a fresh token and dispatches every stored message once in order".
  Both failed with `Error: Test timed out in 15000ms.`
  This reproduces these two failures outside the merge.
  It does not establish the cause of the other failures.
  The blocked awaits and the cause remain unknown.
  Machine load is not established as the cause.
- On 16 November 2026, the conflict repair after merge `24b23ea74` on
  `calummoore/quito-0ojg` ran eight selected workspace files.
  The run passed 24 tests and failed two with
  `Error: Test timed out in 15000ms.`
  The failing cases were:
  - `worker/features/continue-routes.test.ts:33`,
    "resumes Continue through real routes and socket wake, fences sends and Archive, expires recovered credentials, and routes new-branch GitHub events".
  - `worker/lifecycle/archive-lifecycle.test.ts:79`,
    "restores without starting, orders same-time transitions, and resumes with a fresh token".
  A separate checkout of `origin/main` at `eedd83679` ran those two files.
  Continue timed out there too, while all seven archive tests passed.
  A second run of the archive file on the repaired branch passed six tests
  and timed out in the same restore/resume case.
  This repair changes no test or timeout.
  The blocked await and cause remain unknown.
  The runs overlapped other checks, but machine load is not an established cause.
- On 16 November 2026, the main merge into `calummoore/lima-gc9c` ran the complete gate without another test run beside it.
  The suite passed 3,310 tests and reported two lifecycle timeouts:
  - `worker/lifecycle/ownership-maintenance.test.ts`, "retries a revoked-token stop after active ownership and preserves maintenance before a fresh resume": `Error: Test timed out in 15000ms.`
  - `worker/lifecycle/disk-retention-time-limit.test.ts`, "ends an unready retention restart at its original deadline through phase changes, reconstruction, and stop retries, then permits user resume": `Error: Test timed out in 15000ms.`
  Both files match `main` at `eedd836791eaf1793563a4fc4ad207398cdc60a1`.
  Both files then passed unchanged together: six tests, no failures or skips.
  The same rerun included the marketing site file, which failed setup with the separate known cross-device rename error.
  Machine contention during native fixture work is suspected. The blocked await and the cause are not established.
- On 16 November 2026, the merge of `origin/main` at `a20746b99` into
  `calummoore/quito-oqn7` passed every static check and 54 targeted endpoint
  tests. The local complete gate was interrupted after repeated timeouts
  in six unchanged Worker test files. The interrupted run also reported
  the 12 tests of `worker/marketing/built-site.test.ts` as skipped.
  A rerun of the six failed files with `VITEST_MAX_WORKERS=2` finished:
  15 tests passed and 12 failed. These cases failed:
  - `worker/devices/lifecycle.test.ts > relays all four approval choices only from the paired desktop session`.
  - `worker/features/continue-routes.test.ts > resumes Continue through real routes and socket wake, fences sends and Archive, expires recovered credentials, and routes new-branch GitHub events`.
  - `worker/lifecycle/archive-lifecycle.test.ts > restores without starting, orders same-time transitions, and resumes with a fresh token`.
  - `worker/lifecycle/published-image-creation.test.ts > creates from captured image repositories while current settings and selection change`.
  - `worker/lifecycle/workspace-publication-retry.test.ts > keeps the original idle alarm after a stored creation result retries its D1 publication`.
  - `worker/lifecycle/workspace-publication-retry.test.ts > stops at the original idle deadline while the completed creation still needs publication`.
  - `worker/lifecycle/workspace-publication-retry.test.ts > retains an older creation publication retry after a resume completes`.
  - `worker/lifecycle/workspace-publication-retry.test.ts > recovers publication during runner wait without moving the resume deadline`.
  - `worker/lifecycle/workspace-publication-retry.test.ts > stops a suspended owner while the completed creation still needs publication`.
  - `worker/lifecycle/workspace-publication-retry.test.ts > recovers a stored creation publication from a legacy lifecycle alarm`.
  - `worker/lifecycle/workspace-publication-retry.test.ts > releases start and publication alarms after archive removes their records`.
  - `worker/chat/integration/failed-first-start-retry.test.ts > retries the same failed workspace with a fresh token and dispatches every stored message once in order`.
  The failures were `Error: Test timed out in 15000ms`, except the
  legacy lifecycle alarm case. Its reset failed with `Timed out waiting
  to evict Durable Object: it still has active references`, and its
  cleanup failed with `TypeError: fetch failed` and `UND_ERR_SOCKET`.
  A clean detached checkout of `a20746b99` then ran the Continue routes
  file alone with `VITEST_MAX_WORKERS=1`. Its only case also failed with
  `Error: Test timed out in 15000ms` in an 18.91-second run. This proves
  that the Continue failure occurs without the merge. All six failed
  test files match that main commit. The other failures were not checked
  on a clean main checkout. Native runtime or storage delays are a
  suspected source; neither the blocked await nor the cause is known.
- On 16 November 2026, the main merge into `calummoore/perth-lc63`
  ran five Worker files from `/home/user/code/remote-code`.
  Six tests passed. `worker/chat/recorded-events.test.ts`,
  "stores provider-neutral partial text, tools, completion, stop, and failure",
  failed with `Error: Test timed out in 15000ms.`
  It failed again alone from that folder.
  Clean main at `57e504daa` passed the case from a temporary checkout
  in 13.44 seconds for the complete test command.
  The same temporary checkout then received the exact merged app and
  Worker sources. The case passed in 13.37 seconds, with all assertions kept.
  This comparison does not establish why the runs under `/home` timed out.
  No assertion, test timeout, or gate configuration changed.
- On 16 November 2026, a second merge into `calummoore/quito-0ojg`
  integrated `origin/main` at `6b82e7e6a`.
  The conflicts affected this evidence file and two files from the
  Conductor comparison page that main removed.
  Typechecks, lint, formatting, export checks, all 89 SDK-helper tests,
  the app build, and the strict mockup build passed.
  The full Vitest run was interrupted after more than 21 minutes of
  repeated native runtime failures. It had reported 104 failed cases
  across 48 files and skipped all 12 cases of
  `worker/marketing/built-site.test.ts` after its setup failed.
  Each of those 49 files matched the fetched main commit.
  Examples include the Continue route, archive/resume, browser access,
  multipart reports, workspace publication, device approval, and routine tests.
  This was partial verification, with no complete suite pass count.
  GitHub CI and Desktop passed on that main commit.
  The test environment's blocked awaits and failure causes remain unknown.
  A focused run of six marketing and secrets files then passed six cases,
  timed out in three, and skipped the 12 marketing cases after setup failed.
  The timeouts were:
  - `worker/app-api/capabilities.test.ts:26`, "lets each member change workspace capabilities and remove only the selected session approval".
  - `worker/app-api/create-capabilities.test.ts:28`, "saves the app capabilities with its workspace and keeps those choices on a repeated create".
  - `worker/devices/mac-access.test.ts:70`, "ends every waiting Mac request when access turns off and keeps a running command through its result".
  Each reported `Error: Test timed out in 15000ms.`
  Marketing setup reported `EXDEV: cross-device link not permitted` while
  Astro renamed an asset from `.astro/.prerender/` into `/tmp`.
  This is the existing issue in [`plans/follow-ups/built-site-test-cross-device-rename.md`](https://github.com/Firna-AI/conductive/blob/af68ff544c64b86351a731daa79e48c2a790e93b/plans/follow-ups/built-site-test-cross-device-rename.md).
  Running that marketing file with `TMPDIR` inside the ignored `.context/`
  folder passed all 12 cases in 8.83 seconds, with no code or test edit.
- On 16 November 2026, the main merge into `calummoore/delft-i3g7`
  passed every static gate step and 275 selected tests.
  The complete Vitest run was stopped after 39 failed cases across
  16 completed Worker test files. The run is partial.
  The files cover Continue, startup retries, device approval, publication,
  archive, workspace lifecycle, image sources, model endpoints, and previews.
  All 16 files match main at `699027931e00f214ef4ba734cdfd0907093590a7`.
  `worker/features/continue-routes.test.ts` then failed alone on the
  merged tree with `Error: Test timed out in 15000ms.`
  Its only case, "resumes Continue through real routes and socket wake,
  fences sends and Archive, expires recovered credentials, and routes
  new-branch GitHub events", also failed alone in a clean detached checkout
  of that main commit with the same error.
  The merged-tree rerun took 26.15 seconds. The main run took 22.65 seconds.
  This proves that the Continue timeout occurs without the merge.
  The other failures were not reproduced on main in this attempt.
  The blocked await and cause remain unknown.
- On 17 November 2026, the main merge into `calummoore/oslo-3u7a`
  ran four selected test files beside Rust compilation, lint, and format checks.
  Eleven tests passed and these two cases failed with
  `Error: Test timed out in 15000ms.`:
  - `worker/lifecycle/runner-environment.test.ts`, "captures fresh resume settings, preserves the ready computer capture, and pins retention settings after rotation".
  - `worker/lifecycle/skills-environment.test.ts`, "sets skills at create and refreshes them at each resume, overriding org env vars also when invalid or removed".
  Both files then passed together without competing checks: six tests,
  no failures or skips, in 34.44 seconds. No assertion or timeout changed.
  The runner-environment file matches main at
  `94924b6d59c57d5a230eb2350e84f2869c653c19`.
  The skills file belongs to the skills feature of this branch; the merge
  did not change it. Contention during native fixture work is suspected.
  The blocked await and the cause are not established.
- The complete gate on that merged tree then passed every static check
  and all 121 SDK helper tests. The app and Worker suite passed 4,012
  tests and failed two, with no skipped tests. These cases failed with
  `Error: Test timed out in 15000ms.`:
  - `worker/chat/adapter.test.ts:24`, "serves the actual Durable Object with SQLite storage and authenticated WebSockets".
  - `worker/lifecycle/image-lease-builds.test.ts:15`, "keeps a leased image until its workspace starts across a replacement publication".
  Both files match main at `94924b6d59c57d5a230eb2350e84f2869c653c19`.
  A rerun of just these two files without competing checks passed the chat
  adapter case and timed out in the image case again.
  A clean detached checkout of that main commit then ran the image file
  alone. Its only case also failed with `Error: Test timed out in 15000ms.`
  in a 32.66-second run. This proves that the image failure occurs without
  the merge. No assertion, fixture, timeout, or test configuration changed.
  No further local image-test attempt ran after these three failures.
  Native runtime or storage delays are suspected; the blocked await and
  the cause remain unknown.
- On 17 November 2026, the next main merge into `calummoore/oslo-3u7a`
  integrated `989adcb9319497507f9f6ab007ffdd3c094b1762`.
  The complete gate passed every static check and all 121 helper tests.
  The root suite ran all 1,280 files. It passed 4,170 tests and failed
  seven, with no skipped tests. Each failed with
  `Error: Test timed out in 15000ms.`:
  - `worker/lifecycle/added-repository-build.test.ts`, "starts one added build for a repository added during a successful build".
  - `worker/lifecycle/added-repository-build.test.ts`, "starts one added build for a repository added during a successful refresh".
  - `worker/devices/lifecycle.test.ts`, "relays all four approval choices only from the paired desktop session".
  - `worker/secrets/late.test.ts`, "turns an unfinished request late at turn end and starts its notice for the original sender".
  - `worker/lifecycle/published-image-creation.test.ts`, "creates from captured image repositories while current settings and selection change".
  - `worker/lifecycle/terminal-lifecycle.test.ts`, "starts and caches the terminal after startup at create and resume while retention starts no terminal".
  - `worker/lifecycle/account-routing.test.ts`, "replays a lost allocation and resumes its disk through the stored secondary account".
  All six files match that main commit. A single rerun of the six full
  files with `--maxWorkers=1` passed all 25 tests in 75.86 seconds.
  It skipped none. No competing check ran beside either run.
  No test, assertion, timeout, fixture, or gate configuration changed.
  The full run took 1,964.52 seconds. Native runtime or storage contention
  is suspected, but the blocked awaits and the cause remain unknown.
- On 18 November 2026, the branch `calummoore/kyoto-votd` ran the complete
  gate on a machine with 4 CPUs. The workspace runner used about 55% of
  one CPU, and the load average was about 5. Both tests of
  `worker/lifecycle/disk-retention.test.ts` failed with
  `Error: Test timed out in 15000ms.`: "keeps a stopped disk through
  startup and stop failures without a stale stop after user open" and
  "ends failed maintenance and refuses destructive resume of a normal
  errored workspace". Both failed again alone on the branch, and alone
  on a clean `main` at `c3bae7b43`, in 16.6 to 17.1 seconds. That branch
  changed no Worker file. The gate's test step then passed its 1-hour
  limit on that machine before it ended.
- On 20 November 2026, the main merge into `calummoore/perth-lc63`
  passed the full static gate and all 131 SDK-helper tests.
  The full app and Worker run was stopped after five timeouts in two files.
  Both files match main at `9c5f16cc281264c1f33b45e16abc33634eb5f63b`.
  A clean detached checkout of that main commit then ran both files.
  It reproduced all five failures and passed the sixth case:
  - `worker/features/continue-routes.test.ts`, "resumes Continue through real routes and socket wake, fences sends and Archive, expires recovered credentials, and routes new-branch GitHub events".
  - `worker/lifecycle/runner-environment.test.ts`, "captures the create branch, keeps turn values out of the sandbox variables, and masks legacy encrypted settings in its streamed start log".
  - `worker/lifecycle/runner-environment.test.ts`, "captures fresh resume settings, preserves the ready computer capture, and pins retention settings after rotation".
  - `worker/lifecycle/runner-environment.test.ts`, "uses the owner login in the Git system settings when the display name is null".
  - `worker/lifecycle/runner-environment.test.ts`, "uses the owner login in the Git system settings when the display name is only disallowed characters".
  Each failure reported `Error: Test timed out in 15000ms.`
  No test, assertion, timeout, or gate configuration changed.
  The blocked awaits and the cause remain unknown.
  The exact changed app and Worker test selection then passed 74 cases
  and timed out in four: adapter, recorded events, retry queue, and
  workspace summary. A broader selection also timed out in workspace
  creation, agent tool routes, and previews.
  A second clean-main comparison ran seven files: five cases passed,
  and these seven cases timed out with the same 15-second error:
  - `worker/chat/recorded-events.test.ts`, "stores provider-neutral partial text, tools, completion, stop, and failure".
  - `worker/chat/retry-queue.test.ts`, "does not make an older failure retryable after queued or stopped waiting work".
  - `worker/chat/retry-queue.test.ts`, "commits retry eligibility with a failed turn at both commit boundaries".
  - `worker/chat/workspace-summary.test.ts`, "recovers a legacy summary title and original turn end beyond the first history page".
  - `worker/tools/workspace-creation.test.ts`, "keeps one titled admission for overlapping creates and a lost reply after restart or changed defaults".
  - `worker/tools/workspace-creation.test.ts`, "replays the same failed first start without new workspace session message or provider allocation".
  - `worker/features/agent-tools-routes.test.ts`, "uses the active stored sender and inherited owner when a machine tool creates a workspace with a cleaned name".
  The adapter and preview files passed on main. They then passed unchanged
  together on the branch: three tests, with no failures or skips.
  The earlier failing adapter case was "serves the actual Durable Object
  with SQLite storage and authenticated WebSockets".
  The earlier failing preview case was "opens signed-in preview links and
  lists and closes member previews through the real workspace".
  Those two failures are flaky. Native runtime delays are suspected, but
  the blocked awaits and the cause remain unknown.
- **Problem:** These tests depend on wall-clock time limits, so a busy machine can fail them with no defect in the code.
- **Impact if no action:** A slow CI runner or a busy developer machine can fail the gate now and then, and a person must rerun it.
- **Root question:** How do these tests stay correct on a slow or busy machine?
- **Options:**
  - **A.** Find the slow step of each test, and replace each wait on time with a wait on an event or a fake clock, as the `testing` skill says. Effort: Medium.
  - **B.** Run the gate with fewer parallel workers, so one machine never runs this much at once. The gate takes longer. Effort: Small.
  - **C.** Change nothing, and rerun a failed gate. Effort: Small.
- **Left out:** A longer time limit. The `testing` skill needs the user's approval for it, and it hides the slow step.
- **Wider fix:** A. It removes the dependence on machine speed.
- **Previous examples:** `plans/follow-ups/start-time-limit-test-under-load.md` and `plans/follow-ups/harness-test-speed.md`. On 10 November 2026, on the branch `calummoore/mac-app-downloads-site`, the complete gate ran beside a review session that ran type checks. `worker/lifecycle/disk-retention.test.ts > ends failed maintenance and refuses destructive resume of a normal errored workspace` failed with "Error: Test timed out in 15000ms." It passed alone, and that branch changed no lifecycle file. Also on 10 November 2026, CI ran the complete gate of the pull request branch `calummoore/file-selector-list` at commit `823d4c0`, in run 42756364794, attempt 2. `worker/operator/suspension-race.test.ts > cancels an in-flight allocation and cleans its delayed computer after actor recovery` failed with "Error: Test timed out in 15000ms." at `worker/operator/suspension-race.test.ts:20:1`. Attempt 1 of the same run had passed it. It passed locally in the complete gate on that tree, and alone on `main` at `ab58467`. That branch changed no Worker file, so a CI runner can be the busy machine too.
- **Evidence of 20 November 2026:** on the branch `calummoore/delft-39rk`, in a workspace cloud computer with 4 CPUs and 8 GB of memory, native lifecycle tests timed out with no other load: both cases of `worker/lifecycle/start-branch-retry.test.ts`, the cases "reserves one actor for simultaneous creates before any workspace row exists" and "repairs a claim with no queued job and keeps successful retries independent of a later resume" of `worker/lifecycle/create-retry.test.ts`, the case "keeps a retried create behind failed-computer cleanup and preserves the replacement token and identity" of `worker/lifecycle/creation-failure-retry.test.ts`, and the case "recovers pending resume stop cleanup after native completion loses its caller" of `worker/lifecycle/start-completion-restart.test.ts`. Each failed with "Error: Test timed out in 15000ms.", also on unchanged `main` at `f681c8a6c` from a copy under `/tmp`. A measurement found a median durable write of 17.183 ms under the checkout, 21.250 ms under `/tmp`, and 0.001 ms on `/dev/shm`. The native SQLite commits of these tests wait on the disk. A trial that put the scratch folders of `worker/test-support/migrated-storage.ts` and `worker/test-support/native-global-setup.ts` on `/dev/shm` made all of these cases pass ten times in a row. That trial was not kept, because it moves every native test's data into memory on a machine that rebooted under memory pressure.
  - **D.** Put the native test scratch folders on `/dev/shm` on Linux, with a fall back to the temporary folder. Cost: test data then uses memory. Effort: Small.
- **Related:** `plans/follow-ups/worker-suite-timeouts.md`: the same class, and some of the same tests, such as those of `worker/lifecycle/disk-retention.test.ts`, in full-suite runs. One source can explain both items.
- **Recommendation:** A. Each test then fails only for a real defect.
- **Action:** ask the user, because these are tests of code outside the branch, and A and B each cost real time while the failures came only under unusual load.
