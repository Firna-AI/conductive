import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const desktop = resolve(import.meta.dirname, '..')
const runner = resolve(desktop, 'node_modules/.bin/playwright')
const linux = process.platform === 'linux'
const result = spawnSync(
  linux ? 'xvfb-run' : runner,
  linux
    ? [
        '-a',
        '-s',
        '-screen 0 1920x1080x24',
        runner,
        'test',
        ...process.argv.slice(2),
      ]
    : ['test', ...process.argv.slice(2)],
  { cwd: desktop, stdio: 'inherit' },
)
if (result.error) throw result.error
process.exitCode = result.status ?? 1
