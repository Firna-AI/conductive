# The relay notice and the guide disagree

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from Milestone 1 of the plan `plans/html-file-preview.md` on branch `calummoore/preview-html-file-c42r`.
- **Location:** `worker/previews/relay.ts:16`, `docs/protocol/port-previews.md:133`, `docs/protocol/terminal-previews-and-desktop.md:146`, `src/marketing/docs/terminal-and-previews.md:205`.
- **Reason:** The HTML file preview change does not change the relay check, and the right advice depends on a fact about Restart that needs a check in a real cloud computer.

- **Terms:**
  - **Preview relay:** the app's own service in each cloud computer, `conductive-preview-relay.service` with its socket. Each preview request goes through it.
  - **Restart:** the control in the workspace header that downloads the newest release of the cloud computer software, then restarts the agent runner, the preview relay, and the terminal service.
  - **Build computer:** the admin action that builds the org image, which new workspaces start from.
- **Background:**
  - When the preview relay does not run, the Worker refuses each preview with 409 `preview_relay_unavailable`. `worker/previews/relay.ts` gives the message "Previews need newer cloud computer software. Start a new workspace after an admin runs Build computer."
  - `docs/protocol/port-previews.md` says the same: "The user starts a new workspace after an admin runs Build computer."
  - The public guide `src/marketing/docs/terminal-and-previews.md` says: "If Preview asks for newer software, select **Restart** in the workspace header."
  - `docs/protocol/restart-the-software.md` says that Restart downloads the newest release and restarts the agent runner and the preview relay.
  - `image/install.md` says that a release install enables the relay units but starts no stopped service. So a restart of the relay may start a relay that a release installed, but no test shows it.
- **Problem:** A member who sees the relay message and reads the guide gets two different steps. One of the two texts is probably wrong.
- **Impact if no action:** A member may start a new workspace when a Restart would be enough, or press Restart when it cannot help.
- **Root question:** What must a member do when Preview says that it needs newer cloud computer software?
- **Options:**
  - **A.** Check in a real cloud computer without a running relay whether Restart starts the relay. If it does, change the message and `docs/protocol/port-previews.md` to ask for Restart. Effort: Small.
  - **B.** Keep the message, and change the guide sentence so that it names only the missing server list, which Restart fixes. Effort: Small.
- **Left out:** A Restart button in the message. Restart lives in the workspace header, and the message only names it.
- **Wider fix:** None, because this is one stale text, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** A. A Restart is faster for the member than a new workspace, and the guide already asks for it.
- **Action:** ask the user, because A changes the step that `docs/protocol/port-previews.md` states for a cloud computer without a running relay, and no recorded user decision covers that change.
