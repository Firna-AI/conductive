# The Worker production type check sees Node types

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the branch `calummoore/betterstack-implementation-brainstorm`, found while the Worker error reporting SDK was checked.
- **Location:** `tsconfig.worker.json:7-21` (its `include` and `exclude`), `worker/lifecycle/backend-test-hooks.ts:1-4` and `worker/lifecycle/backend-test-platform.ts:3-6` (their imports), and `worker/test-support/harness.ts:10` and `:12` (its Node imports).
- **Reason:** Both files and the configuration are on `origin/main`, and the error reporting change needs no fix of them.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Production project:** `tsconfig.worker.json`. It checks the Worker code with `types: []`, so that no Node type applies. `npm run typecheck` checks it.
  - **Test project:** `tsconfig.worker-tests.json`. It extends the production project, adds the Node types, and also checks the tests.
  - **Node globals:** the global names that Node.js declares and the Worker types do not, such as `process`, `Buffer`, `setImmediate`, and `require`.
  - **Test-support names:** the file names that the production project excludes: `*.test.ts`, `*.test-support.ts`, `*-test-support.ts`, `test-support.ts`, and each file under a `test-support/` folder.
- **Background:**
  - `AGENTS.md` says that `npm run typecheck` "checks Worker production code without Node types and tests with them."
  - The production project includes all of `worker`, `src/shared`, and `.wrangler/worker-configuration.d.ts`. It excludes the test-support names, `worker/**/fake-*.ts`, and six single helper files.
  - TypeScript also checks each file that an included file imports, even when `exclude` matches the imported file.
  - `worker/lifecycle/backend-test-hooks.ts` holds `setupBackendTests`. It imports `afterAll`, `beforeAll`, and `beforeEach` from `vitest`, `createHarness` from `worker/test-support/harness.ts`, and `backendFixture` from `worker/lifecycle/backend-test-support.ts`.
  - `worker/test-support/harness.ts` imports `worker/test-support/migrations.ts`, which imports `node:fs/promises`, and `worker/test-support/native-runtime.ts`, which imports the Node package `miniflare`.
  - The name `backend-test-hooks.ts` matches no exclusion. So the production project includes the file, and its imports bring Vitest, the harness, and Miniflare into the production check.
  - `worker/lifecycle/backend-test-platform.ts` is a test helper whose name matches no exclusion either. Only `backend-test-support.ts`, `backend-pump.test-support.ts`, and `backend-start.test-support.ts` import it. It imports `heldOperation` from `worker/test-support/held-operation.ts`, and types from the harness and other test-support files. A type import also brings a file into the check, so this file brings the harness in as well.
  - A check on 10 November 2026, before the merge of main of that day, found that the production project therefore accepts `process`, `Buffer`, `setImmediate`, and `require`. A check of the real entry graph of the Worker alone rejects all four.
  - The importers of `backend-test-hooks.ts` are 56 test files and `worker/lifecycle/first-build-test-support.ts`. No production module imports it.
  - `backend-test-hooks.ts` reached `origin/main` in commit `7bf86c5d` on 6 November 2026. The error reporting change touched neither file.
  - The public imports of the Worker's error reporting SDK, `@sentry/cloudflare` and its core packages, expose no Node global. So this is a gap of the test setup and of the type check, not a defect of the SDK.
  - A search on 10 November 2026 found no other file under `worker/` or `src/shared/` that imports `vitest`, a `node:` module, or `miniflare` directly while the exclusions miss it.
  - Vitest runs the Worker tests in Node. So no test can show that production code uses a Node global, and the production type check is the only guard.
- **Problem:** Two test-only files escape the exclusions of the production project and bring Node globals into it. So production Worker code can use `process`, `Buffer`, `setImmediate`, or `require`, and the check that `AGENTS.md` describes still passes.
- **Impact if no action:** A production module can come to depend on a Node global, and no check finds it before the code runs on Cloudflare.
- **Root question:** How does the production type check of the Worker stay free of the declarations that only tests need?
- **Options:**
  - **A.** Rename `worker/lifecycle/backend-test-hooks.ts` and `worker/lifecycle/backend-test-platform.ts` to test-support names, such as `backend-hooks-test-support.ts` and `backend-platform-test-support.ts`. Update their importers, 57 and 3, and the mention in `worker/lifecycle/tests.md`. Keep every test and assertion. The existing `**/*-test-support.ts` exclusion then drops both files, with no change to a compiler option. Effort: Small.
  - **B.** Make the production project check only the files that the Worker entry imports, in place of all of `worker/`. A test file can then enter only through a production import. It changes which files the gate checks, and a module that nothing imports leaves the check. Effort: Medium.
- **Left out:**
  - Add exclusions for the two names: A is better on every point, because it reaches the same result with no change to the compiler configuration.
  - A lint, a property test, or a check that fails when the production project holds a test file or a Node global: it adds a new gate, which the user decides.
  - Change nothing: it fails the goal, because the check that `AGENTS.md` describes stays open.
- **Wider fix:** B. It removes the class, because no file name can bring a test file into the check. It is blocked, because it changes which files the compiler gate checks, and the user decides that.
- **Previous examples:**
  - `tsconfig.worker.json` already excludes six single test helpers whose names miss the patterns, such as `worker/github/test-harness.ts` and `worker/members/test-pause.ts`.
  - `plans/follow-ups/worker-outbound-request-helper.md` records other Worker code that the Node tests and the type check accept, but the Workers runtime refuses: the fetch option `redirect: 'error'`.
- **Recommendation:** A. It restores the check that `AGENTS.md` describes with the name rule that the project already honours, and it changes no compiler option. B protects the codebase best, but it changes the gate.
- **Action:** fix after merge, apply A, because both files are on `origin/main`, and the error reporting change needs no fix of them.

Steps for the branch that applies A:

1. Run `npm run types`. Then list the files of the production project, for example with `npx tsc -p tsconfig.worker.json --listFilesOnly`, and keep the list.
2. Rename both files, and update each importer and `worker/lifecycle/tests.md`. Keep every test, assertion, and test name.
3. List the files again. Check that the list holds no file of `vitest`, `miniflare`, `@types/node`, or `worker/test-support/`, and no test file.
4. Run `npm run typecheck`, then `npm run test -- worker/lifecycle worker/operator`. The tests must compile and pass.
5. When the production project then fails on production code, stop. Each failure shows production code that uses a Node global. Record it in a new item for the user, because its fix changes production code or the gate.
6. Add no guard, lint, property test, or time limit.
