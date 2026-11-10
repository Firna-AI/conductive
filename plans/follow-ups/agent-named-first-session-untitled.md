# The first session of an agent-named workspace has no title

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the plan `plans/start-from-github.md` on the branch `calummoore/new-chat-start-from-brainstorm`.
- **Location:** `worker/chat/session-titles.ts:17`, `worker/chat/workspace-title.ts:32`, and `docs/protocol/agents-and-sessions.md:64`.
- **Reason:** The plan that found it changes how new workspaces start, not how sessions get their titles.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Title request:** the request to a small model of Workers AI that writes a name for a new workspace from the text of its first message.
  - **First session:** the session that the first message of a workspace starts. Its tab shows its title, or "Untitled".
- **Background:**
  - `docs/protocol/agents-and-sessions.md` says that a new session has no title, and that its tab shows "Untitled".
  - The same doc says that the first session takes the title of the workspace when the workspace takes a title as its name. Each other session takes its title from its first message with text.
  - `docs/protocol/chat-and-events.md` says that the app sends the title request only while the workspace has no name.
  - `docs/protocol/agent-tools.md` says that a create call of an agent can give the new workspace a name.
  - In `worker/chat/session-titles.ts`, `applyMessageSessionTitle` skips the first session. Only `applyWorkspaceSessionTitle`, which `storeWorkspaceTitle` in `worker/chat/workspace-title.ts` calls after a title request, gives the first session a title.
- **Problem:** A workspace that an agent names in its create call starts no title request. So its first session seems to keep no title, and its tab shows "Untitled" beside a named workspace. No reproduction confirms this yet.
- **Impact if no action:** Each workspace that an agent creates with a name shows an "Untitled" tab for its first session.
- **Root question:** What title does the first session of a workspace get when the workspace already has a name?
- **Options:**
  - **A.** Keep "Untitled", and state it in `docs/protocol/agents-and-sessions.md`. Effort: Small.
  - **B.** The first session takes the name of the workspace as its title when the create call gives a name. Effort: Small.
  - **C.** The first session takes its title from its first message, as each other session does. Effort: Small.
- **Left out:** A title request for a named workspace, because the name already exists and the request only names a workspace without a name.
- **Wider fix:** B. The first session then always shares the first name of its workspace, whatever gave that name.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the rule that the first session shares the name of its workspace. First, reproduce the "Untitled" tab with a test of an agent create call with a name.
- **Action:** ask the user, because no requirement says which title the first session gets when a create call names the workspace.
