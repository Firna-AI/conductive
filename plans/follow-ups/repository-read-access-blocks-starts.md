# No repository read access blocks every start

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-14, from the mockups of branch `calummoore/delft-39rk` (workspace starts from another branch).
- **Location:** `worker/lifecycle/default-branch-command.ts`, `src/shell/new-workspace/BranchList.tsx`.
- **Reason:** The behaviour is older than the branch that found it, and only its notice inside the branch picker is new.

- **Source:** Implementation.
- **Category:** Product bug.
- **Terms:**
  - **Sender:** the member whose message starts the first turn of a new workspace. The start fetches the repository with the GitHub token of the sender.
- **Background:**
  - The start of a new workspace fetches its start branch with the GitHub token of the sender, as `docs/protocol/github-tokens.md` says.
  - A member whose GitHub account cannot read the repository therefore cannot start any workspace in it.
  - The branch picker of New workspace shows "no access" for that member, but only when the member opens the picker.
- **Problem:** New workspace lets such a member send the first message. The workspace then fails at its first start.
- **Impact if no action:** The member gets a failed workspace and a generic start error, and must ask an admin for GitHub access.
- **Root question:** How does a member learn, before the send, that GitHub does not let that member read the repository?
- **Options:**
  - **A.** No change. Effort: Small.
  - **B.** New workspace reads access when it opens, and shows a notice over the composer with Send off, as for a waiting repository. Cost: a new read on each open, a mockup, and a protocol change. Effort: Medium.
  - **C.** The create refuses with `github_access_required` when the token cannot read the repository, and the composer keeps the message. Cost: a new refusal. Effort: Small.
- **Left out:** A fetch with another member's token, because each start uses the sender's own access.
- **Wider fix:** B. The member learns of the problem before writing the message.
- **Previous examples:** A waiting repository shows a notice over the composer with Send off, as `docs/protocol/create-a-workspace.md` says.
- **Recommendation:** C. It reuses the branch check of the create and keeps the message.
- **Action:** ask the user, because C adds a refusal and B adds a notice that no requirement covers.
