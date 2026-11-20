# Check terminal tabs after the deploy

- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from the post-merge section of the terminal tabs plan, branch `calummoore/terminal-tabs-implementation-l5ml`.
- **Location:** None.
- **Reason:** The checks need the deployed Worker and a cloud computer with the new software release.

- **Terms:**
  - **Terminal tabs:** up to 10 shells in one workspace, each with its own tab in the Terminal tool. `docs/protocol/terminal.md` gives the rules.
  - **Restart:** the action in the workspace header that restarts the runner, the preview relay, and the terminal service of a running cloud computer, as `docs/protocol/restart-the-software.md` says.
- **Background:** A workspace gets terminal tabs when its terminal service runs a release with the new attach program: after the automatic software update, at a Restart or a later start of its cloud computer. Until then it shows one terminal with no tab row. An older Mac app build shows only the first terminal.
- **Task:**
  1. After the deploy and a software update, use Restart, or stop and resume the cloud computer. Open a workspace. Open three terminals, and run a different command in each.
  2. Reload, and check that each terminal kept its command.
  3. Close one terminal. Open terminals until the limit, and check that the + turns off and the limit line shows.
  4. Open a workspace whose terminal service has not started on the new software. Check that it shows one terminal and no +.
  5. After the next Mac app release, repeat steps 1 to 3 in the Mac app.
- **Impact if no action:** A problem that only the deployed system shows, such as the ttyd URL argument or the support marker in a real cloud computer, stays unseen.
- **Needs:** The deployed change, a workspace on the new software release, and later a new Mac app release.
- **Done when:** Steps 1 to 4 pass on the web app, and step 5 passes in the Mac app.
