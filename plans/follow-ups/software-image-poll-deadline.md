# Software image poll deadlines fail deploy runs

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from the deployed check of `plans/follow-ups/software-image-deployed-check.md`, branch `calummoore/follow-up-software-image-on-the-deployed-627v`. Updated on 2026-11-18 by branch `calummoore/follow-up-software-image-poll-deadlines-4dks`, which fixed the request-limit gap in the Worker.
- **Location:** `worker/software-image/poll.ts:8-81`, `boundedSoftwareImagePoll`, with the 20-second reply budget at line 9 and the 45-second network budget at line 11. `worker/software-image/route.ts:9-28`. `worker/software-image/build.ts:35-110`, `advanceSoftwareImage`, and `:112-156`, `requestSoftwareImage`. `worker/software-image/steps.ts:74-80`, the read of the command status. The tests `worker/software-image/poll.test.ts` and `worker/software-image/poll-admission.test.ts`. `.github/workflows/deploy.yml:394-471`, the step "Build software image", with the 900-second total wait at line 403 and the 30-second limit of each request at lines 410-411. `worker/sandbox/transport.ts:29-37`, the deadline of each provider call. `worker/software-image/resources.ts:8-47`. `worker/lifecycle/resource-intents.ts:62-107`. `worker/lifecycle/software-release.ts:29-63`, `latestSoftwareRelease`.
- **Reason:** the production D1 records and Worker logs are unread, because no read-only Cloudflare request was approved, and the check of the fix needs a deploy run after the merge.

- **Terms:**
  - **Software image:** one saved snapshot for each version of the app's own software. A first build of an org starts from it. `docs/protocol/sandbox-software.md`, section "The software image", gives its rules.
  - **Poll request:** one request of the deploy step "Build software image" to `POST /v1/deploy/software-image` on `api.conductive.build`. Each request advances the build in the Worker.
  - **Attempt:** one row of the D1 table `software_images`, one build of one software version. Its phases are `create`, `allocating`, `software`, `journal`, `snapshot`, `publish`, `cleanup`, and `done`.
  - **Provider:** the sandbox provider, Boat. Its API creates, reads, and saves the cloud computers.
  - **Transient provider error:** a provider error of the kind `unavailable`, `invalid_response`, `conflict`, or `rate_limited`. The attempt keeps its phase, and a later request tries again.
