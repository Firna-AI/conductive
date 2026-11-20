# Mac download test misses the preview frame record

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the Desktop CI of pull request #494, branch `calummoore/follow-up-stopped-turns-omit-changed-6iu8`.
- **Location:** `desktop/tests/downloads.spec.ts:29`, the test, with its preview step at lines 151 to 178. `desktop/src/downloads.ts:13`, the `will-download` listener of the app.
- **Reason:** Pull request #494 changes no file of the Mac app or of the download path, and the failed job passed its one rerun on the same commit.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Desktop workflow:** the GitHub Actions workflow in `.github/workflows/desktop-ci.yml`, which runs the Mac app checks of `.github/workflows/desktop-mac-checks.yml` on Apple silicon and Intel Macs.
  - **Desktop origin:** `conductive-app://desktop`, the origin of the bundled web app in the main frame of the Mac app window.
  - **App origin:** the `appOrigin` value of `desktop/dist/bundle/build-config.json`, `https://app.conductive.build` by default and in the failed run.
  - **`will-download`:** the Electron session event that the main process gets when a page is about to download a file, and that `event.preventDefault()` cancels.
  - **Download record:** what the test stores for each `will-download` event: file name, cancel result, initiator origin, source frame, source window, and state.
- **Background:**
  - The Mac app is an Electron shell in `desktop/`. At startup, it adds a `will-download` listener, `desktop/src/downloads.ts:13`, to the session of its window. The listener lets a download continue only when the main frame of the app window starts it, from a `blob:` address of the desktop origin. The download must also have the desktop origin as its initiator. The listener cancels every other download. `desktop/README.md` describes this rule at lines 13 to 17, and no protocol doc states it.
  - The test `saves authorized main-frame file bytes and refuses other download sources` is at `desktop/tests/downloads.spec.ts:29`. It launches the built app with Playwright. Its own `will-download` listener runs after the app's listener and stores a download record for each download. The test reads the records with `expect.poll`. `desktop/playwright.config.ts` sets the limit of each poll to 15,000 ms.
  - The test starts downloads from five sources in turn: the main frame, a child frame, a preview frame, a second window, and a `data:` address. It expects the app to save only the main-frame file and to cancel each other download.
  - The preview step uses `page.route` to answer `<app origin>/download-preview` with a page that holds one link, `<a download="preview.bin">`. It adds a sandboxed frame with that address to the window page. The frame allows scripts, same-origin access, and downloads. In the frame, the step gives the link a new `blob:` address and clicks it. Then it waits for a third record: `preview.bin`, cancelled, with the app origin as initiator, not from the main frame, and in the app window.
  - The child frame of the step before uses `srcdoc`, so its page has the desktop origin. The preview frame is the first frame of the test whose page comes from another origin.
  - The test, its helper `desktop/tests/download-flow.ts`, and `desktop/src/downloads.ts` last changed in commit `b1d03858b` on 8 November 2026. They are the same on `main` at `456e53237`.
  - The stopped-turn fix of pull request #494 changes `src/shared/transcript/turn-words.ts` and its test, and deletes its solved item. Only the chat transcript code under `src/chat/components/` and `src/shared/transcript/` imports that module. This test opens no workspace or chat.
- **Problem:** The test failed once in CI and passed when the same job ran again on the same commit. The poll at line 178 got the first two records but no `preview.bin` record in 15 seconds. The run does not show why the third record is missing.
- **Failure:** On 18 November 2026, attempt 1 of Desktop workflow run 44335300953 failed in the job `mac / Mac app arm64`, job 134910241122.
  - The job ran on the Blacksmith runner label `blacksmith-6vcpu-macos-15`, an Apple silicon Mac with macOS 15.7.4.
  - It checked out `eb1d3216a05d7c65b66cb2f8e2b27ec62b2e06a8`, the merge commit that GitHub made for pull request #494.
  - `npm --prefix desktop run test:electron` ran 13 tests with one worker in 47.7 s. 12 passed, 1 failed, and none was skipped. This test failed after 16.1 s.
  - The package step and the packaged-app test did not run, because the step before them failed.
  - The failure text was:

    ```text
    Error: expect(received).toEqual(expected) // deep equality

    - Expected  - 8
    + Received  + 0

    @@ -13,14 +13,6 @@
          "mainWindow": true,
          "name": "child.bin",
          "origin": "conductive-app://desktop",
          "state": "blocked",
        },
    -   Object {
    -     "blocked": true,
    -     "mainFrame": false,
    -     "mainWindow": true,
    -     "name": "preview.bin",
    -     "origin": "https://app.conductive.build",
    -     "state": "blocked",
    -   },
      ]

    Call Log:
    - Timeout 15000ms exceeded while waiting on the predicate

      176 |       state: 'blocked',
      177 |     }
    > 178 |     await expect.poll(records).toEqual([accepted, childResult, previewResult])
          |                                ^
      179 |
      180 |     const opened = app.waitForEvent('window')
      181 |     await app.evaluate(async ({ BrowserWindow }, origin) => {
        at /Users/runner/_work/conductive/conductive/desktop/tests/downloads.spec.ts:178:32
    ```

