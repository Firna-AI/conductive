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
  - **D.** The Worker makes the title itself, so no sandbox code sets the name. It needs a model call or a rule in the Worker, and it changes the protocol rule that the agent writes the title. Effort: Large.
- **Left out:** None.
- **Wider fix:** None. The other text of runner events, such as the labels of start steps, shows only inside its own workspace.
- **Previous examples:** None found.
- **Recommendation:** C. It keeps the name readable for every member, and it handles a long title without a failure, as the always-on rules prefer.
- **Action:** ask the user, because each option except A adds a stricter check of runner input, and the always-on rules give that choice to the user.
