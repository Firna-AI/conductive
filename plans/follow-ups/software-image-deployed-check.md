# Check the software image on the deployed app

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, the post-merge tasks of the plan `plans/first-build-software-image.md`, branch `calummoore/global-snapshot-simplification`.
- **Location:** `worker/lifecycle/image-builds.ts:156-161` and `worker/lifecycle/build-admission-data.ts:72-93`, which pin the ready software image for a first build. `worker/lifecycle/build-software.ts:67-83`, `worker/lifecycle/image-packages.ts:35-46`, and `worker/lifecycle/software-bootstrap.ts:26-52`, which make the software step. The D1 tables `software_images`, `image_builds`, `image_build_jobs`, and `image_build_logs` of the production deployment.
- **Reason:** the remaining checks need read-only production D1 access, and a person who signs in and creates a test org.

- **Terms:**
  - **Software image:** one saved snapshot for each version of the app's own software. It is the base image with a release of the sandbox software, the terminal packages, and the GitHub CLI. It holds no org data. `docs/protocol/software-image.md` gives its rules.
  - **First build:** a build of an org that has no org image yet. It starts from the ready software image of the newest release, copies the repositories, installs the newest release, and runs the install script. Without that image, it starts from the base image and installs all of the app's own software.
  - **Software step:** the step of a build that installs the app's own software. The build log starts it with the line "Installing the cloud computer software.".
  - **Apt part:** the part of the software step that installs `gh`, `tmux`, and `ttyd` with apt. It also masks the ttyd service of the package.
  - **Deploy token:** a random token that each deploy run makes. The Worker keeps only its SHA-256 digest in the variable `CONDUCTIVE_DEPLOY_TOKEN_SHA256`. It accepts the token for 30 minutes after the creation time of its version, which the `version_metadata` binding `CF_VERSION_METADATA` gives.
- **Background:**
  - After its health check, each deploy run from `main` calls `POST /v1/deploy/software-image` on `api.conductive.build`. It asks again 10 seconds after each answer. A later job fails the run unless the last answer says `ready`.
  - Two different limits apply. Each request may take 30 seconds, the request limit. All requests together may take 15 minutes, the total wait.
  - The tests use fake provider and GitHub servers and a local D1. No test proves the real Cloudflare binding, the real provider snapshot, or the length of a real build.
  - The Worker refuses the route with 404 when the binding gives a creation time that does not parse. So a wrong binding format makes every deploy run fail at the job `software-image`.
  - On 16 November 2026, PR #342, commit `a20746b99`, made each org build install the newest release. This includes a first build from the software image. `docs/protocol/sandbox-software.md` requires it in "Installs in a build", and `docs/protocol/software-image.md` in "The software image". `worker/lifecycle/software-image-start.test.ts` expects the line "Installing the cloud computer software." in such a first build.
  - On 16 November 2026, PR #390, commit `4373e1450`, let the software step skip the apt part. The skip needs a source image that recorded the current apt part version. That image must also hold the three packages and the masked ttyd service. The step then prints "The system packages are already installed.". A first build gets such a source only from the software image.
  - When the image holds the program `conductive`, the step installs the newest release with the updater of that program. The updater downloads only the changed parts. When that update fails, the step prints "The installed updater did not get the release. Downloading the full release.".
  - A first build pins the ready software image of the newest release when it starts. Each deploy run publishes its release before its software image is ready. A first build in that time starts from the base image.
  - Outcome of each original task:
    - Watch the first deploy run after the merge: done. On 10 November 2026, run 42825346889 deployed the merge commit `4249b33de` of PR #180. Its step "Build software image" printed the phases `tools`, `software`, `snapshot`, and `done`, then the result `ready`. The job `software-image`, "Check the software image result", passed. So the real binding, the deploy token, and the real provider snapshot worked.
    - Note the length of the step: done. In that run, the step took 1 minute 31 seconds. Six runs on 18 November 2026 gave these results:
      - Run 44315256641: 1 minute 55 seconds, `ready`, after two HTTP 409 replies.
      - Run 44315775655: 3 minutes 57 seconds, `ready`, after one HTTP 409.
      - Run 44317924791: 15 minutes, `timeout`, and the run failed. It lost replies: 19 requests in a row got no reply within the request limit. The only answers gave the phase `allocating`.
      - Run 44321797542: 6 minutes 56 seconds, `ready`. It took 5 minutes 3 seconds from the phase `snapshot` to `done`.
      - Run 44324491251: 15 minutes, `timeout`, and the run failed. It got each reply, with no network retry. The snapshot did not finish in the last 13 minutes 58 seconds of the total wait.
      - Run 44327146922, commit `418026086`: 6 minutes 1 second, `ready`. The step ran from 14:51:25 to 14:57:26 UTC. Its snapshot phase took about 4 minutes 40 seconds.
      - `plans/follow-ups/software-image-poll-deadline.md` records both failure shapes. A software image build has a time limit of 60 minutes, and it goes on after the total wait ends. So a snapshot that outlasts the total wait fails the deploy run, as the protocol says, but breaks no requirement.
    - Check that a first build has no line "Installing the cloud computer software.": obsolete. PR #342 replaced that requirement on 16 November 2026. The task below checks the current software step of a first build.
    - Compare the length of a first build with a first build before the change: not done. No test org was created, and no like-for-like baseline is recorded.
    - Send a first message in a test org: not done, because no test org was created. The activity of existing workspaces does not prove this check.
  - Access limits of the check on 18 November 2026:
    - The check reached only the sign-in page of `https://app.conductive.build`. It did not sign in, create an org, or change a setting. It started no build, no workspace, and no deploy run.
    - A read of the variables of the GitHub environment `production` failed with HTTP 403, "Resource not accessible by integration".
    - The check read no secret, no D1 record, and no Worker log. Request `tYRBBRm_iSMmphxlaOdELglzW17Qh1UdU-ajReoF8Nw` for read-only Cloudflare access was still pending.
    - The prepared queries are in `.context/software-image-deployed-check/read-d1-evidence.py`. That folder is git-ignored, in the workspace of branch `calummoore/follow-up-software-image-on-the-deployed-627v`. The task below describes each query, so the file is not necessary.
