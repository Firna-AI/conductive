# SDK helper

The SDK helper runs Conductive's agents powered by Claude and Codex.
It is a Node 24 package below the [agent runner](../README.md).
The runner starts one helper child for each agent start.
The helper owns the SDK, agent process, and temporary credential cleanup.

## Interface

The runner writes JSON lines to stdin. The helper writes JSON lines to stdout.
The helper also reads the JSON-RPC lines that the Codex App Server writes to its stdout.
Each of these readers ends a line only at LF.
A JSON string can hold U+2028 and U+2029 raw, and `node:readline` also ends a line at them.
Rust defines these messages in [cnd-runner-interface](../../crates/cnd-runner-interface/README.md).
Its export command writes their TypeScript into `src/generated/`.
Import each generated type directly. Never edit generated files.

Requests start an agent, send input, change model, interrupt, close, warm the
Claude binary, scan skills, or read a skill. A scanner helper stays separate from agent
helpers. It returns metadata and private skill paths. Rust filters and
bounds that data before it saves a workspace report. Each agent send can
carry the latest private Codex skill paths.
Request IDs match response or error messages.
Agent events stream while a request waits. Result message lists retain their exact IDs and order.
Background note updates carry the work IDs that the active turn already named.

A `skill.read` request takes a private scanned path or a leased org copy.
The helper selects the named org skill in that copy and gives the safe
view for the selected agent. The byte limit is at most 1 MiB.

Close cancels pending setup. It sends SIGTERM to each agent process.
After five seconds, a process that still runs gets SIGKILL.
The close response follows agent exit and temporary credential cleanup.
The runner then waits for helper exit. Stdin EOF and termination signals use the same cleanup path.

The helper writes no state file and logs no request bytes.
Agent events reach the runner's output filter before event storage or transmission.
That filter keeps tokens and partial text across helper starts.
Malformed or incomplete lines close the transport without reporting their contents.

The [behavior guide](../behavior.md), [login guide](../agent-logins.md), [Codex guide](../codex-logins.md),
[agent tools guide](../agent-tools.md), and [background work guide](../background-work.md)
give the adapter behavior and its limits. The behavior guide gives the continue message after a dropped answer.

