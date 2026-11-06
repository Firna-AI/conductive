import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

if (process.platform !== 'darwin') {
  throw new Error('Build the Mac DMG and ZIP packages on macOS')
}
const desktop = resolve(import.meta.dirname, '..')
const icon = spawnSync(
  process.execPath,
  [resolve(desktop, 'scripts/icon.ts')],
  { stdio: 'inherit' },
)
if (icon.error) throw icon.error
if (icon.status !== 0) process.exit(icon.status ?? 1)
const result = spawnSync(
  resolve(desktop, 'node_modules/.bin/electron-builder'),
  ['--mac', '--arm64', '--x64', '--publish', 'never'],
  {
    cwd: desktop,
    stdio: 'inherit',
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
  },
)
if (result.error) throw result.error
process.exitCode = result.status ?? 1