- **Background:**
  - The deploy step. The fix did not change it.
    - Two different limits apply to the deploy step. The request limit is 30 seconds for each poll request. The total wait is 900 seconds, or 15 minutes, for all requests together. Near the end of the total wait, the last request gets only the seconds that remain.
    - The step waits 10 seconds after each answer or failed request, then sends the next one. A request with no answer within the request limit counts as a network error. The step then tries again.
    - The step also retries the HTTP statuses 409, 429, and 5xx. It prints a phase only when the phase changes.
    - When the total wait ends with no `ready` answer, the result of the step is `timeout`. The job "Check the software image result" then fails the run. The new Worker stays live.
  - The fix in the Worker, on 18 November 2026.
    - The user chose a fix in the Worker. These stay unchanged: `.github/workflows/deploy.yml`, the request limit, the total wait, the ready-image gate, the 30-minute window of the deploy token, and the 60-minute time limit of a build.
    - Each poll request gets a reply budget of 20 seconds. The budget starts before the token check, the release lookup, and the admission of the attempt.
    - At 20 seconds, the route answers with the attempt as the request last read it from D1, and the output that the request collected. While the token check, the release lookup, or admission still runs, it answers the retryable `503 service_unavailable`.
    - `ExecutionContext.waitUntil` keeps the work running after the answer. The work then starts no new release lookup or provider call. A call that already runs can end, and the work saves its result.
    - A command status that arrives after the answer saves no output offset. So a later poll returns that output.
    - Each network call stops 45 seconds after the request starts, also a long journal command. Cloudflare keeps work for at most 30 seconds after the answer, so about 5 seconds stay for D1 writes.
    - Limits that stay: the fix makes no exactly-once promise for output. The deploy log can miss output when an answer is lost, or when an output save is in flight at the deadline.
    - The fix bounds the requests that get the full 30 seconds. The last request of the total wait can get less than 20 seconds, and can still end with no answer. The fix does not make the total wait longer.
    - Route tests use the local D1, the fake provider, fake timers, and captured event order. One test holds a provider create until its 30-second deadline. It expects the answer at 20 seconds, with the phase `allocating`.
    - Nobody has checked the fix on the deployed Worker yet.
  - History: the route before the fix.
    - The route first looks up the newest release on `runner.conductive.build`. That lookup has no deadline of its own. Then `requestSoftwareImage` advances the attempt step by step in the same request.
    - The request stops only when a step waits, a transient provider error stops it, or the attempt ends. Only then does the route answer. No deadline covers the whole request.
    - A provider call that passed its deadline failed with a transient provider error. The route then answered with the current phase.
    - In the phase `allocating`, the request saves the attempt in D1, then awaits the create of the sandbox. After a create succeeds, the same request saves the sandbox ID. It then goes on to the phase `software` and reads the state of the sandbox.
    - Proved by the code: the request limit of the step equals the deadline of one provider call. The step starts its 30 seconds before the Worker starts a provider call. So a provider call that uses its full deadline always ends after the step stopped waiting.
    - Also proved by the code: one slow provider call, plus the release lookup, the D1 work, and the answer, can pass the request limit. Several provider calls in one request can pass it too. The step then sees no phase and no error.
  - Still true after the fix.
    - The Worker gives each provider call 30 seconds. Only the operations `command` and `readFile` get more. A call that passes its deadline fails with a transient provider error.
    - In the phase `snapshot`, each request asks the provider to save the snapshot, or reads the saved snapshot. It answers `snapshot` with no output until the provider reports the snapshot as ready.
    - Allocation is bounded, because each provider call ends after its deadline. Repeated requests are safe. The create uses the idempotency key `software-image-<attempt ID>`, and the attempt row is saved before each create.
    - The D1 writes of an attempt are guarded by phase and revision. Cleanup finds a lost create through the same key. No evidence shows a duplicate or a leaked sandbox.
    - The Cron trigger also advances an unfinished attempt every 15 minutes. A newer deploy run ends an unfinished attempt of an older version.
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
  - The second shape again, after the item was added: run 44333489423 of 18 November 2026 deployed commit `ebf9474d2beb33ee85ef199431739d74169643ae`, release 0.0.1190, with the route before the fix. Its step ran from 15:20:46 to about 15:35:46 UTC, the full total wait.
    - Its first two requests got `HTTP 409`, at 15:20:46 and 15:20:57 UTC. The step then got the phase `software` at 15:21:10.389 and `snapshot` at 15:22:06.327 UTC. It never got `done`.
    - No request timed out, and the log has no network retry. So the snapshot did not finish in the last 13 minutes 40 seconds.
    - The job "Check the software image result" failed at 15:35:55.844 UTC with the same text as in the first shape.
  - On this route, only the deploy gate answers 409, `deploy_version_mismatch`. It does so when the digest in the body differs from the digest of the answering Worker. Run 44327146922 also got two 409 answers first. Suspected: the previous Worker version still answered.
  - Time from the first `snapshot` answer to `done` in the runs that passed. All except the first ran on 18 November 2026.
    - Run 42825346889, on 10 November 2026: 25 seconds.
    - Run 44315256641: 33 seconds.
    - Run 44315775655: 2 minutes 36 seconds.
    - Run 44321797542: 5 minutes 3 seconds.
    - Run 44327146922, commit `418026086`: 4 minutes 40 seconds. Its step ended with `ready` at 14:57:26 UTC, after 6 minutes 1 second.
    - Run 44332188331, commit `c3fcfa040416ac8a0edac0d1d593d482bcedbb7e`: 32 seconds, from 15:15:17.820 to 15:15:49.946 UTC. Its step took 2 minutes 10 seconds.
    - Run 44335096637, commit `456e53237c38ff800dbf076fb004f36b5c287554`: 1 minute 16 seconds, from 15:42:10.409 to 15:43:26.745 UTC. Its step ran from 15:41:16 to 15:43:26 UTC, 2 minutes 10 seconds.
    - So the snapshot time varies a lot between runs on the same day.
  - The protocol gives an attempt a time limit of 60 minutes, and lets it go on after the total wait ends. It also fails the deploy run when the image is not ready at the end of the total wait. So a snapshot that outlasts the total wait fails the run, as the protocol says. This breaks no requirement, but it is a limit of the current total wait.
  - Suspected, not confirmed: slow or failing provider allocation made the requests of run 44317924791 long. A slow release lookup or slow D1 work could also do it. The deploy log shows no provider call, time, or error.
  - Not known: why the snapshot of run 44324491251 took so long, and whether it became ready later. The log does not show whether the provider was slow or returned transient errors.
  - The same is not known for run 44333489423. The first request of run 44335096637, at 15:41:16 UTC, asked for a newer version. By the code, that request ended the older attempt if it was still unfinished.
  - No provider fault is confirmed.
  - No D1 record and no Worker log was read. On 18 November 2026, request `tYRBBRm_iSMmphxlaOdELglzW17Qh1UdU-ajReoF8Nw` for read-only Cloudflare access was still pending.
  - Later on 18 November 2026, request `3PJQ4hO1O0gs1nfOd74OnU7Cxi1I-AykiAUeaOYAL8Q` also stayed pending, and its command did not run. It used only the secret Cloudflare (read-only), through `run_with_secrets`. Its query selected the ID, state, phase, error, start, and end of the 24 newest attempts.
  - So the D1 records and the Worker logs are unread. Nobody knows whether they still exist.
  - These requirements stay:
    - `docs/protocol/sandbox-software.md`, section "The software image": each deploy run asks the Worker to build the software image of its version, and waits for the result.
    - The same section: the deploy run fails unless the image is ready when its wait ends. The new Worker stays live. A warning in place of the failure was rejected.
    - The same section: one software image build runs at a time. A failed build starts again only for a later deploy run. A build has a time limit of 60 minutes, and goes on after the wait of its deploy run ends.
    - `docs/automatic-deploys.md`, section "Steps of a run": the deploy run waits for the software image for up to 15 minutes.
    - `docs/protocol/access-and-security.md`, section "Hostnames and gates": the route accepts the deploy token only for 30 minutes after the Worker version was made.
    - Repeated requests stay safe, with the idempotency key of the create, the attempt row saved before each create, and the guarded D1 writes.
