# Developer scripts

These scripts of the [sandbox software](README.md) run on a developer
machine. No image build installs them.

- `package-runner.mjs` packages the runner archive.
- `live-check.mjs` checks the chat path in a real sandbox. Then it times
  the first agent start after a resume.

Run each command from the repository root, with Node 24. Both scripts use
the packages of the [agent runner](../runner/README.md). So run
`npm ci --prefix runner` first.

## Package the archive

Run the packager on Linux x64, with GNU tar and gzip. Install the runner
packages on that host, so that their platform files match it.

```sh
node image/package-runner.mjs \
  --node /absolute/path/to/node24/bin/node \
  --url https://artifacts.example.com/runner-v1.tar.gz \
  --output .context/runner-artifact/runner.tar.gz
```

- `--node` is the absolute path of a Linux x64 Node 24 program. The script
  copies it into the archive. It downloads no Node.
- `--url` is the public HTTPS URL of the archive after you publish it. It
  can hold no user name, password, query, or fragment.
- `--output` is optional, and it must be under `.context/`. The default is
  `.context/runner-artifact/runner.tar.gz`.

The script builds the runner bundles. The archive then holds
`node/bin/node` and a `runner/` folder. That folder holds `main.mjs`,
`measure.mjs`, `compare.mjs`, the runner manifest and lockfile, and the
production packages from `runner/node_modules`. The script fixes the
order, the times, and the owners of the archive entries. So the same
source, Node program, and installed packages give the same digest.

The script writes the archive and two files next to it:

- `<archive>.sha256`: the digest, in the format of `sha256sum`.
- `<archive>.json`: the `url` and `sha256` value of the `software` option.

