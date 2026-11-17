# Secret variable names

Status: Active. On branch `calummoore/secrets-valid-variable-names-j7hr`, no pull request exists yet. This is the initial plan-only change. Implementation waits for Cal to approve this plan and settle variable-name decision 1. The final pull request into `main` deletes this plan.

Conductive lets an agent run one command with approved org secrets. MCP starts the command through `/bin/sh -c`. The tool currently uses each exact secret name as an environment key. A shell drops keys such as `Cloudflare (read-only)`. The command can then succeed without receiving the secret.

On 17 November 2026, Cal chose decision 5 A + B in the investigation of “The agent stopped” in workspace 134. A adds a valid environment variable name for each secret. The list and run replies give that name. Existing secrets keep working. B limits new org secret names to letters, digits, and underscores. This plan records that choice. It does not reopen it.

The change covers `run_with_secrets`, `conductive secrets run`, their list calls, and org secret names. It keeps secret values out of output, files, logs, commits, and answers. It changes no grants, role rights, reveal rules, approval lifetimes, output filtering, or snapshots.

Contract owners:

- [Secrets](../docs/protocol/secrets.md).
- [Secret requests](../docs/protocol/secret-requests.md).
- [Sandbox tools](../tools/README.md).
- [The tools crate](../crates/cnd-tools/README.md).
- [The shared interface crate](../crates/cnd-runner-interface/README.md).
- [The mockup catalogue](../docs/mockups/catalogue-secrets.md).

## Design

The calls below are orchestrator design calls from 17 November 2026. They apply Cal's A + B decision and the production compatibility requirement. Variable-name decision 1 still needs Cal's answer. The design describes the recommended option A. Options B, C, and F change the ownership and namespace work.

### Names and variables

- A secret name remains the lookup and approval key. A variable name identifies its entry in the child environment.
- Keep the exact case of names that already match `[A-Za-z_][A-Za-z0-9_]*`. Existing commands can keep reading them.
- For other names, uppercase ASCII letters. Replace each run outside `[A-Za-z0-9_]` with one underscore. Remove underscores at both ends.
- Use `SECRET` when that result is empty. Prefix an underscore when the result starts with a digit.
- Thus `Cloudflare (read-only)` becomes `CLOUDFLARE_READ_ONLY`. `9-key` becomes `_9_KEY`. `...` becomes `SECRET`. The leading-digit names `9key` and `9KEY` also become `_9KEY`.
- Treat non-ASCII characters as characters to replace. Do not introduce locale-dependent conversion or transliteration.
- Apply the same rule to approved temporary values. Their names can already hold the same characters as existing org secrets.
- Keep original-name entries too when the environment can represent those exact keys. Omit an empty key and any key that contains `=` or NUL.
- A key that contains `=` can become a different key in a child. A NUL key prevents the current child from starting. Aliases supply their intended values without those entries.
- Original entries preserve direct environment readers. They do not make an invalid shell variable valid.
- Never let two different requested names overwrite one environment key. Check aliases against aliases and original-name entries.
- Variable-name decision 1 chooses how to handle a conflict. Its recommended option checks names before it calls the Worker. No approval request or allowed-run record then describes a command that the collision prevents.
- Each requested secret overlays inherited child variables under its original name and its alias. This keeps the current environment-addition behavior and fulfills A's requirement to set the value under the alias.
- This overlay includes inherited names such as `PATH` and `GITHUB_TOKEN`. The list tells the agent the alias before execution. The parent environment stays unchanged.

### Ownership and replies

- The Rust sandbox tool owns the mapping and environment construction. It applies the rule once for CLI and MCP.
- The Worker keeps returning values under exact requested secret names. Do not add alias keys to `values`.
- This matters because older tools reject a Worker value map that holds unrequested names.
- Add `environmentVariable` to each printable tool list entry. Add an `environmentVariables` name-to-variable map to the MCP run result.
- The CLI keeps stdout for the command. It gives the same map as an escaped metadata line on stderr after the command.
- The CLI keeps its current stdin, exact argument execution, output filtering, and exit status.
- Keep pending, denied, and not-answered results safe. No such result starts a command or exposes a value.
- Rust owns each touched tool boundary type in `crates/cnd-runner-interface/`. Generate the TypeScript bindings with `ts-rs`.
- Remove the replaced handwritten tool types and update their direct consumers. Do not migrate unrelated browser API types.
- Keep the raw Worker responses separate from enriched printable tool replies. The value-bearing Rust response must have no diagnostic or reply serialization path.