Both adapters use the shared read line and file descriptions in
`src/providers/attachment-description.ts`. That helper also owns the
image input size limit. Codex uses the same image list for its image
inputs and the image sentence after the read line.
[What the agent gets](../../docs/protocol/attachment-transfers.md#what-the-agent-gets)
states the read line and the size rule.

## Org skills

Both adapters load org skills from a temporary view in
`~/.conductive/skill-sessions/turn-*/`. They do not load the raw snapshot.
The runner closes snapshot links before publication and keeps the source
snapshot until the helper closes. The view maps each support link to its
target inside the view. It walks physical directories, so a link to an
ancestor cannot cause a loop. It sanitizes every `SKILL.md`, including
nested files and linked instruction files. Close removes the view. The
runner's startup sweep removes views left by a killed helper.
View cleanup waits for Claude's discovery links as well as the exported files.

The frontmatter allowlist keeps `name`, `description`, `argument-hint`,
`arguments`, `disable-model-invocation`, `user-invocable`, `when_to_use`,
`version`, `license`, `compatibility`, and `metadata.short-description`.
These fields describe a skill or control its invocation. All execution,
tool-grant, model-setting, and unknown fields are omitted. Shell markers
in the body become ordinary inline or fenced code, except in Claude's view
of a trusted repository. This includes markers
before argument placeholders, which Claude expands after export. Scripts
and other support files remain available for an agent to choose to read or run.

The optional `HelperOptions.orgSkills` value of each start sets the trust policy.
Its `OrgSkills` fields are `repository`, `trustedRepository`, and `directory`.
The trusted name and directory can be absent.
Without the value, neither adapter loads org skills, and Claude keeps the
settings of the workspace. When its trusted repository does not match its
configured repository, the repository is untrusted. The Claude adapter
then sets `disableSkillShellExecution: true` in the SDK flag settings.
Those settings also carry effort and fast mode. Later model, effort, and
fast mode changes keep the restriction, and project settings cannot turn
it off. The restriction applies also before the first copy ends and when
no skill folder is selected. When both names match without regard to
letter case, the repository is trusted. Claude's view then keeps the
original inline shell syntax of each body, and the adapter omits the
setting. Omitting it keeps each restriction that Claude settings or a
managed policy supply. The Codex view filters shell markers for either
policy. Claude's additional directory holds only `.claude/skills` links
to the selected skill folders, so trust loads no separate custom slash
command, setting, hook, or agent of the repository.

Codex also reads `agents/openai.yaml`. The view keeps only its descriptive
`interface` fields (`display_name`, `short_description`, `icon_small`,
`icon_large`, `brand_color`, `default_prompt`) and
`policy.allow_implicit_invocation`. It omits MCP dependencies, install and
execution fields, and unknown fields. This also applies through support
links. Per-process settings disable each nested Codex skill.

One YAML reader follows each pinned agent's parsing and repair rules for
both workspace and org names. Workspace skills take precedence. Claude
keeps an org folder name as its discovery alias only if all its
characters are ASCII letters, digits, `.`, `_`, or `-`.
Other org folders get generated aliases that no workspace skill uses.
Their displayed names stay in the filtered
frontmatter. Workspace precedence uses these aliases and displayed names.
Codex uses the folder only as a fallback when the parsed name is empty.
It requires a description and limits names to 64 characters.
After shared folder selection, the first org skill in
path order with a given agent-shown name wins. Unusable names and duplicate
names produce warnings. Workspace skill files are unchanged.
[Org skills](../../docs/protocol/org-skills.md#what-loads) gives the loading
requirements, and
[Repository trust](../../docs/protocol/org-skills-trust.md#what-claude-and-codex-get)
gives the requirements of each trust policy.

The skills scanner lists the same org skills. Each `skills` request can
carry the `orgSkills` value with the leased current copy. The scanner makes
the choice of an agent start, reads each chosen `SKILL.md` of the copy, and
takes the name and the description from its safe view. It adds these skills
after the skills of each agent's own folders. A failed read also fails an
agent start, so the lists then hold no org skills, and the scanner warns. Each listed path is the `SKILL.md` of the copy. A
Codex start gives an org skill of a message the path of the skill in its
own view, by name, and leaves out an org skill that its view lacks.

## Development

Run from the repository root with Node 24:

```sh
npm ci --prefix runner/sdk-helper
npm --prefix runner/sdk-helper run typecheck
npm --prefix runner/sdk-helper test
npm --prefix runner/sdk-helper run build
cargo run -p cnd-runner-interface --example export_bindings
```

The build writes `sdk-helper.mjs`, `measure.mjs`, and `compare.mjs` into `dist/sdk-helper/`.
A local package link lets each bundle find the SDK packages.
The parent install command installs the helper. Root `runner:typecheck` and
`runner:test` scripts check only this package.
The root lint and format commands cover both packages.
Session tests call the shipped `HelperSession` with fake providers.
They control setup, process exit, and credential cleanup with explicit signals.

The [measurement guide](scripts/README.md) describes the first-start tools.
They start adapters directly with developer credentials. They do not measure the runner or the gateway.

## Release

`node runner/sdk-helper/scripts/package.mjs OUTPUT` builds a Linux x64 archive.
It prints the SHA-256 digest and writes `sdk-helper-<sha256>.tar.gz` into `OUTPUT`.
The archive holds the helper and measurement bundles, npm runtime packages, and their pinned agent programs.
The deploy publishes it as the `sdk-helper` release part.
The separate `node` part supplies Node.

The runner selects the helper from its pinned release folder at startup.
Development builds select `dist/sdk-helper/sdk-helper.mjs`.
The Rust runner drives the helper directly. The release contains no separate runner archive.

## Key code

- [main.ts](src/main.ts) connects private stdin and stdout and handles process shutdown.
- [session.ts](src/session.ts) orders requests and cancels agent setup.
- [json-lines.ts](src/json-lines.ts) frames complete UTF-8 JSON lines.
- [text-lines.ts](src/text-lines.ts) splits UTF-8 input into lines at LF only, for both JSON-line readers.
- [process.ts](src/providers/process.ts) starts the Codex App Server and reads its output lines.
- [read-request.ts](src/read-request.ts) and [read-output.ts](src/read-output.ts) validate boundary data.
- [claude.ts](src/providers/claude.ts) and [codex.ts](src/providers/codex.ts) start the two adapters.
- [skills.ts](src/skills.ts) caches skill discovery from Claude folders and the Codex app server or fallback folders.
- [skill-org.ts](src/skill-org.ts) lists the org skills of the copy for each agent.
- [skill-input.ts](src/providers/skill-input.ts) selects explicit Codex skill input from each message and maps org skills to the view of the start.
- [lifetime.ts](src/providers/lifetime.ts) waits for agent exit and removes credentials.
- [skill-view.ts](src/providers/skill-view.ts) exports and removes the safe org skills view.
- [skill-metadata.ts](src/providers/skill-metadata.ts) reads names and limits exported metadata.
- [test-support](test-support/) holds the fake SDK query, App Server, and provider fixtures.
- [Rust driver](../../crates/cnd-runner/src/helper/driver.rs) drives helper processes.
