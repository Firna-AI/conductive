# Verify pull request actions on the deployment

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the pull request bar actions implementation.
- **Location:** The test deployment, `docs/protocol/github-banner.md`, `docs/protocol/continue.md`, and `docs/protocol/agent-instructions.md`.
- **Reason:** The check needs the merged deployment and a rebuilt org image with the new runner.

- **Terms:**
  - **Pull request bar:** The GitHub state and actions at the top of a workspace's right column, with actions in the phone Checks tab.
  - **Continue:** The action after a merge that creates a new branch in the same workspace and keeps its cloud computer and sessions.
- **Background:** The bar sends fixed agent messages for Create pull request, Commit and push, Fix checks, Resolve conflicts, and Address review. The app merges as the member who clicks. Every org member can Continue. Archive remains limited to the owner and admins. Older org images keep their older runner and can lack authenticated `gh` or the new changes-report fields.
- **Task:**
  - Rebuild an org image with the merged runner and authenticated GitHub CLI. Create a workspace from that image on a repository used for tests.
  - Run each agent action from the bar. Check the message sender, selected session, model, preserved draft, resulting commit or pull request, and absence of unsolicited GitHub replies.
  - Check local-work priority with a changed file and with a current-branch commit that no remote branch holds. Commit and push must replace Merge or a fix action.
  - Merge a test pull request with a member who has GitHub write access. Check the named merge method, progress, final state, and GitHub merger identity.
  - Open the same workspace as a member without repository write access. Merge and agent actions must be absent. GitHub links must remain.
  - Run Continue as another org member. Check its local-work question, new branch from the updated default branch, unchanged workspace name and sessions, moved files, preserved old-branch commits, chat notes, and new GitHub state.
  - Check Continue while an agent turn runs. It must wait. Check Continue from a stopped cloud computer.
  - Send messages in old and new sessions after Continue. Confirm that the agents use the new workspace branch and current target branch.
  - Archive a workspace with work on an older local branch. It must archive at once without a work question and offer Restore. Restore must return it stopped with its files, old branches, and agent sessions retained.
  - Check desktop and phone layouts. Record the actual results and any failed GitHub permission or image prerequisite.
- **Impact if no action:** Local tests cannot prove the live GitHub permissions, rebuilt-image rollout, or deployed routing.
- **Needs:** The merged test deployment, permission to rebuild an org image, test repository access, agent logins, and members with and without GitHub write access.
- **Done when:** Every listed action succeeds with the expected member identity and data preservation. Both layouts match the protocol. Any failure has its own complete follow-up item.
