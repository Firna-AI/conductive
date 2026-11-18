# No test drives the production repository change wiring

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/firna-ai-user-interface-discrepancy-lsqt`, finding 12 of review round 3.
- **Location:** `worker/github/composition.ts:54`, `worker/features/github-routes.test.ts`, `worker/github/repository-change.test.ts`, and `worker/github/repository-values-check.test.ts`.
- **Reason:** the review found it after the two fix rounds that the review rules allow, and the production wiring was read and found correct.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Production composition:** `productionGitHubWebhook` in `worker/github/composition.ts`. Its `repositoryChange` block connects the webhook handler to `readGitHubRepository` and to `wakeImagesForRepositoryChange`.
  - **Native fixture:** `featureFixture`, which runs the production Worker and its Durable Objects in a local Cloudflare runtime. `worker/features/github-routes.test.ts` and `worker/features/build-routes.test.ts` use it.
- **Background:**
  - The handler tests in `worker/github/repository-change.test.ts` and `worker/github/repository-values-check.test.ts` replace the GitHub read and the coordinator wake with callbacks.
  - `readGitHubRepository` and the image coordinator have their own tests.
  - The production route test in `worker/features/github-routes.test.ts` sends a push that names no repository values, so it never runs the repository change code.
- **Problem:** Removing the `read` or the `changed` callback from the production composition fails no test.
- **Impact if no action:** The gate can pass while production saves no values or wakes no coordinator.
- **Root question:** How does the gate catch a break in the production connection from a verified webhook to the GitHub read, the guarded save, and the coordinator wake?
- **Options:**
  - **A.** Add one native case with its own `featureFixture` in `worker/features/github-routes.test.ts`. Send a signed `repository` event with the `renamed` action through the machine route. Give the payload a name that differs from the saved name and from the fake GitHub reply. In the `outbound` hook, answer the token request, `GET /repositories/186853002` twice, and `DELETE /installation/token`. Advance only the `org-image:chat-org` alarm. Assert the saved values, and the repositories of the new build through `readBuildJob`. Remove `read`, then `changed`, from the composition, and see the case fail on an assertion each time. Do not use a push to the default branch, because its own push refresh then starts the build and hides a removed wake. Effort: Small.
  - **B.** Make the production route and the native objects the default path of the shared GitHub test harness, as `plans/follow-ups/github-tests-on-real-object.md` proposes. Effort: Large.
- **Left out:** A unit test of the composition with `vi.mock` shows only that callbacks reach the handler. A production warning finds the break only after the deploy.
- **Wider fix:** B, already recorded in `plans/follow-ups/github-tests-on-real-object.md`.
- **Previous examples:** `plans/follow-ups/terminal-links-wiring-test.md` records another missing wiring test.
- **Related:** `plans/follow-ups/repository-check-before-branch-routing.md`: after its fix, a tag push with changed values can serve as the event of this case.
- **Recommendation:** A. One native case proves the whole connection.
- **Action:** fix after merge, apply A, because the review found it after the two allowed fix rounds.
