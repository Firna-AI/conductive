import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const desktop = resolve(import.meta.dirname, '..')
const evidence = resolve(desktop, '../.context/boat-native-remote-workspaces')
await mkdir(evidence, { recursive: true })
const supplied = process.env.CONDUCTIVE_PACKAGED_APP
let scratch: string | undefined
let executable = supplied
try {
  if (!executable) {
    if (process.platform !== 'darwin')
      throw new Error('Run the Mac packaged smoke test on macOS')
    const name = (await readdir(resolve(desktop, 'dist/release'))).find(
      (file) => file.endsWith(`-mac-${process.arch}.zip`),
    )
    if (!name)
      throw new Error(
        'Build the Mac ZIP package before the packaged smoke test',
      )
    scratch = await mkdtemp(resolve(evidence, 'desktop-unpack-'))
    const extraction = spawnSync(
      'ditto',
      ['-x', '-k', resolve(desktop, 'dist/release', name), scratch],
      { stdio: 'inherit' },
    )
    if (extraction.error) throw extraction.error
    if (extraction.status !== 0) throw new Error('The Mac ZIP did not extract')
    executable = resolve(scratch, 'Conductive.app/Contents/MacOS/Conductive')
  }
  const result = spawnSync(
    process.execPath,
    [resolve(desktop, 'scripts/smoke.ts')],
    {
      cwd: desktop,
      stdio: 'inherit',
      env: { ...process.env, CONDUCTIVE_PACKAGED_APP: executable },
    },
  )
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  if (scratch) await rm(scratch, { recursive: true, force: true })
}
