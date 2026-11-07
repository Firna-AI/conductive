# A copied workspace token outlives its member's access

- **Severity:** High. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, a new problem of the check of finding 5 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1. The same gap after a removal from the org exists on the primary branch.
- **Location:** `worker/chat/queries.ts:25` (`tokenWorkspace`), the git credential route, the agent tool routes, and "Runner" in `docs/protocol/access-and-security.md:120`.

- **Terms:**
  - **Workspace token:** the long-lived secret that the programs of a cloud computer use to reach the app: the runner connection, the git credential route, and the agent tools. The cloud computer holds it in its environment.
  - **Runner:** the program in the cloud computer that runs the agent and receives the agent login of each turn.
- **Background:** Every member with a terminal in a cloud computer can read its workspace token. The token works while it is not revoked, the workspace is not archived, the org is not deleted, and the owner is not suspended. Milestone 15m revokes the tokens of the workspaces that a suspended user owns. No code revokes or replaces the token of any other workspace.
- **Problem:** A member who copied the token of a colleague's workspace keeps it after a removal from the org or a suspension. With it, the member can connect a false runner from any machine, and receive the agent logins and GitHub tokens of the next turns.
- **Impact if no action:** A removed or suspended member can take the agent logins and GitHub tokens of the other members, after they lost their own access.
- **Root question:** How does a member lose the access of a cloud computer's own programs when the member loses access to the org?
- **Options:**
  - **A.** Accept it for now, and state the risk in the access protocol, as decisions 114 and 121 do for the logins of a turn. Effort: Small.
  - **B.** Replace the token of each workspace of the org when a member loses access. A running workspace gets its new token over its live runner connection, and a stopped one at its next start. A copier who is not connected at that moment loses access. Effort: Medium.
  - **C.** Give each cloud computer an identity that a copied token cannot reuse, for example a credential that the provider binds to the machine. Nobody has checked that the provider offers it. Effort: Large.
- **Left out:** A short token life alone, because a false runner that stays connected can renew it like the real runner.
- **Wider fix:** C. B narrows the window to one moment, and C removes the copy.
- **Previous examples:** decision 114 (tool programs keep a login after the turn), decision 120 (agent logins readable in the sandbox), and decision 121 (the GitHub token readable in the sandbox).
- **Recommendation:** B, in its own milestone after Milestone 15m merges. It closes the removal case too, and it needs no provider feature.
- **Action:** ask the user, because B adds a rule for the life of a workspace token that no requirement covers.
