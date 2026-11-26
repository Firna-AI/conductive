# Previous Worker rule names only D1 migrations

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-history-and-files-state-14g5` (decision on the rollback of the bucketed projection) and the review of PR #672.
- **Location:** `migrations/README.md:7-15`, `docs/automatic-deploys.md`
- **Reason:** A rule for Durable Object storage is a repository-wide process change outside the memory work.

**Terms**
- **Previous Worker:** the Worker version that was live before a deploy. It runs again after a rollback.
- **Two-PR rule:** a change that the previous Worker cannot read ships first as a reader, and the writer merges only after the reader has been live for at least one hour.

**Background:** "Keep the previous Worker working" in `migrations/README.md` covers D1 schema changes only. The workspace object memory work changed Durable Object storage formats: the file projection, the runner report assembly state, and the history index. Cal approved a two-PR rollout for the file projection on 23 November 2026, by analogy with that rule.

**Problem:** No doc says that a Durable Object storage format change must keep the previous Worker working, or how to ship one.

**Impact if no action:** A later change can write a storage format that the previous Worker cannot read, and a rollback then breaks workspaces.

**Root question:** Where does the repository state the previous Worker rule for Durable Object storage?

**Options:**
- **A.** Add a section to `docs/automatic-deploys.md` that applies the previous Worker rule and the two-PR rule to Durable Object storage formats, and link it from `migrations/README.md`. Effort: Small.
- **B.** Add only a line to `AGENTS.md` under Status. Effort: Small.

**Left out:** A lint for storage keys: no reliable signal finds a format change.

**Wider fix:** A is the rule for the class.

**Recommendation:** A.

**Action:** ask the user, because it is a process rule for every agent.
