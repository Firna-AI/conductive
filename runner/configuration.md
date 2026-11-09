# Runner configuration

The [agent runner](README.md) reads these variables when the service starts.

| Variable                      | Required | Value                                                                 |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| `CONDUCTIVE_WORKSPACE_ID`     | Yes      | The workspace ID. The runner sends it in `hello`.                     |
| `CONDUCTIVE_WORKSPACE_TOKEN`  | Yes      | The workspace token. The runner sends it as a bearer token.           |
| `CONDUCTIVE_RUNNER_URL`       | Yes      | The `https:` or `wss:` URL of the runner route.                       |
| `CONDUCTIVE_REPOSITORY`       | Yes      | The folder of the workspace repository.                               |
| `CONDUCTIVE_DEFAULT_BRANCH`   | Yes      | The default branch, as a name that Git resolves in that folder.       |
| `CONDUCTIVE_HOME`             | No       | The home folder of the agents. The default is the home of the user.   |
| `CONDUCTIVE_STATE_PATH`       | No       | The state file. The default is `.conductive/runner-state.json` there. |

- The runner route is the path `MACHINE_PATHS.runner`, which is
  `/v1/runner`, from [`agent-tools.ts`](../src/shared/agent-tools.ts) on
  the hostname for machines, `api.conductive.build`.
- No variable configures the computer tools. The runner reads the entry
  that Boat writes, as [Computer tools](agent-tools.md#computer-tools) says.
- `CONDUCTIVE_DEFAULT_BRANCH` is the base of the file marks, the Changes
  list, and the changed files of each turn. Each diff request names its own
  base branch. File reports compare the commit of that branch, the Git ID
  of each file, and a streamed hash of the bytes that a read returns. That
  hash uses the same path checks as a read, and a fixed value for a refused
  or missing target. So an edit, a link into an ignored folder, or a clean
  filter cannot hide a change from the open files and diffs.
- The home folder also holds `.conductive/claude` and `.conductive/codex`,
  where the agents keep their sessions. Boat keeps the disk across a stop
  and a resume, so the sessions stay.
- The state file belongs to one workspace. Keep it out of the org image.
- After a failed or dropped connection, the runner connects again in 1 second.

When a required variable is missing or the state file cannot be read,
the runner exits with code 1. It writes this line to standard error:

```text
The runner could not start. Check its configuration and saved state.
```
