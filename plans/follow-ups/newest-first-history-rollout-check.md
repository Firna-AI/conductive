# Check the newest-first history after rollout

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-12, from branch `calummoore/chat-history-loading-3c`, the post-merge checks of its plan.
- **Location:** `src/chat/state/history.ts`, `src/chat/state/load.ts`, and the history route in `worker/chat/http-routes.ts`.
- **Reason:** the check needs the deployed web app, and a Mac app build that contains the change.

- **Terms:**
  - **Newest-first load:** the chat reads the newest history page of a session first and starts the live events after it. Then it reads the earlier pages, holds them, and merges them once, above the newest messages. `docs/protocol/chat-and-events.md` states the rule as decision 280.
  - **Mac app:** the Electron app under `desktop/`. It bundles the web app, so an installed copy gets the change only with a new release.
- **Background:**
  - Before the change, the chat read the whole history of a session, oldest page first, before the live events started.
  - The tests and a smoke test on the fake API checked the change before the merge. No real long session on the deployed app was checked.
  - The history route now reads newest first only. A tab or a Mac app from before the deploy shows "This session didn't load" or "Earlier messages didn't load" for a history of more than one page, until it reloads or updates. The user accepted this on 11 November 2026, because the product has no users yet.
- **Task:**
  - Open a long session on the deployed web app at `conductive.build`, in a new tab.
  - Check that its newest messages show after one page, with "Loading earlier messages" above them.
  - Send a message, or watch a running turn, while the earlier pages load. Check that its live events show at once, once each, and in order.
  - Check that the earlier messages appear above, and that the line goes away.
  - Repeat the check in the Mac app after it installs the first release that carries this change.
- **Impact if no action:** A fault that only real data or the Mac app shows stays unseen.
- **Needs:** The deployed change, a workspace with a long session, and a Mac app on the new release.
- **Done when:** both clients show the newest messages first, take live events during the load, and then show the whole history.