### Compatibility

- With A, an updated tool derives metadata locally from a legacy Worker response. It needs no Worker feature flag or extra list request.
- An older tool keeps its current Worker response shape. The new Worker must not make it parse alias keys.
- An older tool keeps its current limitation for invalid shell names until the sandbox software updates. This change cannot repair an old executable.
- The existing sandbox software update path supplies the fix. Do not change that path in this work.
- Keep the old original-name entries as a compatibility path for programs outside this repository. Keep this path while those programs can read it.
- Do not add a database migration or rewrite stored secret names for the recommended option.

### Creation and settings

- Check new org secret names against `[A-Za-z0-9_]+`. Keep the existing trimming at the Add secret boundary.
- A leading digit remains allowed in a secret name. Its environment alias gets the prefix described above.
- Run the check for Add secret and for the Save as secret answer to a request. Check a whole save answer before any insert or approval write.
- Put the check at their shared creation boundary. It must not apply to reads, grants, reveals, description changes, or value replacement.
- The current product has no secret rename operation. Do not add one. A later rename feature must apply B to its new name.
- Existing invalid names remain visible and usable. Keep their names read-only in Replace.
- Add secret explains the allowed characters. Its name field shows an invalid-name error and keeps the typed value after a refusal.
- A request with an invalid missing name still offers 15 minutes and This workspace. It explains why Save as secret is unavailable.
- If one missing name is invalid, do not offer Save as secret for the combined answer. Keep the other lifetime choices.
- The Worker enforces B for older browser clients too. The app's development API mirrors the same rule.
- Mockups cover the Add secret error and the request lifetime choice on mobile and desktop before product UI work.

## Variable-name decision 1: Conflicting variable names

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `crates/cnd-tools/src/process.rs:76` and `crates/cnd-tools/src/client.rs:104`.
- **Terms:**
  - **Alias:** A valid variable name that the tool sets for one secret in the command environment.
  - **Collision:** Two different secret names that need the same environment key in one command.
- **Background:** Cal approved readable aliases for existing secret names. The tool must also preserve existing environment readers. A command can request several secrets together.
- **Problem:** `Cloudflare (read-only)` and `CLOUDFLARE_READ_ONLY` need the same alias under the proposed rule. Selecting one value would give the command incomplete or wrong data.
- **Impact if no action:** One secret can silently replace another in the command environment. A command can use the wrong account or service.
- **Root question:** How does each requested secret get its own valid variable name that the agent can learn before execution?
- **Options:**
  - **A.** Use the mapping above. Refuse a conflicting run before calling the Worker. Give both secret names and the conflicting variable, without values. Each secret still works in a separate run. A program that currently reads both original names together through the CLI loses that combined run. Symbol-only and non-ASCII-only names share `SECRET`. Leading-digit names can also conflict. No schema change is needed. Effort: Medium.
  - **B.** Allocate distinct aliases from all org names on each list and run. Reserve original valid names first. Give conflicting names numbered suffixes in a fixed order. Adding a secret can change an existing alias, also between list and run. Each run needs an extra list call or new Worker metadata. Temporary names still need A's refusal. Effort: Medium.
  - **C.** Store a permanent alias for each org secret. Allocate aliases during a migration and creation. Reserve those aliases when accepting later names. Existing aliases stay fixed, but some new names must be refused. Temporary names still need conflict handling. Effort: Large.
  - **D.** Add a stable hash suffix to each derived alias. Keep valid names unchanged. Keep A's refusal as a backstop. Conflicts become less likely, but aliases become harder to read and differ from Cal's example. The rule must remain stable. Effort: Medium.
  - **E.** Use A as the default. Add an optional alias per secret to the CLI and MCP run inputs. An agent can then choose distinct names for a combined run. This adds input, help, protocol text, and tests. Effort: Medium.
  - **F.** Use A and refuse creation when another org secret has the same alias. Apply the check to Add secret and Save as secret. Existing pairs and temporary names still need A. This adds a refusal beyond B, a Worker mapping, and another UI error. Effort: Large.
