# Trust for inline shell in org skills

Status: Active. [PR #426](https://github.com/Firna-AI/conductive/pull/426) is open on branch `calummoore/oslo-3u7a`. Cal approved the detailed plan with 403 C on 2026-11-18. Implementation is in progress. The last implementation commit deletes this plan.

Conductive gives workspace agents the skills of one public GitHub
repository chosen by an org admin. Claude can run inline shell commands
while it reads a skill, before the model chooses a tool. The helper
currently makes those commands inert in copied org skills.

On 2026-11-17, Cal chose a repository trust setting for decision 403.
The setting must explain its effect. When trust is off, apply option B:
also use Claude's native inline-shell restriction. This plan records
option C for that choice. It covers Claude inline shell only. Copy status
in the app and the member failure icon remain separate work.

Contract owners:

- [Org skills](../docs/protocol/org-skills.md).
- [Repository trust](../docs/protocol/org-skills-trust.md).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md#org-skills).
- [Cloud computer guide](../src/marketing/docs/cloud-computer.md#share-agent-skills-across-the-org).
- The [runner README](../runner/README.md#org-skills) and
  [SDK helper README](../runner/sdk-helper/README.md#org-skills).

## Decision 403: Control automatic commands from skills

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review, with the trust approach chosen by the user.
- **Category:** Security.
- **Location:** `runner/sdk-helper/src/providers/skill-metadata.ts`,
  `runner/sdk-helper/src/providers/claude.ts`, and
  `docs/mockups/src/components/settings/SkillsSection.tsx`.
- **Terms:**
  - **Inline shell:** Commands embedded in a skill that Claude runs while it reads the skill.
  - **Native restriction:** Claude's `disableSkillShellExecution` setting, which stops inline shell in skills and custom slash commands throughout its session.
- **Background:** Org skills reach every workspace of an org. The helper rewrites their inline-shell markers. Claude can add text before it parses those markers. Its native restriction covers that added text too.
- **Problem:** A filter can miss a form that a later Claude version adds. Applying the native restriction also affects workspace skills and custom slash commands.
- **Impact if no action:** Org skills keep relying on the helper's filter. Members have no explicit choice about automatic commands from shared skills.
- **Root question:** Who may allow automatic commands from shared org skills, and what keeps those commands off after a Claude update?
- **Options:**
  - **A.** Keep only the helper's filter. Each Claude syntax change can need another fix. Effort: Small for each change.
  - **B.** Always apply the native restriction alongside filtering. Workspace skills and custom slash commands also lose inline shell. Effort: Medium.
  - **C.** Add an admin-controlled trust setting beside the org skills repository. Default to B. Explicit trust permits inline shell in Claude org skills. Explain the session-wide effect and future repository updates. Effort: Medium.
  - **D.** Give each member a trust choice for their own sessions. This needs a second settings scope and different behavior between members. Effort: Large.
  - **E.** Use C, but trust only one reviewed commit. Each later push needs another admin approval. Store and show the approved commit. Effort: Large.
  - **F.** Give each workspace a trust choice. Add a settings scope, permissions, and rules for automation run workspaces. Effort: Large.
- **Left out:** Loading no skill folders fails the existing skills requirement. A custom parser or patched Claude build still needs maintenance when Claude changes. A pointer-only skill body still depends on Claude's generated text. A Skill-tool hook misses other invocation paths. The SDK exposes no text-only skill-folder source.
- **Wider fix:** C uses the native restriction whenever the repository is untrusted. Trusted execution then follows an explicit choice.
- **Previous examples:** Findings 101 and 301 found parser bypasses. Commit `efb6cc0d2` fixed the folder-name and argument-expansion forms.
- **Recommendation:** C, changed from B after Cal proposed the trust setting. It makes automatic execution an explicit choice for the configured repository.
- **Action:** fix now, apply C. Cal approved this detailed plan on 2026-11-18.

Shared assumptions and their sources:

- The skills source stays one public repository per org. The current
  [skills contract](../docs/protocol/org-skills.md#the-skills-repository)
  requires this. None of these options changes that source.
- Trust concerns Claude inline shell. Cal's answer concerns decision 403.
  It gives no permission to load hooks, MCP servers, settings, or agents.
- Org admins control settings that affect every workspace. The
  [Skills section contract](../docs/protocol/org-skills.md#the-skills-section)
  supplies that existing permission rule. D drops this assumption for trust.
- The native restriction acts throughout a Claude session. The pinned
  SDK states this scope. Per-skill native enforcement is unavailable.
- C trusts future repository updates. This is a proposed design call,
  not a separate choice already made by Cal. E drops this assumption.

The independent options check kept C on 2026-11-17. It added E and F.
This design includes its repository-name binding, save-retry behavior,
explicit unavailable-source scope, and restart explanation.

## Approved design

### Setting and explanation

- Add a control labelled **Trust this skills repository** in the existing
  Skills section of the Cloud computer tab.
- Only an org admin can change it. Members see the saved choice.
  Everyone sees a read-only choice in a suspended org.
- A new or existing org starts with trust off. No existing repository
  gains trust during migration.
- The control is available when a valid repository name is present.
  Saving invalid repository text keeps the existing lookup notice and
  cannot grant trust. Hide the control when the draft names no valid repository.
- Explain that trust permits automatic commands while Claude reads
  shared skills. Those commands run with the access of the workspace.
- Explain that trust covers future updates to that repository.
- Explain that turning trust off stops inline commands in all Claude
  skills and custom slash commands, including those of the workspace.
  This also applies when that repository is private, missing, or has no
  skills. The saved choice sets the policy, not the timing of the copy.
- Explain that agents can still choose to run commands through their
  ordinary shell tool, including commands suggested by an untrusted skill.
- Use a short shared notice or help text and a link to the public Cloud
  computer guide. Keep SDK setting names out of product copy.
- Show when the change applies: the next start or resume of each cloud
  computer. Saving does not change an active turn.
- Explain how to revoke trust: each running cloud computer must stop,
  then start again. It stops after 30 minutes without user activity or a
  running agent turn. An authorized member can also Archive, Restore, and
  resume it. Restart refreshes software, not saved settings. An active
  cloud computer can keep its old trust indefinitely. Repository updates
  can still reach it within five minutes before that stop and start.

### Repository identity and saving

- Store the normalized trusted repository name, or empty text. Trust is
  effective only when that name equals the configured repository name.
- Edit the repository and its trust choice in one draft. Changing the
  draft repository clears its trust choice. The admin can then explicitly
  trust the new repository before Save.
- Save the repository and trust choice together. Enable Save when either
  differs from its saved value. A failed Save keeps the draft and saved
  settings separate.
- A repository replacement or removal clears saved trust unless the
  same request explicitly trusts the named replacement. An older client
  that submits only a repository cannot carry trust to a replacement.
- A grant carries the trusted repository name. Never apply a bare boolean
  grant to whichever repository happens to be current.
- On each save retry, compare the grant with the repository after that
  request's own changes. A mismatch saves the result as untrusted and
  returns the saved state. It adds no rejection or silent trust transfer.
- Include both values in the existing optimistic concurrency checks.
  A concurrent change cannot attach a trust grant to a different source.
- Keep unrelated script and environment-variable saves from changing
  either value. Trust does not trigger an org image build.

### Worker, runner, and helper boundary

- Add a separate D1 migration with an empty trusted-name default. Keep existing
  migrations unchanged.
- Extend the settings response and update request with the trusted name.
  Older responses omit it and mean untrusted. Preserve older requests.
- The Worker supplies the configured and trusted repository names in
  reserved cloud-computer environment variables at start or resume.
  Org environment variables cannot replace either supplied value.
- Rust treats a missing, invalid, or mismatched trusted name as untrusted.
  A configured source means a valid name, not a successful GitHub lookup.
- Replace the directory-only helper option with one optional org-skills
  value. It carries the source name, trusted name, and available directory.
  An absent value means no source. A present value keeps its policy even
  without a directory. Matching names mean trusted. Other values mean untrusted.
- A configured untrusted repository enforces the native restriction even
  before its first copy finishes, or when no skill folder was selected.
- Generate the helper org-skills types from `cnd-runner-interface`. Update
  the helper request reader. Do not hand-edit generated TypeScript.
- Older released helper requests omit org skills. Keep their existing
  no-org-skills behavior. The runner and helper ship in one release.
  The directory-only option is unreleased and needs no compatibility path.
- Document that this behavior needs an updated runner and helper. Link to
  the [software update contract](../docs/protocol/sandbox-software.md#updates)
  for delivery. Keep software updates separate from settings refresh timing.

### Claude and Codex behavior

| Configured source | Trust | Claude org skill body | Claude native restriction |
| --- | --- | --- | --- |
| None | Inactive | No org skills | Omit the setting |
| Valid repository | Off | Keep inline markers inert | Set `disableSkillShellExecution: true` |
| Valid repository | On | Preserve inline-shell syntax | Omit the setting |

- For an untrusted source, retain the existing body filter and safe
  aliases. Pass the native restriction through the SDK flag-settings
  layer so project settings cannot turn it off.
- Merge that restriction into `claudeStart` settings. Preserve effort and
  fast mode. Later model changes must keep the restriction in force.
- Keep the filter because the SDK does not document added-folder sources
  separately under this flag. The pinned build treats them as project
  sources. The filter backs up that current native behavior.
- For a trusted source, preserve the original inline-shell body syntax
  in Claude's exported org skills. Omitting the native restriction alone
  would leave the helper's existing filter active.
- Trust does not force execution. Omitting the setting preserves other
  restrictions already supplied by Claude settings or managed policy.
- For both choices, retain the metadata allowlist, safe aliases,
  link isolation, workspace precedence, and owned temporary-view cleanup.
  Do not load hooks, MCP servers, agents, commands, or settings from the
  org repository.
- Keep the discovery root separate from the copied repository. Its
  `.claude` directory exposes only selected skill links. Check a copy with
  `.claude/commands` and settings before enabling trusted body syntax.
- Keep Codex skill loading and body filtering unchanged. The control and
  guide must say that its execution choice concerns Claude.

Design calls, made by the working agent on 2026-11-17:

- Use the existing org-admin scope because the shared source affects all
  workspaces. The user chose repository trust, not member-specific sources.
- Start untrusted and clear inherited trust on a source replacement.
  These defaults keep execution dependent on an explicit repository choice.
- Apply changes at cloud-computer start or resume, like the existing
  skills repository setting. This needs no new workspace-token route.
- Keep native workspace behavior when no org source is configured.
  There is no shared source whose automatic commands need a decision.
- Store a trusted repository identity rather than a boolean. A stale
  save or environment cannot attach trust to a different source.
- Use one optional helper org-skills value. This keeps identity, policy,
  and copy availability together without an unreleased directory converter.
- Save a mismatched grant as untrusted rather than adding a rejection.
  The returned saved state tells the UI which choice took effect.

Design calls, made by the working agent on 2026-11-18:

- Name the settings field `trustedSkillsRepository` and the reserved
  environment variable `CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY`. Both carry
  the trusted repository identity, so the name does not suggest a boolean.
- Compare valid repository identities without letter case. GitHub repository
  names are case-insensitive. Keep the configured name for display.
- Reuse the settings help-text pattern with the existing Switch. Show the
  saved choice as a Trust detail for members and suspended orgs. Keep the
  longer explanation in the public guide. This matches the existing settings.
- Hide the switch for an invalid or absent draft source. Keep Save repository
  as the button label for the paired draft. The valid source owns the policy.
- Describe the existing ways a cloud computer stops. Do not imply a manual
  Stop action. Restart does not supply refreshed settings. This corrects
  wording and keeps the approved start-or-resume boundary.
- Use a guarded source-change trigger to clear stale trust for older
  repository writers. Reason: returning from a replacement to an earlier
  source must not revive its previous grant.

Additional UI design calls, made by the working agent on 2026-11-18:

- Keep the repository and trust in the whole-value mode of the existing
  saved draft hook. Reason: the two values must follow a saved reply together.
- Turn draft trust off on every text edit, including an edit of the same
  identity. Reason: each grant follows the latest explicit edit.
- Keep the switch usable while Save waits, as the field is. Reason: the
  approved draft keeps edits made during Save.
- Keep the existing lookup after every repository Save, including a
  trust-only Save. Reason: one saved-settings path owns the list refresh.
- Reuse the shared mockup copy and CSS with the existing UI controls and
  external link. Reason: the product needs live callbacks without a second
  set of words or styles.
- Build the exact named grant in the model from the paired choice. Reason:
  the caller then supplies no independent grant for another source.
- Add development fixtures for trusted settings and one failed Save.
  Reason: the browser smoke needs these states through the existing dev API.

## Replaced ways

The unreleased helper `skillsDirectory` option becomes the optional
org-skills value in Milestone 4. No stored helper request uses this option.
Every consumer moves in that milestone. Delete the directory-only field
and add no converter.

- Boundary owner: `crates/cnd-runner-interface/src/sdk_helper_options.rs`.
  Regenerate `runner/sdk-helper/src/generated/HelperOptions.ts` and new types.
- Producer and reader: `crates/cnd-runner/src/engine/provider.rs` and
  `runner/sdk-helper/src/read-request.ts`.
- Provider consumers: `skills.ts`, `skill-folders.ts`, `skill-view.ts`, and
  `claude.ts` under `runner/sdk-helper/src/providers/`.
- Test consumers: `crates/cnd-runner/tests/engine/skills_tests.rs`,
  `runner/sdk-helper/src/providers/skills.test.ts`, and
  `runner/sdk-helper/test-support/skill-providers.ts`. Keep their assertions.
- Documentation consumer: the org skills section of `runner/README.md`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Show the choice and its explanation in the existing Skills section.

- [x] Check `@firna/ui` and existing controls before choosing a component.
- [x] Update the Skills section, its shared copy, and catalogue fixtures
      for trust off, trust on, repository replacement, and an unsaved choice.
- [x] Include member, suspended-org, empty-repository, and narrow-screen views.
- [x] Use the shared settings help pattern and the planned public-guide link.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update this design and its TODOs for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the approved behavior before implementation starts.

- [x] Update the org skills contract with trust, permissions, defaults,
      reset rules, timing, session-wide effects, and older-runner limits.
- [x] Split the org skills protocol into linked pages because it exceeds
      the documentation length target. Preserve all existing requirements.
      Update live references and anchors.
- [x] Read both legal pages and every public guide in full. Update each
      sentence that restates a changed fact.
- [x] Explain the choice in the Cloud computer guide. Make the UI help
      link resolve to that explanation.
- [x] Update runner and helper READMEs with the policy boundary and
      configuration entry points. Check changed relative links and anchors.

## Milestone 3: Settings storage and startup environment

Depends on: 2

Store the repository-bound choice and supply it at cloud-computer start.

- [x] Add the trusted-name migration, settings types, readers, update handling, and
      concurrency predicates. Cover defaults and old-client requests.
- [x] Keep grants paired with an explicit repository. Clear trust on
      removal and unconfirmed replacement. Preserve it on unrelated saves.
- [x] Cover a mismatched named grant during a save retry. Return untrusted
      saved state without introducing a rejection.
- [x] Enforce existing admin and active-org permissions. Members only read.
- [x] Pass the reserved policy through lifecycle settings and startup
      environment construction. Prevent an org env var from replacing it.
- [x] Extend the development API and both app settings readers.
- [x] Update the shared Terms consent revision for the changed legal text
      and its 18 November 2026 effective date. Preserve the consent flow.
- [x] Test round trips, permission failures, repository replacement,
      concurrent saves, old requests, and environment precedence through
      the existing settings and lifecycle tests.

Evidence: `.context/org-skills-repository-trust/implementation/backend/report.md`.

## Milestone 4: Runner and Claude enforcement

Depends on: 3

Apply the selected policy when each helper starts.

- [x] Extend Rust configuration with both repository identities. Replace
      the directory-only helper field with the optional org-skills value.
      Regenerate and commit boundary types with the existing generator.
- [x] Move every consumer listed under Replaced ways. Delete the old field
      without a converter. Keep old released requests without org skills working.
- [x] Apply the native restriction for untrusted Claude starts independently
      of copy completion or selected skills. Merge existing flag settings.
      Omit the restriction for the other states.
- [x] Preserve trusted Claude body syntax. Keep untrusted and Codex filters.
- [x] Confirm that repository commands and settings cannot enter discovery
      through the exported view. Keep the discovery root limited to skills.
- [x] Extend existing provider tests to inspect query settings and exported
      skill content for all three states and old helper requests.
- [x] Keep existing metadata, alias, precedence, link, and cleanup assertions.
      Use product-boundary tests. Add no test of Claude's private parser.

Evidence: `.context/org-skills-repository-trust/implementation/runner/report.md`.

## Milestone 5: Product settings UI

Tags: ui

Depends on: 4

Implement the approved mockups with the real saved setting.

- [x] Add the control and help text to the admin Skills section. Wire the
      shared repository-and-trust draft, Save state, and error recovery.
- [x] Clear draft trust when the source changes. Submit the exact source
      with each grant. Keep the skills lookup tied to the saved source.
- [x] Show the saved choice and explanation in member and suspended views.
- [x] Update the settings model, parser, development fixtures, and existing
      settings interaction tests with the real field.
- [x] Smoke-test saving each choice, replacing and removing the source,
      failed Save recovery, keyboard use, and the guide link.

Evidence: `.context/org-skills-repository-trust/implementation/ui/report.md`.
Native keyboard input blocked part of the browser smoke.

## Milestone 6: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5

Verify the whole path and finish the existing pull request.

Native policy smoke evidence: `.context/org-skills-repository-trust/implementation/native-smoke/result.json`.

- [x] Run early static checks and the targeted settings, lifecycle,
      runner, and SDK-helper tests. Run new asynchronous tests ten times.
- [x] Run the complete npm gate and all required Rust checks and release
      build from `AGENTS.md`. Check that generated types match Rust.
- [x] Verify the Claude choice in a bounded native smoke test if the
      installed environment supports it. Report any blocker explicitly.
- [x] Delete `plans/follow-ups/claude-skill-inline-shell-setting.md` only
      after the chosen behavior and its documentation are implemented.
- [x] Delete `plans/follow-ups/skills-software-update-docs.md` after
      verifying both software-delivery corrections and the public guide.
- [ ] Commit with Conventional Commits and push. Watch CI to its end.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Check new findings.
      Apply the fix rule and the existing two-round limit. Record later
      work as follow-up items. Do not start an unsolicited third fix round.
- [ ] Delete this plan after its other milestone TODOs and review are done.
- [ ] Update the existing PR #426 with the final behavior, dated decisions,
      design calls, a plan permalink, follow-up items, and check results.

## Planning evidence

The independent options check and planning notes live under
`.context/org-skills-repository-trust/`. No product behavior changes when
this plan is committed.
