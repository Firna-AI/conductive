# Host stub keeps a dead preview branch

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/untitled-v4`, the finding check of review finding 7.
- **Location:** `worker/hosts.ts:26` (`hostStub`), and its caller at `worker/application.ts:176`.
- **Reason:** the branch did not change `hostStub`, and the dead branch dates from commit `b1d03858`.

- **Source:** Review. **Category:** Dead code.
- **Background:**
  - `createApp` in `worker/application.ts` picks a host surface for each request: marketing, preview, app, or machine.
  - For the preview surface, it returns the reply of `routePreview` at once, near line 100.
  - Later, near line 176, it answers each request that no route took with `privateResponse(hostStub(surface))`.
  - `hostStub` in `worker/hosts.ts` starts with a branch for `surface === 'preview'` that returns a 404 with the code `not_found`.
- **Problem:** No request on the preview surface reaches the later `hostStub` call, so the preview branch of `hostStub` never runs. A search for `hostStub` finds only that one caller and no test.
- **Impact if no action:** A reader can think that the preview host answers unknown paths with this 404, but `routePreview` answers them, with the code `preview_not_found`.
- **Root question:** How does the host stub show only the surfaces that can reach it?
- **Options:**
  - **A.** Delete the preview branch of `hostStub`. Check first that no route table, test, or string key names it. Effort: Small.
  - **B.** Do A, and narrow the parameter type of `hostStub` to the surfaces that reach it, so the compiler rejects a preview branch. Effort: Small.
  - **C.** Keep the branch, and add a comment that it is unused. Effort: Small.
- **Left out:** None.
- **Wider fix:** B, because the type then cannot hold the preview surface.
- **Previous examples:** None found.
- **Recommendation:** B. The type keeps the dead case from coming back.
- **Action:** fix after merge, apply B, because the code is outside the branch that found it.
