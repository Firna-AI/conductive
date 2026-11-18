# Software image poll deadlines fail deploy runs

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from the deployed check of `plans/follow-ups/software-image-deployed-check.md`, branch `calummoore/follow-up-software-image-on-the-deployed-627v`.
- **Location:** `.github/workflows/deploy.yml:394-471`, the step "Build software image", with the 900-second total wait at line 403 and the 30-second limit of each request at lines 410-411. `worker/sandbox/transport.ts:29-37`, the deadline of each provider call. `worker/software-image/route.ts:9-24`. `worker/software-image/build.ts:34-106`, `advanceSoftwareImage`, and `:108-162`, `requestSoftwareImage`. `worker/software-image/steps.ts:30-48` and `:107-119`. `worker/software-image/resources.ts:8-47`. `worker/lifecycle/resource-intents.ts:62-107`. `worker/lifecycle/software-release.ts:29-63`, `latestSoftwareRelease`.
- **Reason:** the causes need production D1 records and Worker logs, and the branch that found them changes only plans.

- **Terms:**
  - **Software image:** one saved snapshot for each version of the app's own software. A first build of an org starts from it. `docs/protocol/sandbox-software.md`, section "The software image", gives its rules.
  - **Poll request:** one request of the deploy step "Build software image" to `POST /v1/deploy/software-image` on `api.conductive.build`. Each request advances the build in the Worker.
  - **Attempt:** one row of the D1 table `software_images`, one build of one software version. Its phases are `create`, `allocating`, `software`, `journal`, `snapshot`, `publish`, `cleanup`, and `done`.
  - **Provider:** the sandbox provider, Boat. Its API creates, reads, and saves the cloud computers.
  - **Transient provider error:** a provider error of the kind `unavailable`, `invalid_response`, `conflict`, or `rate_limited`. The attempt keeps its phase, and a later request tries again.
- **Background:**
  - Two different limits apply to the deploy step. The request limit is 30 seconds for each poll request. The total wait is 900 seconds, or 15 minutes, for all requests together. Near the end of the total wait, the last request gets only the seconds that remain.
  - The step waits 10 seconds after each answer or failed request, then sends the next one. A request with no answer within the request limit counts as a network error. The step then tries again.
  - When the total wait ends with no `ready` answer, the result of the step is `timeout`. The job "Check the software image result" then fails the run. The new Worker stays live.
  - The route first looks up the newest release on `runner.conductive.build`. That lookup has no deadline of its own. Then `requestSoftwareImage` advances the attempt step by step in the same request.
  - The request stops only when a step waits, a transient provider error stops it, or the attempt ends. Only then does the route answer. No deadline covers the whole request.
  - The Worker gives each provider call 30 seconds. Only the operations `command` and `readFile` get more. A call that passes its deadline fails with a transient provider error. The route then answers with the current phase.
  - In the phase `allocating`, the request saves the attempt in D1, then awaits the create of the sandbox. After a create succeeds, the same request saves the sandbox ID. It then goes on to the phase `software` and reads the state of the sandbox.
  - In the phase `snapshot`, each request asks the provider to save the snapshot, or reads the saved snapshot. It answers `snapshot` with no output until the provider reports the snapshot as ready.
  - Allocation is bounded, because each provider call ends after its deadline. Repeated requests are safe. The create uses the idempotency key `software-image-<attempt ID>`, and the attempt row is saved before each create.
  - The D1 writes of an attempt are guarded by phase and revision. Cleanup finds a lost create through the same key. No evidence shows a duplicate or a leaked sandbox.
  - The Cron trigger also advances an unfinished attempt every 15 minutes. A newer deploy run ends an unfinished attempt of an older version.
  - Proved by the code: the request limit of the step equals the deadline of one provider call. The step starts its 30 seconds before the Worker starts a provider call. So a provider call that uses its full deadline always ends after the step stopped waiting.
  - Also proved by the code: one slow provider call, plus the release lookup, the D1 work, and the answer, can pass the request limit. Several provider calls in one request can pass it too. The step then sees no phase and no error.
  - First failure shape, lost replies: run 44317924791 of 18 November 2026 deployed commit `c3bae7b438ddafc66f0ca6bb24b0b3da46e62812`. Its step ran from 13:56:02 to 14:11:02 UTC, the full total wait.
    - From 13:56:32 to 14:08:32 UTC, 19 poll requests in a row ended with `curl: (28) Operation timed out after 30002 milliseconds with 0 bytes received`.
    - At 14:09:01, one request answered with the phase `allocating`. The log printed no later phase before the final request timed out. The step does not print each reply with an unchanged phase and no output.
    - The last request had 11 seconds left. It ended with `Operation timed out after 11000 milliseconds with 0 bytes received`.
    - The job then failed with "The software image step ended with timeout. A ready software image is required. The Worker is already live. Re-run all jobs to retry."
  - Second failure shape, slow snapshot: run 44324491251 of 18 November 2026 deployed commit `035a05cd93887bab69a09142258f24afd943aad6`. Its step ran from 14:32:52 to 14:47:52 UTC, the full total wait.
    - The step got the phase `software` at 14:32:57 and `snapshot` at 14:33:53. It never got `done`.
    - No request timed out, and the log has no network retry. The step printed nothing more, so each answer in that time gave `snapshot` again.
    - So the step got each reply, but the snapshot did not finish in the last 13 minutes 58 seconds.
    - The job then failed with the same text as in the first shape.
  - Time from the first `snapshot` answer to `done` in the runs that passed. All except the first ran on 18 November 2026.
    - Run 42825346889, on 10 November 2026: 25 seconds.
    - Run 44315256641: 33 seconds.
    - Run 44315775655: 2 minutes 36 seconds.
    - Run 44321797542: 5 minutes 3 seconds.
    - Run 44327146922, commit `418026086`: 4 minutes 40 seconds. Its step ended with `ready` at 14:57:26 UTC, after 6 minutes 1 second.
  - The protocol gives an attempt a time limit of 60 minutes, and lets it go on after the total wait ends. It also fails the deploy run when the image is not ready at the end of the total wait. So a snapshot that outlasts the total wait fails the run, as the protocol says. This breaks no requirement, but it is a limit of the current total wait.
  - Suspected, not confirmed: slow or failing provider allocation made the requests of run 44317924791 long. A slow release lookup or slow D1 work could also do it. The deploy log shows no provider call, time, or error.
  - Not known: why the snapshot of run 44324491251 took so long, and whether it became ready later. The log does not show whether the provider was slow or returned transient errors.
  - No D1 record and no Worker log was read. On 18 November 2026, request `tYRBBRm_iSMmphxlaOdELglzW17Qh1UdU-ajReoF8Nw` for read-only Cloudflare access was still pending.
  - These requirements stay:
    - `docs/protocol/sandbox-software.md`, section "The software image": each deploy run asks the Worker to build the software image of its version, and waits for the result.
    - The same section: the deploy run fails unless the image is ready when its wait ends. The new Worker stays live. A warning in place of the failure was rejected.
    - The same section: one software image build runs at a time. A failed build starts again only for a later deploy run. A build has a time limit of 60 minutes, and goes on after the wait of its deploy run ends.
    - `docs/automatic-deploys.md`, section "Steps of a run": the deploy run waits for the software image for up to 15 minutes.
    - `docs/protocol/access-and-security.md`, section "Hostnames and gates": the route accepts the deploy token only for 30 minutes after the Worker version was made.
    - Repeated requests stay safe, with the idempotency key of the create, the attempt row saved before each create, and the guarded D1 writes.