- **Left out:** Silently choosing a value can deliver a different account than the list names. Suffixes based only on the requested subset can disagree with the list reply. Requiring users to rename old secrets breaks Cal's compatibility choice. D brings encoded or hash-based aliases back as a real choice, despite their readability cost.
- **Wider fix:** A. Build the child environment through an ownership check. A duplicate key can never silently replace another secret.
- **Previous examples:** The reported shell defect uses `Cloudflare (read-only)`. The options check also proved that a synthetic `A=B` key can replace `A` in a shell. No earlier alias-collision case was found.
- **Recommendation:** A. It keeps names predictable and refuses ambiguous execution. C best preserves permanent distinct aliases, but it adds a schema and new name reservations.
- **Action:** ask the user, because A adds a new rejection for conflicting runs. The choices also trade a refused run against changing aliases or stored alias allocation.

Shared assumptions: Cal's A + B decision requires a valid alias for every existing name and metadata in list and run replies. `CLAUDE.md` requires compatibility with deployed tools and Workers. The current protocol requires original-name environment entries. Those entries stay where they can represent the exact name. The design removes malformed `=` entries and the NUL spawn failure while still supplying aliases. It keeps the current inherited-environment overlay. The readable rule is a design call, not a requirement from Cal's example. D changes that rule. E lets the caller override it. B, C, and F change alias allocation or creation.

The 17 November 2026 second-pass options check kept recommendation A. It added D, E, and F with those letters. Its report is `.context/secret-variable-names/options-check.md`.

## Replaced ways

- Exact-name-only child environment → original entries plus valid aliases. Consumers: CLI and MCP execution in `cnd-tools`. Move both in Milestone 4.
- Handwritten shared secret tool contracts → Rust-owned contracts with generated TypeScript. Consumers: Worker run input, runtime, values, events, and their direct readers and fixtures. Move those consumers in Milestone 3. Delete only replaced declarations.
- New org names checked only for non-empty text → the approved character check. Consumers: Add secret, Save as secret, and the development API. Move them in Milestones 3 and 5.

The original-name environment entries remain an additive compatibility path. They do not form a second execution path. No existing org name changes.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The `ui implementor` updates the existing catalogue before product code changes.

- [ ] Draw the allowed-name hint and invalid-name error in Add secret on mobile and desktop.
- [ ] Show an existing invalid name in the list and Replace without requiring a rename.
- [ ] Draw the request lifetime choices when a missing name cannot become an org secret. Cover the mobile value sheet and mixed requests.
- [ ] Reuse `@firna/ui` and the existing secrets components and copy. Keep values out of mockup output.
- [ ] Run `npm run mockups:check`. Open the changed catalogue pages and inspect both viewports.
- [ ] Update the design and TODOs of this plan for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: Milestone 1

The `docs implementor` updates internal docs. The `external docs implementor` updates public and legal text after those requirements are settled.

- [ ] Update `docs/protocol/secrets.md` with aliases, original entries, approved mapping, collision outcome, new-name validation, and existing-name compatibility.
- [ ] Update `docs/protocol/secret-requests.md` with list/run metadata and Save as secret validation. Keep temporary grants unchanged.
- [ ] Keep touched protocol pages near 250 lines. Use linked pages when needed and preserve live links and anchors.
- [ ] Update `tools/README.md`, `crates/cnd-tools/README.md`, and the shared interface README where public behavior or entry points change.
- [ ] Read both complete legal pages and their imported sections. Read every public guide in full. Update every sentence that restates a changed fact.
- [ ] Update the eight affected legal and guide sentences from the read-only audit. Add the new-name rule and existing-name compatibility to the public secret guide.
- [ ] Update related live mockup descriptions that say agents see only a secret's name.
- [ ] Check every relative link in each changed Markdown file.

Audit evidence will be kept in `.context/secret-variable-names/public-docs-audit.md`.

## Milestone 3: Tool contracts and new-name validation

Depends on: Milestone 2

The `non-ui implementor` owns the shared tool contracts and Worker changes. This milestone keeps the product working with the current executable.

- [ ] Move touched secret tool boundary types to `crates/cnd-runner-interface/`. Preserve their existing wire fields and status variants.
- [ ] Generate and commit TypeScript bindings. Import each generated type directly. Remove only the replaced handwritten declarations.
- [ ] Keep new printable alias metadata separate from the Worker value-bearing response.
- [ ] Implement the approved new-name check at the shared org secret creation boundary. Apply it to Add secret and Save as secret.
- [ ] Preflight a combined save answer before writes. A refusal must not create a partial set of secrets or grants.
- [ ] Keep existing invalid names available for list, run, Replace, Reveal, Delete, and grants.
- [ ] Apply the same new-name rule in the development API. Keep fixtures that prove existing invalid names still load.
- [ ] Add cases to the existing Worker creation and temporary-value tests. Prove the new assertions fail before the fix.
- [ ] Verify that legacy Worker replies still fit the tool contracts. Verify that generated bindings match the Rust source.

