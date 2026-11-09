# First-start measurements

This guide belongs to the [agent runner](../README.md). The
[runner commands](../README.md#commands) build the tools that it describes.

Two tools measure the time of the first agent start after a resume. The
install script copies both into the install folder. The install folder is
an argument of the install script, so a measurement can use a folder
inside or outside the home folder.

- `measure.mjs` reads the `claude` program once and prints one JSON line.
  By default, it starts no agent, and the line says that it measured no
  resume.
- With `CONDUCTIVE_MEASURE_MODE=agent`, `measure.mjs` sends one prompt to
  a real agent. It prints the time from its own start to the first agent
  text. Run it once after each real resume.
- The agent mode starts one agent adapter directly, not a session of the
  runner. The agent gets empty agent instructions, and the tool saves no
  session state. So the time leaves out the build of the instructions, the
  model's work on their text, and their save in the state file. Do not read
  it as the full start time of the runner.
- Each agent sample has a placement. `home` is an install folder inside
  the home folder. `system` is an install folder outside it.
- `compare.mjs <file>...` reads the JSON lines of the agent samples. It
  gives the median time of each placement. It names the faster placement
  only when each placement has samples from three or more resumes.
- Local runs cannot choose a placement. Only samples from real resumes,
  with a real login, can.

The agent mode needs these variables:

| Variable                        | Value                                 |
| ------------------------------- | ------------------------------------- |
| `CONDUCTIVE_MEASURE_AGENT`      | `claude` or `codex`                   |
| `CONDUCTIVE_MEASURE_MODEL`      | The model of the prompt               |
| `CONDUCTIVE_MEASURE_LOGIN`      | A real login for that agent           |
| `CONDUCTIVE_MEASURE_LOGIN_KIND` | `token` or `api-key`, for Claude only |
| `CONDUCTIVE_MEASURE_PLACEMENT`  | `home` or `system`                    |
| `CONDUCTIVE_MEASURE_RESUME_ID`  | A label of the real resume            |

`CONDUCTIVE_REPOSITORY` and `CONDUCTIVE_HOME` are optional. Their
defaults are the current folder and the home folder of the user.