- **Task:**
  1. Use only the secret Cloudflare (read-only), through `run_with_secrets`. Get the user's approval only when the tool asks for it. An approval of the session stays valid. Run only reads, and change nothing in production.
  2. Read the attempts of the three failed runs in the D1 table `software_images`. They started near 13:56, 14:32, and 15:20 UTC on 18 November 2026. Select `id`, `version`, `state`, `phase`, `error`, `started_at`, and `completed_at`. First read the 24 newest rows, newest first. When those rows do not reach back to 13:50 UTC, also select the rows with `started_at` from 1795009800000 to 1795016700000. These Unix milliseconds are 13:50 and 15:45 UTC on 18 November 2026.
  3. Record the state, phase, error, start, and end of each of those attempts. Record whether each became ready later, or a newer deploy run ended it with "The software image build was replaced by another software version.".
  4. Read the Worker logs of `POST /v1/deploy/software-image` from 13:56 to 14:48 UTC and from 15:20 to 15:36 UTC on 18 November 2026, when they still exist. For each request, find its time in the Worker and the part that used it: the release lookup, D1, or a provider call.
  5. Record the status of each provider create and each snapshot call in those logs. Check whether the Worker went on with a request after the step closed it. These runs used the route before the fix.
  6. When a read finds nothing, record the query and its time range. A read of the newest rows alone cannot show that older records are gone. Record D1 records as gone only after the time-range read finds none.
  7. Report whether the snapshot times fit the total wait. Use the attempts in D1, the runs above, and the deploy runs after this item. When they do not fit, propose a change as a decision for the user. Do not change `.github/workflows/deploy.yml`, the request limit, the total wait, or the ready-image gate without that decision.
  8. When the findings confirm a fault of the provider, such as slow or refused creates or slow snapshots, record it in its own follow-up item.
  9. After the fix merges, watch the first deploy run that deploys it and builds a new software image. Check that its commit holds the fix. Check that no request with the full 30 seconds ends with `curl: (28) Operation timed out`. Check that the step shows progress and ends with `ready`. Record the run, its commit, and the time of each phase.
  10. When that run got each answer but ended with `timeout` in the phase `snapshot`, record it for the report on the snapshot times. Then watch the next such run.
- **Impact if no action:** Nobody knows whether the deployed fix answers each poll request in time. A slow snapshot can still outlast the total wait, as runs 44324491251 and 44333489423 showed. Such a run fails after 15 minutes with `timeout`. A person must then re-run the deploy, and the next deploy run waits up to 15 minutes more. First builds of new orgs install all of the app's own software until a software image of the newest release is ready. Without the production reads, the causes of the three failed runs stay unknown.
- **Needs:** read-only access to the production D1 database and the Worker logs, with only the secret Cloudflare (read-only), and the user's approval when the tool asks for it. Access to the GitHub Actions runs of `Firna-AI/conductive`. The merged and deployed fix, for the check of the next deploy run. A user decision before any change of the deploy workflow, the request limit, the total wait, or the ready-image gate.
- **Done when:** the causes of the three failed runs are recorded, or completed reads, with the time-range read of D1, record that D1 and the Worker logs no longer hold them. The report on the snapshot times and the total wait is recorded. Each change of the deploy workflow, the request limit, the total wait, or the ready-image gate has a user decision. The requirements above still hold. A deploy run with the fix that builds a new software image ends with `ready`, and each of its requests with the full 30 seconds gets an answer. Each confirmed provider fault has its own follow-up item. Then delete this item.
- **Related:** `plans/follow-ups/software-image-deployed-check.md` holds the remaining checks of the software image on the deployed app. Its new-org checks need a deploy run that passed, so a run that ends with `timeout` delays them. Its existing-record checks read the same attempt rows.