## Milestone 4: Tool mapping and child execution

Depends on: Milestone 3

The `non-ui implementor` adds aliases to the shared CLI/MCP execution path.

- [ ] Implement the approved mapping and collision policy. Construct one checked environment for both adapters.
- [ ] Preserve original entries that the operating system accepts. Preserve valid-name case and inherited environment behavior.
- [ ] Add variable metadata to list replies and run results. Give CLI metadata on stderr without mixing it into stdout.
- [ ] Keep Worker values under exact requested names. Keep malformed and unrequested values out of the child and all printable replies.
- [ ] Update `crates/cnd-tools/src/help.txt` and `crates/cnd-tools/src/mcp-tools.json` with variable lookup guidance and the collision outcome.
- [ ] Extend the native process regression to prove a nested program sees an alias for `Cloudflare (read-only)`. Do not print a value.
- [ ] Exercise direct environment readers through the CLI to prove original-name compatibility.
- [ ] Cover normalization boundaries and the approved collision outcome at the lowest public tool boundary. Do not duplicate private helper tests.
- [ ] Extend existing adapter cases for metadata, old Worker replies, nonzero exits, and redaction. Keep every unrelated assertion.
- [ ] See each new assertion fail before the fix. Run every new asynchronous test 10 times and record its cost.

## Milestone 5: Product UI

Tags: ui

Depends on: Milestones 1, 3, and 4

The `ui implementor` makes the app match the approved mockups. It changes no backend code.

- [ ] Use the allowed-name hint and field error in Add secret. Retain typed data after a refusal.
- [ ] Keep existing invalid names readable and replaceable without validating their old names again.
- [ ] Apply the approved Save as secret availability in the request card and mobile value sheet. Keep the other lifetimes available.
- [ ] Extend existing UI tests only for the new field error and request lifetime behavior. Prove each new assertion fails before the fix.
- [ ] Run each new asynchronous test 10 times and record its cost.
- [ ] Start the app and inspect Add secret, Replace, and the value request on mobile and desktop. Use synthetic data only.

## Milestone 6: Verification, review, and pull request

Depends on: every earlier milestone

The orchestrator checks the combined result and owns the gate, review, and pull request.

- [ ] Read every delegated diff and confirm each completed TODO. Save prompts and reports under `.context/secret-variable-names/`.
- [ ] Run targeted tests for the changed behavior. Record commands, counts, expected failures, repetitions, and added test times.
- [ ] Run early `npm run format:check` and `npm run lint` before long checks.
- [ ] Smoke-test the CLI and MCP against a local fake Worker. Verify a nested program receives the alias without outputting a value.
- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`. Run `npm run check` with Node 24.
- [ ] Run `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, and `cargo test --workspace`.
- [ ] Run `cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli`. Install the target and `musl-tools` if needed.
- [ ] Run the binding generator and verify that generated files have no uncommitted drift.
- [ ] Audit deletions, commit with Conventional Commits, and push this workspace branch.
- [ ] Run a fresh post-push review against `origin/main`. Check each finding with a fresh second pass. Apply the finish-work fix rule.
- [ ] Complete the permitted fix rounds, verify their changes, and record any follow-up items.
- [ ] Delete this plan after the other required TODOs pass. Commit and push the deletion.
- [ ] Open a pull request into `main` only after the gate passes. Give the dated decisions, design calls, plan permalink, compatibility limits, and test evidence. Watch every CI run of the last commit before the final report. Do not merge the pull request.

The shared skill scripts live in `/home/user/code/skills/skills/` in this workspace. Use those scripts when the skill's short `scripts/` path is absent here.

## Approval and review record

- 17 November 2026: Cal's decision 5 A + B is the approved approach. The detailed plan has not been approved.
- 17 November 2026: the second-pass options check kept recommendation A and added D, E, and F. Variable-name decision 1 remains open.
- The initial plan-only change runs Markdown validation and a read-only review. The npm and Rust gates wait for implementation.
