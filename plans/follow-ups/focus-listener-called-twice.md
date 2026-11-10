# One return can call a focus listener twice

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the branch `calummoore/github-installation-redirect`, the check of review finding 4, round 2.
- **Location:** the comment of `onFocus` in `src/app/services.ts:25`, and `windowFocus` in `src/app/services.ts:67`.
- **Reason:** the comment and `windowFocus` are the same on `origin/main`.

- **Terms:**
  - **Focus listener:** a function that a part of the app gives to `AppServices.onFocus`, to read its data again when the user comes back to the page.
  - **Refresher:** the shared reads of one value while screens show it, in `src/app/refresh.ts`. It shares one read in flight.
- **Background:** `windowFocus` calls the listener for the `focus` event of the window, and for the `visibilitychange` event when the page shows again. A switch to a browser tab fires both events. `Refresher` shares a read that runs already, so its reads go out once. `AccountModel.readStepsOnReturn` shares its read in the same way.
- **Problem:** The comment of `onFocus` says that it calls the listener "each time that the user comes back to the page". It does not say that one return can call it twice. A new listener that starts work on each call does that work twice.
- **Impact if no action:** A later listener can send a duplicate request for each return, as the first focus read of the Get started steps did.
- **Root question:** How does the author of a focus listener learn that one return can call it twice?
- **Options:**
  - **A.** Say in the comment of `onFocus` that one return can call the listener twice, so a listener must share work that runs already. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** Make `windowFocus` call the listener once for each return: the two events cannot tell one return from two, so it would keep the second call or drop a real return.
- **Wider fix:** None. A structural fix would need `windowFocus` to tell one return from two, which the events cannot do.
- **Previous examples:** on the branch `calummoore/github-installation-redirect`, the first focus read of the Get started steps sent two reads for one return.
- **Recommendation:** A. One sentence warns each later author.
- **Action:** fix after merge, apply A, because the comment is the same on `origin/main` and outside the scope of the branch.
