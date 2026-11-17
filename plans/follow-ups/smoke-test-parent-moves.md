# Smoke-test parent moves in production

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from branch `calummoore/conductive-mcp-nested-agents-iet3`, the post-merge task of its plan.
- **Location:** None
- **Reason:** The test needs the merged change deployed to `conductive.build` and cloud computers with the new tools.

- **Background:** `move_workspace` and `conductive workspaces move` can now change the parent of a workspace. `parentId` (CLI `--parent ID`) nests the workspace with its whole tree under a parent. `topLevel: true` (CLI `--top-level`) takes it out of its tree to the top of a section. A loop gets HTTP 409 `nesting_cycle`, and a tree past depth 3 gets HTTP 409 `nesting_limit`. An open tab rereads the list when a workspace record arrives with another parent. `docs/protocol/parent-changes.md` gives the rules.
- **Task:**
  - In a test org, ask an agent to nest one workspace under another with `move_workspace` and `parentId`.
  - Then ask it to take the workspace out with `topLevel: true` and a section.
  - Keep a tab open on the moved workspace, and watch the sidebar.
  - Ask it to move a workspace under one of its own sub-workspaces, and check the `nesting_cycle` refusal.
- **Impact if no action:** A deploy problem in the new move path stays unseen until a member meets it.
- **Needs:** The merged and deployed change, and a cloud computer whose tools updated after the deploy.
- **Done when:** The nest and the take-out each show the right place in the open tab within a few seconds, and the loop gets `nesting_cycle` with no change.
