# The development page shows a wrong start time

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the development page milestone of the branch `calummoore/chat-title-rename`, which names new workspaces with a Workers AI model.
- **Location:** `src/chat/dev/`, the fake start steps of a new workspace, and the start fixture that they read.
- **Reason:** The same time shows on `origin/main`, and the branch changes no start step.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Development page:** the page under `src/chat/dev/` that runs the chat on a fake backend in the browser, so that its screens match the mockups.
- **Background:** In the first second after the load of a new workspace, the first start step of the development page shows "2m 41s". The mockup `app/new-workspace/creating/first-second` shows "1s" at the same moment. The start time of the fixture and the clock of the page are 161 seconds apart.
- **Problem:** The development page shows a start time that does not match the mockup or a real start.
- **Impact if no action:** A person who checks the start screen on the development page sees a wrong time, and can take it for a bug in the app.
- **Root question:** How does the development page show the same start time as the mockups?
- **Options:**
  - **A.** Start the fake start steps from the clock of the page at load. Effort: Small.
  - **B.** Move the page clock to the start time of the fixture. Other fake times on the page then move too. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. One fixture sets the time.
- **Previous examples:** None found.
- **Recommendation:** A. Only the start steps change.
- **Action:** fix after merge, apply A, because the same time shows on `origin/main` and only the development page shows it.
