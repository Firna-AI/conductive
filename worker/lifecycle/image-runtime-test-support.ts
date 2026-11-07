import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { onTestFinished } from 'vitest'

import { imageTestProcess } from '../tools/image-test-process'
import { shellQuote } from './commands'
import { IMAGE_NODE_RUNTIME, imageNodeExecutable } from './image-runtime'

export async function imageRuntimeFixture() {
  const root = await mkdtemp(join(tmpdir(), "conducting runtime's "))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const commands = join(root, 'commands')
  const archive = join(root, 'node.tar.gz')
  const payload = join(root, 'payload', 'node-fixture', 'bin')
  const calls = join(root, 'downloads')
  const directory = join(root, IMAGE_NODE_RUNTIME.directory)
  const node = imageNodeExecutable(root)
  await mkdir(commands, { recursive: true })
  await mkdir(payload, { recursive: true })
  await writeFile(calls, '')
  await writeFile(
    join(payload, 'node'),
    "#!/bin/sh\nprintf '%s\\n' private-runtime\n",
    {
      mode: 0o755,
    },
  )
  const packed = await imageTestProcess('/usr/bin/tar', [
    '-czf',
    archive,
    '-C',
    join(root, 'payload'),
    'node-fixture',
  ])
  if (packed.exitCode !== 0) throw new Error(packed.stderr)
  await writeFile(
    join(commands, 'curl'),
    `#!/bin/sh
set -eu
while [ "$#" -gt 0 ]; do
  if [ "$1" = --output ]; then shift; output=$1; fi
  shift
done
printf 'download\\n' >> ${shellQuote(calls)}
cp ${shellQuote(archive)} "$output"
`,
    { mode: 0o755 },
  )
  const sha256 = createHash('sha256')
    .update(await readFile(archive))
    .digest('hex')
  return {
    root,
    directory,
    node,
    sha256,
    run: (digest = sha256) =>
      imageTestProcess(
        '/bin/sh',
        [
          new URL('../../image/install-runtime.sh', import.meta.url).pathname,
          'https://runtime.example.test/node.tar.gz',
          digest,
          directory,
        ],
        '',
        { PATH: `${commands}:/usr/bin:/bin`, TZ: 'UTC', LC_ALL: 'C' },
      ),
    downloads: async () =>
      (await readFile(calls, 'utf8')).trim().split('\n').filter(Boolean),
  }
}
