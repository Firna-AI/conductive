import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

/** The approved iconset already contains every macOS size. Do not resample it. */
if (process.platform !== 'darwin')
  throw new Error('Build the Mac icon with iconutil on macOS')
const desktop = resolve(import.meta.dirname, '..')
await mkdir(resolve(desktop, 'dist/bundle'), { recursive: true })
const result = spawnSync(
  'iconutil',
  [
    '-c',
    'icns',
    resolve(desktop, '../docs/brand/conductive.iconset'),
    '-o',
    resolve(desktop, 'dist/bundle/conductive.icns'),
  ],
  { stdio: 'inherit' },
)
if (result.error) throw result.error
process.exitCode = result.status ?? 1
