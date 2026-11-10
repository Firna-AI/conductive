// Runs ESLint over the repository in one process for each group of
// TypeScript projects, then in one process for every other file. The
// promise rules of `eslint.config.js` keep the program of each project in
// memory, so one process for all files runs out of the default Node heap.
// Arguments, such as `--fix`, go to each run.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const GROUPS = [['src'], ['worker', 'tools/*.ts'], ['desktop', 'docs/mockups']]

const root = fileURLToPath(new URL('..', import.meta.url))
const eslint = fileURLToPath(
  new URL('../node_modules/eslint/bin/eslint.js', import.meta.url),
)
const options = process.argv.slice(2)
const others = GROUPS.flat().flatMap((path) => [
  '--ignore-pattern',
  path.includes('*') ? path : `${path}/**`,
])

let failed = false
for (const paths of [...GROUPS, ['.', ...others]]) {
  const run = spawnSync(process.execPath, [eslint, ...options, ...paths], {
    cwd: root,
    stdio: 'inherit',
  })
  if (run.status !== 0) failed = true
}
process.exitCode = failed ? 1 : 0