- **Task:**
  1. Read the attempts of both failed runs in the D1 table `software_images`. They started near 13:56 and near 14:32 UTC on 18 November 2026. Record the state, phase, error, start, and end of each. Record whether each attempt became ready later, or a newer deploy run ended it. The first query of `.context/software-image-deployed-check/read-d1-evidence.py` reads these fields for the 12 newest attempts. That file is git-ignored, in the workspace of the branch that added this item. Without it, select the same fields from `software_images`, newest first.
  2. Read the Worker logs of `POST /v1/deploy/software-image` from 13:56 to 14:48 UTC on 18 November 2026, when they still exist. For each request, find its time in the Worker and the part that used it: the release lookup, D1, or a provider call.
  3. Record the status of each provider create and each snapshot call in those logs. Check whether the Worker goes on with a request after the step closes it.
  4. Reproduce the request-limit gap in a test with the local D1 and the fake provider. Use fake clocks and captured event order for a provider create that reaches its deadline. Assert the response outcome and order, without real sleeps or elapsed wall-clock assertions.
  5. Fix the request-limit gap. Choose the fix from these findings. After the fix, each poll request gets its answer within the request limit, also when one provider call uses its full deadline.
  6. Report whether the snapshot times fit the total wait. Use the attempts in D1 and the deploy runs after this item. When they do not fit, propose a change as a decision for the user. Do not raise the 15-minute wait or skip the ready-image gate without that decision.
  7. When the findings confirm a fault of the provider, such as slow or refused creates or slow snapshots, record it in its own follow-up item.
  8. After the fix merges, watch the next deploy run. Check that the step shows progress and ends with `ready`.
- **Impact if no action:** A provider call that uses its full deadline can make every poll request of a deploy run end with no answer. A slow snapshot can outlast the total wait. In both cases the run fails after 15 minutes with `timeout`. In the first case, its log shows no phase and no provider error. A person must then re-run the deploy, and the next deploy run waits up to 15 minutes more. First builds of new orgs install all of the app's own software until a software image of the newest release is ready.
- **Needs:** read-only Cloudflare access to the production D1 database and the Worker logs, for the reads of the attempts and the requests. Access to the GitHub Actions runs of `Firna-AI/conductive`.
- **Done when:** the causes of both failed runs are recorded, or the record says that D1 and the Worker logs no longer show them. A test shows that each poll request gets its answer within the request limit, also when a provider create uses its full 30 seconds. The report on the snapshot times and the total wait is recorded. Each change of the total wait or the ready-image gate has a user decision. The requirements above still hold. A deploy run after the fix ends with `ready`. Each confirmed provider fault has its own follow-up item. Then delete this item.
- **Related:** `plans/follow-ups/software-image-deployed-check.md` holds the remaining checks of the software image on the deployed app. Its new-org checks need a deploy run that passed, so a run that ends with `timeout` delays them. Its existing-record checks read the same attempt rows.
