import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

import { onTestFinished } from 'vitest'

import { imageTestProcess } from '../tools/image-test-process'
import { shellQuote } from './commands'
import { imageNodeExecutable, imageRuntimeScript } from './image-runtime'

export async function imageSoftwareFixture() {
  const root = await mkdtemp(join(tmpdir(), "conductive software's "))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const installation = join(root, 'opt/conductive')
  const staged = join(installation, 'staged')
  const commands = join(root, 'commands')
  const node = imageNodeExecutable(root)
  const calls = join(root, 'calls')
  const archive = join(root, 'runner.tar.gz')
  const payload = join(root, 'payload', 'runner')
  const repository = join(root, 'repository')
  for (const directory of [
    staged,
    commands,
    dirname(node),
    payload,
    repository,
    join(root, 'usr/local/bin'),
    join(root, 'etc/systemd/system'),
    join(root, 'run/ascii-secrets'),
    join(root, 'run/conductive'),
  ]) {
    await mkdir(directory, { recursive: true })
  }
  await writeFile(calls, '')
  const record = (label: string) =>
    `printf '%s\\n' ${shellQuote(label)} >> ${shellQuote(calls)}`
  await writeFile(
    node,
    `#!/bin/sh\n${record('private Node')}\nexec ${shellQuote(process.execPath)} "$@"\n`,
    { mode: 0o755 },
  )
  await writeFile(join(commands, 'node'), '#!/bin/sh\nexit 73\n', {
    mode: 0o755,
  })
  for (const command of ['git', 'systemctl']) {
    await writeFile(
      join(commands, command),
      `#!/bin/sh\nprintf '${command} %s\\n' "$*" >> ${shellQuote(calls)}\n`,
      { mode: 0o755 },
    )
  }
  await writeFile(
    join(commands, 'curl'),
    `#!/bin/sh
set -eu
while [ "$#" -gt 0 ]; do
  if [ "$1" = --output ]; then shift; output=$1; fi
  shift
done
cp ${shellQuote(archive)} "$output"
`,
    { mode: 0o755 },
  )
  const program = `process.stdout.write(JSON.stringify({
  node: process.execPath,
  cwd: process.cwd(),
  workspace: process.env.CONDUCTIVE_WORKSPACE_ID,
  configuredNode: process.env.CONDUCTIVE_NODE,
}))\n`
  await writeFile(join(payload, 'main.mjs'), program)
  const packed = await imageTestProcess('/usr/bin/tar', [
    '-czf',
    archive,
    '-C',
    dirname(payload),
    'runner',
  ])
  if (packed.exitCode !== 0) throw new Error(packed.stderr)
  const roots = [
    '/opt/conductive',
    '/usr/local/bin',
    '/etc/systemd/system',
    '/run/ascii-secrets',
    '/run/conductive',
  ]
  for (const file of [
    'install.sh',
    'runner-start.sh',
    'git-credential-helper.sh',
    'git-credential-helper.mjs',
    'conductive-runner.service',
  ]) {
    let source = await readFile(
      new URL(`../../image/${file}`, import.meta.url),
      'utf8',
    )
    if (file.endsWith('.sh')) {
      for (const prefix of roots) {
        source = source.replaceAll(prefix, shellQuote(join(root, prefix)))
      }
      source = imageRuntimeScript(source, root)
    }
    await writeFile(join(staged, file), source)
  }
  const sha256 = createHash('sha256')
    .update(await readFile(archive))
    .digest('hex')
  const env = { PATH: `${commands}:/usr/bin:/bin`, TZ: 'UTC', LC_ALL: 'C' }
  return {
    repository,
    commands,
    installation,
    credentialHelper: join(root, 'usr/local/bin/conductive-git-credential'),
    install: () =>
      imageTestProcess(
        '/bin/sh',
        [
          join(staged, 'install.sh'),
          'https://software.example.test/runner.tar.gz',
          sha256,
        ],
        '',
        env,
      ),
    calls: async () =>
      (await readFile(calls, 'utf8')).trim().split('\n').filter(Boolean),
    start: async (values: Readonly<Record<string, string>>, ready = true) => {
      await writeFile(
        join(root, 'run/ascii-secrets/env.sh'),
        Object.entries({ CONDUCTIVE_REPOSITORY_DIR: repository, ...values })
          .map(([name, value]) => `${name}=${shellQuote(value)}\n`)
          .join(''),
      )
      const marker = join(root, 'run/conductive/workspace-ready')
      if (ready) await writeFile(marker, '')
      else await rm(marker, { force: true })
      return imageTestProcess(
        '/bin/sh',
        [join(installation, 'runner-start.sh')],
        '',
        env,
      )
    },
  }
}
