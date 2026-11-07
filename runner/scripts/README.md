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
- With `CONDUCTING_MEASURE_MODE=agent`, `measure.mjs` sends one prompt to
  a real agent. It prints the time from its own start to the first agent
  text. Run it once after each real resume.
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
| `CONDUCTING_MEASURE_AGENT`      | `claude` or `codex`                   |
| `CONDUCTING_MEASURE_MODEL`      | The model of the prompt               |
| `CONDUCTING_MEASURE_LOGIN`      | A real login for that agent           |
| `CONDUCTING_MEASURE_LOGIN_KIND` | `token` or `api-key`, for Claude only |
| `CONDUCTING_MEASURE_PLACEMENT`  | `home` or `system`                    |
| `CONDUCTING_MEASURE_RESUME_ID`  | A label of the real resume            |
| `CONDUCTING_COMPUTER_MCP_URL`   | The URL of the `computer` MCP server  |

`CONDUCTING_REPOSITORY` and `CONDUCTING_HOME` are optional. Their
defaults are the current folder and the home folder of the user.
