# Smoke-test the palette in the deployed app

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/command-palette-mockups`, the post-merge follow-up of its plan.
- **Location:** None.
- **Reason:** the check needs the deployed web app and a build of the Mac app, which exist only after the merge.

- **Terms:**
  - **Command palette:** the search box over the app that finds the workspaces of the current org, runs the actions of the page, and opens the settings. `docs/protocol/command-palette.md` states its requirements.
- **Background:** The tests and the smoke tests of the change ran against the fake API of `npm run dev`. The deployed app talks to the real Worker, and the Mac app loads the built web app from its own origin.
- **Task:**
  - Open the deployed app in a browser. Press ⌘K on a Mac, or Ctrl+K on Windows or Linux. Check that the palette opens on the All tab, that a search finds a workspace by its name, and that Enter opens it.
  - Open the Mac app. Check that ⌘K opens the palette, that "Hide the sidebar" shows in the Window group, and that a workspace opens from the palette.
  - On a phone, open the list, choose Search, and check that the palette opens as a page with Cancel.
- **Impact if no action:** A problem that only the real Worker or the Mac app shows reaches the users unseen.
- **Needs:** the merged and deployed change, and a build of the Mac app.
- **Done when:** each check of the task passes in the browser, the Mac app, and on a phone.
