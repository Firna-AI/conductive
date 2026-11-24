# Agent tools for the merge queue

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from `calummoore/merge-queue-k2ep`.
- **Location:** `worker/tools/`, `crates/cnd-runner-interface/src/tools/`.
- **Reason:** The merge queue change left agent tools out of its scope, and no decision says whether an agent may add a pull request to the queue.

- **Source:** Design. **Category:** Docs or spec.
- **Terms:**
  - **Agent tools:** the workspace tools that agents call, such as `create_workspace` and `send_message`, documented in `docs/protocol/workspace-tools.md`.
  - **Queuer:** the member who adds a pull request to the merge queue. The queue merges as that member (decision 314).
- **Background:** Members add a pull request to the merge queue from the pull request bar, the row menu, the header menu, the command palette, or a drag into the Merge queue group (decision 317). Agents have no tool for the queue.
- **Problem:** An agent that finishes a task cannot put its pull request in the queue. A member must do it.
- **Impact if no action:** Each queued pull request needs a member action, also in automations.
- **Root question:** May an agent add, remove, or re-order merge queue entries, and as which member?
- **Options:**
  - **A.** No agent tools for the queue. Effort: Small.
  - **B.** An agent tool that adds the calling workspace's pull request, as the member who sent the turn, with the same write access checks as the app. Effort: Medium.
  - **C.** B, plus remove and re-order. Effort: Medium.
- **Left out:** A tool that acts as the workspace owner, because work on GitHub runs as the member who sent the turn (decision 50).
- **Wider fix:** None.
- **Previous examples:** `docs/protocol/workspace-tools.md` gives agents workspace and session tools as the sending member.
- **Recommendation:** B. An agent can then queue its own finished work, and the queue merges as the member who asked for the work.
- **Action:** ask the user, because B adds a new agent action that no requirement covers.
