import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { DEFAULT_APP_ORIGIN, readConfiguration } from '../src/config.ts'

const desktop = resolve(import.meta.dirname, '..')
const repository = resolve(desktop, '..')
const frameSources = (process.env.CONDUCTIVE_FRAME_SOURCES ?? '')
  .split(/\s+/)
  .filter(Boolean)
const configuration = readConfiguration({
  appOrigin: process.env.CONDUCTIVE_APP_ORIGIN ?? DEFAULT_APP_ORIGIN,
  frameSources,
  // Enabling the feed needs a published public repository and a deliberate build.
  updates:
    process.env.CONDUCTIVE_DESKTOP_UPDATES === 'enabled'
      ? 'enabled'
      : 'unpublished',
})
const run = (program: string, args: string[]) => {
  const result = spawnSync(program, args, { cwd: repository, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
await rm(resolve(desktop, 'dist/app'), { recursive: true, force: true })
run(process.execPath, [
  resolve(repository, 'node_modules/vite/bin/vite.js'),
  'build',
  '--config',
  'desktop/vite.config.ts',
])
run(process.execPath, [
  resolve(repository, 'node_modules/typescript/bin/tsc'),
  '-p',
  'desktop/tsconfig.build.json',
])
await mkdir(resolve(desktop, 'dist/bundle'), { recursive: true })
await copyFile(
  resolve(repository, 'docs/brand/conductive-icon-1024.png'),
  resolve(desktop, 'dist/bundle/conductive-icon-1024.png'),
)
await writeFile(
  resolve(desktop, 'dist/bundle/build-config.json'),
  JSON.stringify(configuration, null, 2) + '\n',
)
