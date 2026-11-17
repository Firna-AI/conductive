# New sandbox tools refuse an older Worker's replies

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the compatibility check of the branch `calummoore/perth-5m3h`, which adds sub-workspaces. The class is older than that branch.
- **Location:** `crates/cnd-tools/src/reply.rs` (the reply parse and its check), `crates/cnd-tools/src/reply_validation.rs` (`valid`), `crates/cnd-runner-interface/src/tools/` (the reply types), `docs/automatic-deploys.md` (section "When a deploy fails").
- **Reason:** Every reply field that a change adds has the same limit, also fields on `main` such as the fast choice, so the fix is a rule for all reply types, not part of one feature.

- **Terms:**
  - **Workspace tools:** the CLI and the MCP server of the Rust program `conductive` in each cloud computer. They call the Worker under `/v1/tools/`.
  - **Release:** one version of the sandbox software. Each deploy from `main` publishes one, and each cloud computer installs a newer one at a later start. The newest release never goes back to an older version.
  - **Rollback:** `npx wrangler rollback`, which restores an earlier Worker version. It changes no release.
- **Background:**
  - The tools parse each reply into a Rust reply type, then serialize that value again. `valid` in `crates/cnd-tools/src/reply_validation.rs` checks that each field of that value is present in the reply. A missing field fails the call with a reply error.
  - A field that the reply type does not know is dropped. So older tools keep working with a newer Worker.
  - A newer reply type with a new field that the Worker always sends fails with an older Worker. Examples: `parentId` of a workspace and of a list entry, and `parent`, `depth`, and `children` of `get_workspace`, from the branch `calummoore/perth-5m3h`; and `fast` of a model choice on `main`, which has `#[serde(default)]` but still serializes.
  - The normal order keeps tools and Worker in step: the deploy publishes its release only after the new Worker answers its health check.
  - After a rollback of the Worker alone, cloud computers that installed the newer release run newer tools against the older Worker.
- **Problem:** After a rollback of the Worker, the newer tools refuse the replies of the calls whose reply types gained a field, such as `list_workspaces`, `get_workspace`, and `create_workspace`.
- **Impact if no action:** Agents cannot use those calls until a fix forward deploys. The rest of the product keeps working.
- **Root question:** How do the workspace tools of a newer release keep working with an older Worker after a rollback?
- **Options:**
  - **A.** Give each added reply field a default and skip it in the serialized value when it holds the default, so that the check passes without it. Cost: an agent sees no field for a default value, such as no `parentId` for a top-level workspace, so the docs of each such field change. Effort: Medium.
  - **B.** Let `valid` accept a missing field whose value is the type's default, such as `null`, `false`, `0`, or an empty list. Cost: the check no longer catches a Worker that drops such a field by mistake. Effort: Small.
  - **C.** Document that a rollback of the Worker needs a matching release, and add a release step that pins the cloud computers to the release of the restored Worker. Effort: Large.
- **Left out:** Keeping the old reply types beside the new ones, because each call would then need two parsers.
- **Wider fix:** B. It covers each field that a later change adds, with no rule for each field.
- **Previous examples:** The fast choice on `main` has the same limit.
- **Recommendation:** B. One rule in the check keeps the tools working across a rollback, and the Worker's own tests still check each field.
- **Action:** ask the user, because B loosens a check of replies, and only the user can approve a looser check.
