# Agent-named workspace keeps an Untitled first session

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from the options check of the plan for branch `calummoore/workspace-name-underscores`, which removes underscores from the names that the title model writes.
- **Location:** `worker/chat/session-titles.ts:27`, `worker/chat/workspace-titles.ts:58`, `worker/chat/sessions.ts:27`, and `worker/tools/create.ts:60`.
- **Reason:** No protocol doc says what the first session of a workspace that a create call names shows, so the answer is a new requirement for the user, outside the scope of the underscore change.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Create call:** the `create_workspace` tool or the `conductive workspaces create` command. An agent in one workspace uses it to start another workspace, and it can give the new workspace a name.
  - **Title model:** the small Workers AI model that names a new workspace from its first message, while the workspace has no name.
  - **First session:** the first chat tab of a workspace. Its record is the first session of the workspace in chat storage.
- **Background:**
  - A new workspace and each new session start with no name, and the app shows "Untitled", as "Workspace and session names" in `docs/protocol/agents-and-sessions.md` says.
  - When the title model names a workspace, the first session takes the same name, as "Sessions" in `docs/protocol/agents-and-sessions.md` says (decision 181).
  - Each other session takes its title from the first line of its first message with text.
  - A create call can give the new workspace a name, as "Create and list calls" in `docs/protocol/agent-tools.md` says. The workspace then has a name, so the Worker asks the title model for nothing.
- **Problem:** The first session of a workspace that a create call names never gets a title. `worker/chat/sessions.ts` starts each session with a null title. `applyMessageSessionTitle` in `worker/chat/session-titles.ts` skips the first session, and only a `workspace.title` event names it. The workspace list shows the name of the agent, and the session tab shows "Untitled".
- **Impact if no action:** Each workspace that an agent names keeps an "Untitled" tab until a member renames the session.
- **Root question:** What name does the first session of a workspace that an agent named show?
- **Options:**
  - **A.** The first session takes the name of the create call, as it takes a name from the title model. Effort: Small.
  - **B.** The first session takes its title from the first line of its first message, as each other session does. Effort: Small.
  - **C.** Change nothing. The tab shows "Untitled" until a member renames the session. Effort: Small.
- **Left out:** The title model names the first session also when the workspace has a name: this costs a model call for a name that the agent already gave, and the tab and the list then show two different names.
- **Wider fix:** None. The create call is the only way to name a workspace when it starts, so the problem has one path.
- **Previous examples:** None found.
- **Recommendation:** A. The tab and the workspace list then show the same name, as they do for a name from the title model.
- **Action:** ask the user, because no protocol doc says what this tab shows, and each option that changes it adds a requirement.