- **Task:**
  - Read the existing records. Use read-only access to the production D1 database, such as the approval of the pending request above. Run three read-only SELECT queries with these scopes:
    - Software images: the 12 newest rows of `software_images`, newest first. Read the state, the phase, the error, the start, the end, the length, and the release version. Also read whether each row recorded an apt part version.
    - Org builds: the 16 newest builds of the org `X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM`, with their rows of `image_build_jobs`. That org holds the workspace that prepared the queries. Read the kind, the state, and the length. Read whether each build started from an org image, pinned a software image, and recorded an apt part version.
    - For each of these org builds, read whether `image_build_logs` holds "Updating the repositories.", "Installing the cloud computer software.", "Running the install script.", and "Saving the cloud computer image.". Also read whether it holds "The system packages are already installed.". Count its kept log rows and rows with `omitted_bytes` set. Those rows mark omitted output.
    - First builds: the 5 oldest builds of kind `build` of the same org, oldest first. Read the state, the length, the two source markers, and the count of kept log rows. For both build queries, also count rows with `omitted_bytes` set, and read whether the job row still exists.
  - Check the results of these queries:
    - Find the software image rows that started near 13:56 and near 14:32 UTC on 18 November 2026. Record the state, phase, error, and end of each in `plans/follow-ups/software-image-poll-deadline.md`.
    - Check that each ready software image made after the deploy of PR #390 recorded an apt part version. Without it, a first build from that image runs the apt part again.
    - Since the deploy of PR #342, judge a missing step line only with kept rows and no omitted output. Require the software step line when the build succeeded, or its log holds the install or snapshot line. For kind `build`, require the install script line when the build succeeded or its log holds the snapshot line.
    - When those conditions do not permit a verdict, mark the build as not judged. Record its state and the latest of these kept step lines, or none. That result alone is not a failed check.
    - Record which builds have the apt skip line, with their source markers. Check the skip conditions above before you treat a missing line as a fault.
    - Zero kept log rows give no evidence of a missing step. A running build can have no rows before its sources step starts. Omitted output can remove a step line. A missing job row does not prove which source the build used.
    - Record whether the first build of that org pinned a software image, and its length. A first build from the base image can serve as a baseline for the length check below. It is not like-for-like when its repositories, install script, or software step differ.
  - Check a new org:
    1. Wait until the newest `Deploy` run of `main` passed the job "Check the software image result". No other `Deploy` run may be in progress.
    2. Sign in at `https://app.conductive.build` with a GitHub account that has the GitHub App on a test repository. Create a test org with that one repository. Create org starts the first build.
    3. On the Cloud computer tab of the org settings, open the log of the first build. Check that it shows "Updating the repositories.", then "Installing the cloud computer software.", then "Running the install script.".
    4. Check that the software step shows "The system packages are already installed.", and no line with "Downloading the full release.". Without the first line, the build did not start from the software image, or that image did not meet the conditions of the skip.
    5. Record the length of the first build from the build list of the Cloud computer tab. Compare it with a baseline from the existing records, or with another first build from the base image. Use the same repository and install script when you can. When no baseline exists, record the length alone, and say so.
    6. Send a first message in the test org. Check that the workspace starts and an agent answers.
    7. Save the deploy run, the release version, the build log, and the results under the git-ignored `.context/` folder of the workspace that runs this check.
- **Impact if no action:** A fault that only real records or a new org show can keep first builds slow, or stop a first workspace. Nobody would notice it.
- **Needs:** read-only access to the production D1 database, such as the approval of request `tYRBBRm_iSMmphxlaOdELglzW17Qh1UdU-ajReoF8Nw`. Access to the GitHub Actions runs of the repository. A GitHub account with the GitHub App on a test repository, and a Claude or Codex login.
- **Done when:** the deploy checks are already done. The existing-record checks and the new-org checks pass, and the first-build length is recorded with a baseline or a note that none exists. Or each failure has its own follow-up item. Then delete this item.
- **Related:**
  - `plans/follow-ups/first-build-smoke-test.md` smoke-tests the automatic first build on the deployed app. One session can run both items, and each keeps its own checks.
  - `plans/follow-ups/software-image-poll-deadline.md` investigates the two deploy runs that ended with `timeout` on 18 November 2026, and fixes the request-limit gap. Such a run can end before the software image of its release is ready. So the new-org checks wait for a run that passed. Its investigation reads the same software image rows.
