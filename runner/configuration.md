# Runner configuration

The [agent runner](README.md) reads these variables when the service starts.

| Variable                             | Required | Value                                                                 |
| ------------------------------------ | -------- | --------------------------------------------------------------------- |
| `CONDUCTIVE_WORKSPACE_ID`            | Yes      | The workspace ID. The runner sends it in `hello`.                     |
| `CONDUCTIVE_WORKSPACE_LINK`          | No       | The canonical workspace link. |
| `CONDUCTIVE_WORKSPACE_DEPTH`         | No       | Its depth as an unsigned decimal number. Top-level workspaces have depth `0`. |
| `CONDUCTIVE_WORKSPACE_MAX_DEPTH`     | No       | The deepest permitted depth, supplied by the Worker. |
| `CONDUCTIVE_PARENT_WORKSPACE_ID`     | No       | The direct parent's ID, for a sub-workspace only. |
| `CONDUCTIVE_PARENT_WORKSPACE_LINK`   | No       | The direct parent's canonical link, for a sub-workspace only. |
| `CONDUCTIVE_WORKSPACE_TOKEN`         | Yes      | The workspace token. The runner sends it as a bearer token.           |
| `CONDUCTIVE_RUNNER_URL`              | Yes      | The `https:` or `wss:` URL of the runner route.                       |
| `CONDUCTIVE_REPOSITORY`              | Yes      | The folder of the workspace repository.                               |
| `CONDUCTIVE_REPOSITORY_<FOLDER>_DIR` | No       | The folder of each repository of the image, with one variable each.   |
| `CONDUCTIVE_DEFAULT_BRANCH`          | Yes      | The workspace base branch, as a name that Git resolves in that folder.       |
| `CONDUCTIVE_WORKSPACE_BRANCH`        | No       | The workspace branch that the app tracks, from the Worker's record.   |
| `CONDUCTIVE_SKILLS_REPOSITORY`       | No       | One public GitHub skills repository as `owner/name`, or empty.         |
| `CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY` | No     | The skills repository that the org trusts, as `owner/name`, or empty.  |
| `CONDUCTIVE_HOME`                    | No       | The home folder of the agents. The default is the home of the user.   |
| `CONDUCTIVE_STATE_PATH`              | No       | The state file. The default is `.conductive/runner-state.json` there. |

- The runner route is the path `MACHINE_PATHS.runner`, which is
  `/v1/runner`, from [`agent-tools.ts`](../src/shared/agent-tools.ts) on
  the hostname for machines, `api.conductive.build`.
- No variable configures the computer tools. The runner reads the entry
  that Boat writes, as [Computer tools](agent-tools.md#computer-tools) says.
- `CONDUCTIVE_REPOSITORY_<FOLDER>_DIR` gives the folder of each repository
  of the image, as
  [Folder variables](../docs/protocol/repository-folders.md#folder-variables)
  says. The runner reads each such variable that has a value, and makes its
  folder absolute. `CONDUCTIVE_REPOSITORY_DIR` has no folder part, so it is
  not one of them. The start script maps it to `CONDUCTIVE_REPOSITORY`, as
  [Start in a workspace](../image/README.md#start-in-a-workspace) says.
- `CONDUCTIVE_DEFAULT_BRANCH` names the base branch of the workspace at the
  start of the runner. It is the base of the file marks, the Changes list,
  and the changed files of each turn. Each diff request names its own base
  branch. The `gh-merge-base` Git setting of the current branch comes
  first, and these names apply only without it, as
  [The comparison base](file-reports.md#the-comparison-base) says.
  Changes, file marks, and diffs use the merge base of that base branch
  with `HEAD`. Resolution prefers `refs/remotes/origin/<base branch>` when
  that ref exists. File reports compare that merge base, the Git ID of each
  file, and a streamed hash of the bytes that a read returns. That hash
  uses the same path checks as a read, and a fixed value for a refused or
  missing target. So an edit, a link into an ignored folder, or a clean
  filter cannot hide a change from the open files and diffs. The agent
  instructions also name it as the target branch.
- `CONDUCTIVE_WORKSPACE_BRANCH` is the workspace branch that the
  [agent instructions](../docs/protocol/agent-instructions.md#the-branches)
  name. The runner does not take it from the current Git branch of the
  repository folder, because that branch can change. When the variable is
  missing or empty, the runner starts and writes this warning to standard
  error:
  `The workspace branch is unavailable. Agent instructions will omit it.`
  The agent instructions then name no workspace branch.
- The agent instructions name the folder of `CONDUCTIVE_REPOSITORY`, each
  folder variable with its folder in name order, and the two branches. A
  saved session keeps its saved text. So a changed value reaches only new
  sessions, as [What it does](README.md#what-it-does) says.
- The workspace link, depth, and deepest depth form one optional tree
  context. A sub-workspace must also supply both parent variables.
  Links must be absolute HTTP or HTTPS URLs. Depths must be unsigned
  decimal integers, and the deepest depth must be positive.
  The workspace depth must not exceed it. A top-level workspace has no
  parent variables. IDs must be nonblank and contain no white space or
  control characters. A workspace cannot name itself as its parent.
  Missing or malformed context keeps the runner working and produces
  one warning:
  `The workspace tree context is unavailable. Agent instructions will omit it.`
  Its instructions then omit all tree facts and nesting guidance.
- The home folder also holds `.conductive/claude` and `.conductive/codex`,
  where the agents keep their sessions. Boat keeps the disk across a stop
  and a resume, so the sessions stay.
- The state file belongs to one workspace. Keep it out of the org image.
- `CONDUCTIVE_SKILLS_REPOSITORY` selects the public copy under
  `.conductive/skills/` in that home. The Worker sets it at each start,
  including a resume. An empty value removes the copy. A changed name
  removes the previous repository before the new copy starts. Invalid
  names warn and load no org skills. The runner never uses a GitHub token
  for this copy. A repository with no commits gives no skills. Its empty
  state warns once until the state changes.
  [The copy](../docs/protocol/org-skills-copy.md#the-copy) gives its
  background timing and failure behavior.
- `CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY` names the skills repository that
  an admin trusts. The Worker sets it at each start, including a resume.
  The runner trusts the repository of `CONDUCTIVE_SKILLS_REPOSITORY` only
  when this value is a valid name that matches it without regard to letter
  case. A missing, invalid, or different value means untrusted. A valid
  `CONDUCTIVE_SKILLS_REPOSITORY` sets the trust policy of each agent start,
  also before its first copy ends. An empty or invalid repository sets no
  policy. [Repository trust](../docs/protocol/org-skills-trust.md) states
  the policy. A changed value reaches the runner only at the next start or
  resume of the cloud computer, because the Worker supplies these
  variables only then. Restart and a release update keep the values of
  that start.
- After a failed or dropped connection, the runner connects again in 1 second.

When a required variable is missing or the state file cannot be read,
the runner exits with code 1. It writes this line to standard error:

```text
The runner could not start. Check its configuration and saved state.
```
