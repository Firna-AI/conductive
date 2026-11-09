# Sandbox code can set any workspace name

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the options check of the plan for the workspace title, on the branch `calummoore/chat-title-rename`.
- **Location:** `worker/chat/other-events.ts:31`, which reads the name of a `workspace.title` event with `string` from `worker/chat/inputs.ts:12`.
- **Reason:** The branch makes the runner send short, clean titles, and a check of the names that other senders send is a stricter validation, which needs the user.

- **Source:** Review. **Category:** Security.
- **Terms:**
  - **Workspace token:** the secret of one workspace that its sandbox holds. The agent runner proves itself with it when it connects to the Worker.
  - **`workspace.title`:** the runner event that carries a new workspace name. The Worker stores the name in its database and sends it to the workspace list of each member of the org.
- **Background:** The agent runner connects to the Durable Object of its workspace with the workspace token, as "The workspace token" in `docs/protocol/access-and-security.md` says. The agent tool processes get the same token in the variable `CONDUCTIVE_WORKSPACE_TOKEN`, so any code in the sandbox can read it. The Worker takes the name of each `workspace.title` event as it is: also an empty name, or a name near the event limit of 1 MiB.
- **Problem:** Any code in the sandbox can connect as the runner and set any workspace name, of any length.
- **Impact if no action:** A dependency or a script in the sandbox can show misleading text, or a very long name, in the workspace list of each member of the org.
- **Root question:** Which workspace names does the Worker accept from a sandbox?
- **Options:**
  - **A.** Accept each name, as now. Effort: Small.
  - **B.** Refuse an empty name and a name over a limit, such as 100 characters, as an invalid runner event. The refusal marker and the repair request already exist for such events. Effort: Small.
  - **C.** Keep the old name for an empty name, and cut a long name to the limit, with a warning in the Worker log. The workspace still gets a name from a long title. Effort: Small.
  - **D.** The Worker ignores each `workspace.title` from a sandbox, because the Worker now writes the titles itself: the user chose on 8 November 2026, with decision 184 C of the workspace title plan, that the Worker asks a Workers AI model for the title. No runner sends a title any more. This removes the runner title path of the Worker, its repair request of the kind `workspace.title`, and their tests, which are on `origin/main`, so it needs the user's approval. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D. It removes the case, while B and C only limit it.
- **Previous examples:** None found.
- **Recommendation:** D. No sandbox code can then set the name at all, because the Worker owns each title. C is the smaller change if the runner path must stay.
- **Action:** ask the user, because D removes functionality that is on `origin/main`, and B and C add a stricter check of runner input, and the always-on rules give each of these choices to the user.
