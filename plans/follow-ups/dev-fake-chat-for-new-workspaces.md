# Dev fake shows no chat for new workspaces

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, item 3 of the Milestone 9 report of `plans/routines.md`.
- **Location:** `src/app/dev/create-routes.ts`, and the recorded chat fake of `src/app/dev/` and `src/test-support/`.
- **Reason:** The fix reaches the chat fakes outside the routines plan, and a mounted test already covers the run line.

- **Terms:**
  - **Dev fake:** the fake API in the browser that `npm run dev` uses, under `src/app/dev/`.
  - **Run line:** the line under the header of a run workspace that links to its routine.
- **Background:**
  - In `npm run dev`, Create workspace and Run now make new workspaces in the dev fake.
  - The recorded chat fake answers chat requests only for the recorded workspaces.
  - So a workspace that the dev fake makes shows "The chat didn't load", and the run line, which reads the chat's view reply, does not show either.
- **Problem:** The last step of the flows "Create a workspace" and "Create a routine" cannot be checked in the dev app.
- **Impact if no action:** A developer cannot see a new workspace or a run workspace in the dev app.
- **Root question:** How does the dev app show the chat of a workspace that it made?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** The dev fake answers the chat requests of the workspaces that it makes, with an empty history and the view reply. Effort: Medium.
- **Left out:** Adding each new workspace to the recorded workspaces. It changes the workspace list of every dev page and many tests.
- **Wider fix:** B. It covers each dev flow that makes a workspace.
- **Previous examples:** Create workspace in the dev app has the same limit.
- **Recommendation:** B. The dev flows of Create workspace and Run now then show their last step.
- **Action:** fix after merge, apply B, because it reaches the chat fakes outside the routines plan.
