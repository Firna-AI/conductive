# Each build start must say whether an admin asked

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, wider fix of finding 14 of review round 2, branch `calummoore/computer-build-not-working-i7cz`, plan `plans/build-after-refresh.md`.
- **Location:** the input of `startImageBuild` in `worker/lifecycle/image-builds.ts`, and its callers in `worker/lifecycle/browser.ts`, `worker/lifecycle/first-image-build.ts`, `worker/lifecycle/image-timers.ts`, `worker/app-api/feature-org.ts`, `worker/app-api/feature-repositories.ts`, and the Worker tests.
- **Reason:** the change touches about 110 test calls and product files outside the change that found it.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Request:** the admin that the Worker saves on a running refresh when Build computer or Try again asks for a build. The build starts for that admin when the refresh ends.
- **Background:**
  - `startImageBuild` takes an optional field `requested`. The builds route and the start of a requested build set it to true. Every other caller leaves it out.
  - A caller that leaves out the field during a refresh gets the running refresh back, and no build follows.
  - On 26 November 2026, a click on Build computer during a refresh started nothing, because no request existed. The branch added the field and a route test that fails without it.
- **Problem:** A new caller that should save a request can leave out the field, and the type check does not catch it.
- **Impact if no action:** A later screen or route that asks for a build can bring back the lost click.
- **Root question:** How does each caller of `startImageBuild` say whether an admin asked for the build?
- **Options:**
  - **A.** Keep the optional field. Each new route gets a route test, as the builds route has. Effort: Small.
  - **B.** Make the field required, as `requested: boolean`, at every call site. Effort: Medium.
  - **C.** Split the entry point into one function for a build that an admin asks for and one for a build that the app starts by itself. Effort: Medium.
- **Left out:** A lint for the field, because B and C make the type check do the work.
- **Wider fix:** C. The name of the function then says who asked, and no caller can leave out the choice.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/requested-build-start-race.md` changes the fallback in the same function.
- **Recommendation:** C. It keeps each call site short and makes the choice part of the name.
- **Action:** fix after merge, apply C, because it changes many files outside the change.
