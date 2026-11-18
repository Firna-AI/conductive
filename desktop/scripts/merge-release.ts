import { constants } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { mergeUpdateInfo } from './release-update-info.ts'

// Each signing job uploads the files of one architecture. The publish job
// downloads them into `dist/signed/x64` and `dist/signed/arm64`. This step
// puts them together in `dist/release`, with one `latest-mac.yml` for both.
const desktop = resolve(import.meta.dirname, '..')
const signed = resolve(desktop, 'dist/signed')
const release = resolve(desktop, 'dist/release')
const metadata = 'latest-mac.yml'

await mkdir(release, { recursive: true })
for (const architecture of ['x64', 'arm64']) {
  const folder = join(signed, architecture)
  for (const name of await readdir(folder)) {
    if (name === metadata) continue
    // The copy fails when two jobs give the same file name.
    await copyFile(
      join(folder, name),
      join(release, name),
      constants.COPYFILE_EXCL,
    )
  }
}
await writeFile(
  join(release, metadata),
  mergeUpdateInfo(
    await readFile(join(signed, 'x64', metadata), 'utf8'),
    await readFile(join(signed, 'arm64', metadata), 'utf8'),
  ),
)
process.stdout.write(`Joined the signed x64 and arm64 files in ${release}\n`)