Then supply the archive, as
[The runner archive](README.md#the-runner-archive) says.

## Live check

`live-check.mjs` bundles the TypeScript check into
`.context/chat-live-check/cli.mjs`, with the esbuild of the runner
packages. Then it runs that file.

```sh
npm --prefix runner run build
node image/live-check.mjs --help
node image/live-check.mjs --prepare
node image/live-check.mjs
```

- `--help` lists the variables.
- `--prepare` checks that esbuild can bundle the check, and that the runner
  bundles are in `dist/runner/`. It uses no app, no sandbox, and no agent.
- Without an option, the script runs the real check. It reads its inputs
  and its secrets from the environment. Put no secret in a saved command
  or file.

### What a real check needs

- An externally reachable test Worker, with its app and machine origins.
  Each sandbox must reach the machine origin.
- A signed-in test account with a stored agent login for `LIVE_AGENT`.
- An org with a Boat key and a good org image. A build with an archive from
  `package-runner.mjs` must make that image.
- A repository of that org that the image holds.

The Worker cannot meet these needs yet:

- It routes no lifecycle route, no image build, and no agent login write.
  The [Worker README](../worker/README.md#routes) lists the missing routes.
- Chat and the lifecycle are not connected yet, as the
  [chat backend integration](../worker/chat/integration/README.md) says.
- The runner fails at its start in a workspace sandbox. No code supplies
  its default branch or its `computer` MCP URL, as
  [Start in a workspace](README.md#start-in-a-workspace) says.

So a real run fails at its first app request until these parts exist.

### Variables

These variables are required:

| Variable | Value |
| --- | --- |
| `LIVE_APP_ORIGIN` | The app origin of the test Worker. |
| `LIVE_MACHINE_ORIGIN` | The `MACHINE_ORIGIN` of the test Worker. Each sandbox must reach it. The runner URL that the check makes from the saved machine origin of the sandbox must match it. |
| `LIVE_COOKIE` | The full `Cookie` header of a signed-in session of the test account. |
| `LIVE_ORG_ID` | The app ID of the org. |
| `LIVE_REPOSITORY_ID` | The app ID of a repository that the org image holds. |
| `LIVE_BOAT_KEY` | A Boat key of the Boat account that runs the sandboxes of the org. |
| `LIVE_BOAT_ORG` | `personal`, or the ID of the Boat org that the app saved with the key of the org. |
| `LIVE_AGENT` | `claude` or `codex`. |
| `LIVE_MODEL` | A model of that agent. |
| `LIVE_AGENT_LOGIN` | A login of that agent, only for the measurement forks. The app uses the login that it stored for the account. |
| `LIVE_COMPUTER_MCP_URL` | The URL of the `computer` MCP server, as each fork reaches it. |

These variables are optional:

| Variable | Value |
| --- | --- |
| `LIVE_AGENT_LOGIN_KIND` | `api-key`, the default, or `token` for Claude. |
| `LIVE_RUNS` | The number of resumes of each placement. The default and the minimum are 3. |
| `LIVE_OUTPUT` | The output folder. It must be under `.context/`. The default is `.context/chat-live-check/run-<time>`, with the start time in milliseconds. |
| `LIVE_SOFTWARE_DIR` | The software folder in the sandbox. The default is `/opt/conductive/software`. |
| `LIVE_BOAT_API` | The Boat API. The default is `https://boat.dev/api/v1`. Only an HTTP endpoint on `localhost`, `127.0.0.1`, or `[::1]` can replace it. |

Both origins must have no path, query, fragment, or credentials. Each
origin must use HTTPS, or HTTP on `localhost`, `127.0.0.1`, or `[::1]`. The
script does not check that an app on such a local origin is a fake.

### Steps

Each wait for a state or an answer stops after 10 minutes.

1. It creates a workspace through the app. The first message holds a
   random code. Then it opens the events socket of the workspace.
2. It waits for the answer. Then it sends a second message in the same
   session.
3. It stops the sandbox through Boat, and waits until the app shows the
   workspace as stopped. Then it resumes the workspace through the app.
4. It sends a third message. The answer must still hold the code.
5. It reads `CONDUCTIVE_MACHINE_ORIGIN` from the saved variables of the
   sandbox. It makes the runner URL from that origin and
   `MACHINE_PATHS.runner`, as the start script does. It ignores a saved
   `CONDUCTIVE_RUNNER_URL`. That URL must match `LIVE_MACHINE_ORIGIN` with
   the same path.
6. It forks the sandbox twice. The forks get none of its env, so their
   runner service starts nothing.
7. It copies the software into a new folder of each fork: inside the home
   folder in one, and under `/opt` in the other.
8. It stops and resumes each fork `LIVE_RUNS` times. After each resume,
   the `measure.mjs` of the copy times the first agent text.
9. `dist/runner/compare.mjs` compares the two placements.
10. It deletes the forks and stops the sandbox of the workspace. The
    workspace stays in the org.

The events must have consecutive numbers, with no gap and no duplicate.
Each answer must stream text, and its turn must finish. The
[first-start measurement guide](../runner/scripts/README.md) describes
`measure.mjs` and `compare.mjs`.

### Output and secrets

The check writes these files to its output folder, and prints the folder:

- `summary.json`: whether the Boat API was real, the results, the IDs, and
  the error of a failed run. `cleanupNeeded` lists each sandbox that the
  check could not delete or stop. `workspaceCleanupNeeded` names a
  workspace whose sandbox the check did not find.
- `home.jsonl` and `system.jsonl`: one timing sample for each resume.
- `comparison.json`: the median of each placement, and the faster one.

More facts:

- `comparison.json` names a faster placement only after three resumes of
  each placement. The check does not move the installed runner.
- When `LIVE_BOAT_API` replaces Boat, `summary.json` says
  `local-fake-endpoints`. Such a run does not prove a real sandbox.
- The check writes no Boat key, cookie, login, response body, or agent
  answer to its output or its files.
- Each fork gets `LIVE_AGENT_LOGIN` in its resume env. So clean up each
  sandbox that `cleanupNeeded` lists at once.

## Development

- `npm run typecheck` does not check these TypeScript files. Check them
  with `npx tsc -p image/tsconfig.json`.
- The lint, format, and file-length checks of `npm run check` include these
  files.
- No test runs these scripts.

## Key code

- [`package-runner.mjs`](package-runner.mjs): packages the archive, and
  writes its digest and its `software` value.
- [`live-check.mjs`](live-check.mjs): bundles the check and runs it.
- [`live-main.ts`](live-main.ts): runs the steps, writes `summary.json`,
  and cleans up the sandboxes.
- [`live-input.ts`](live-input.ts): reads and checks the variables.
- [`live-app.ts`](live-app.ts) and [`live-stream.ts`](live-stream.ts): the
  app requests of the chat steps, and the checks of the event stream.
- [`live-boat.ts`](live-boat.ts): the fixed Boat requests, pinned to
  `LIVE_BOAT_ORG`.
- [`live-measure.ts`](live-measure.ts): the forks, the timed resumes, and
  the comparison.
