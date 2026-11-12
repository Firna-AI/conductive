# Runner development

## Commands

Run these commands from the repository root, with Node 24 from `.nvmrc`.

| Command                                  | What it does                                                 |
| ---------------------------------------- | ------------------------------------------------------------ |
| `npm ci --prefix runner`                  | Install the runner packages into `runner/node_modules`        |
| `npm --prefix runner run build`           | Bundle the runner, relay, and two measurement tools           |
| `npm --prefix runner run typecheck`       | Check the runner, its fakes, and the shared contracts it uses  |
| `npm --prefix runner test`                | Run the runner tests with Vitest                             |
| `npm --prefix runner test -- src/relay`    | Run the relay tests against local servers                     |
| `npm --prefix runner start`               | Run the runner bundle with the variables of the current shell |
| `node dist/runner/relay.mjs`               | Run the relay bundle                                         |

The build writes `runner.mjs`, `relay.mjs`, `measure.mjs`, and `compare.mjs`
into `dist/runner/`. The runner and measurement bundles load npm packages
at run time. The build links `dist/runner/node_modules` to
`runner/node_modules`, so that the bundles find them.

The complete gate, the root `npm run check`, runs the runner typecheck and
the runner tests. Run `npm ci --prefix runner` once before the gate, as CI
does. The root lint, format, and file-length checks also cover the runner
files.