- **Rerun:** One rerun of the failed job passed every step. It was attempt 2 of the same run, job 134917362443.
  - It ran on the same commit and runner label, on another machine with macOS 15.7.4.
  - `npm --prefix desktop run test:electron` passed 13 of 13 tests in 35.8 s, with none failed or skipped. This test passed in 1.8 s.
  - `npm --prefix desktop run package` passed. `npm --prefix desktop run test:packaged` passed 13 of 13 tests in 27.6 s, with none failed or skipped. This test passed there in 2.2 s.
  - No code, test, time limit, or workflow changed between the two attempts. The Intel job of the run, `mac / Mac app x64`, passed in attempt 1.
- **Suspected source:** asynchronous readiness or event order in the preview step. The cause is unknown and not proved. The click call at line 169 returned without an error, so the test reached the poll. The run does not show whether the click started a download. Two hypotheses fit the record, and no run checked either one:
  - The click came before the new preview frame was ready to take the click or to start a download.
  - The download started, but its `will-download` event came after the poll ended.
- **Impact if no action:** A pull request or a push can get a red Desktop check with no defect of its own, until someone reruns the Apple silicon job. The Release workflow signs a release only after the same Apple silicon checks pass, so this failure can also stop a release.
- **Root question:** How does the test prove, on every run, that the Mac app cancels a download that a preview frame starts?
- **Shared assumptions:**
  - The preview step keeps a real Playwright click on a link in a real frame from another origin, in the real Electron window. Source: the code at `desktop/tests/downloads.spec.ts:151-178`, and the `testing` skill, which keeps frame checks in a browser spec. Kept.
  - The app cancels a download that a preview frame starts. Source: the code at `desktop/src/downloads.ts:13-31` and `desktop/README.md:13-17`. No protocol doc states it. Kept, because this item is about the test, not about the rule.
  - The test keeps every assertion and its five download sources in one launch. Its time limits stay 15 seconds for each poll and 60 seconds for the test. Source: the code, `desktop/playwright.config.ts:9-10`, and the `testing` skill, which needs the user's approval to loosen an assertion or to raise a limit. Kept. The retry and the longer time limit under **Left out** drop it.
- **Options:**
  - **A.** Without a reproduction, make the preview step wait for an explicit sign that the frame is ready, before it sets the link and clicks. For example, the routed page can mark its body after its `load` event, and the test can wait for that mark. Keep every assertion and limit. It is cheap, but it guesses the source, so the failure can stay. Effort: Small.
  - **B.** Find the source, then fix it in the test or in the product. It costs Apple silicon runner time when Linux runs do not fail. Effort: Medium.
    - While GitHub keeps it, until 2 December 2026, read the Playwright trace and the error context of the failed attempt. They are in artifact 14440453453 of run 44335300953.
    - Run `npm --prefix desktop run build`. Then run `npm --prefix desktop run test:electron -- tests/downloads.spec.ts --repeat-each=50`. Run it first on Linux, where the test runs under Xvfb. Run it on an Apple silicon Mac when Linux does not fail. Record the pass counts under `.context/`.
    - In each failed run, record the frame address and load state, the click, and the download events of the main process.
    - Name the source. Make the preview step wait for its real readiness signal or event, as the `testing` skill says. Keep every assertion and limit, and add no retry or sleep. Record the pass counts after the fix.
    - When the source is in product code, add a failing test first. Then fix the product.
    - When no run reproduces the failure, stop. Give the pass counts to the user.
- **Left out:**
  - Change nothing, and rerun the Apple silicon job after each failure. It fails the goal, because the check stays flaky.
  - A retry, a skip, a quarantine, or a longer time limit. Each hides the missing record instead of finding its cause, so it fails the goal.
  - A unit test of `desktop/src/downloads.ts` with fake Electron objects in place of this step. It fails the goal, because only a real Electron window shows which frame and window Electron gives for a real download.
  - One test for each download source. It does not remove the nondeterminism, and the failure text already names the step.
  - Only two approaches are real, because the source is unknown. B finds the source first, and A guesses it.
- **Wider fix:** None yet, because the source is unknown. When B finds a frame readiness race, check the other test files that add or use frames: `desktop/tests/frame-navigation.ts`, `desktop/tests/previews.spec.ts`, and `desktop/tests/owner-menu.spec.ts`.
- **Previous examples:** None found. No follow-up item, commit message, or other file names this test, `preview.bin`, or `download-preview`. Earlier CI runs were not searched.
- **Recommendation:** B. It finds the source before the test changes, so the fix removes the cause and does not rest on a guess.
- **Action:** ask the user, because no run reproduced the failure and its source is unknown, so no fix is clearly best until a reproduction names the source.

Source runs: the failed attempt at https://github.com/Firna-AI/conductive/actions/runs/44335300953/job/134910241122 and the passed rerun at https://github.com/Firna-AI/conductive/actions/runs/44335300953/job/134917362443.
