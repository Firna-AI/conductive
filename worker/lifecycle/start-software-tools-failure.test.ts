import { execFile } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { SOFTWARE } from './backend-test-support'
import { workspaceSoftwareUpdateCommand } from './start-software-command'

const run = promisify(execFile)

it('stops the real child Bash shell and restores old software when the tools install fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-tools-failure-'))
  const bin = join(root, 'bin')
  const software = join(root, 'opt/conductive/software')
  const tools = join(root, 'opt/conductive/agent-tools')
  const runner = join(root, 'opt/conductive/runner-start.sh')
  const terminal = join(root, 'usr/local/lib/conductive/terminal')
  const environment = isolatedProcessEnvironment({
    PATH: `${bin}:/usr/bin:/bin`,
    FIXTURE_ROOT: root,
    HOME: root,
    TMPDIR: join(root, 'tmp'),
    TZ: 'UTC',
    LC_ALL: 'C',
  })
  try {
    await Promise.all(
      [
        bin,
        software,
        tools,
        join(root, 'tmp'),
        join(root, 'etc/systemd/system'),
      ].map((directory) => mkdir(directory, { recursive: true })),
    )
    await writeFile(join(software, 'runner'), 'old runner\n')
    await writeFile(join(tools, 'tool'), 'old tools\n')
    await writeFile(
      runner,
      '#!/bin/sh\ncat "$FIXTURE_ROOT/opt/conductive/software/runner"\n',
    )
    const scripts = {
      sudo: `#!/bin/sh
set -eu
shift
if [ "$1" = -- ]; then shift; fi
if [ "$1" = sh ]; then
  printf 'later-install %s\\n' "$*" >> "$FIXTURE_ROOT/events"
  exit 0
fi
exec "$@"
`,
      install: `#!/bin/sh
set -eu
case "$*" in
  *"$FIXTURE_ROOT/opt/conductive/agent-tools/tools"*)
    tar -tPf "$FIXTURE_ROOT"/tmp/conductive-software-backup.*/files.tar > "$FIXTURE_ROOT/backup-paths"
    printf 'tools-install:23\\n' >> "$FIXTURE_ROOT/events"
    printf 'new runner\\n' > "$FIXTURE_ROOT/opt/conductive/software/runner"
    printf 'new launcher\\n' > "$FIXTURE_ROOT/opt/conductive/runner-start.sh"
    printf 'new tools\\n' > "$FIXTURE_ROOT/opt/conductive/agent-tools/tool"
    mkdir -p "$FIXTURE_ROOT/usr/local/lib/conductive"
    printf 'new terminal\\n' > "$FIXTURE_ROOT/usr/local/lib/conductive/terminal"
    exit 23
    ;;
esac
printf 'later-install %s\\n' "$*" >> "$FIXTURE_ROOT/events"
while [ "$#" -gt 0 ]; do
  case "$1" in
    -d) shift ;;
    -m|-o|-g) shift 2 ;;
    "$FIXTURE_ROOT"/*) mkdir -p -- "$1"; shift ;;
    *) exit 99 ;;
  esac
done
`,
      'apt-get':
        '#!/bin/sh\nprintf "later-install apt-get %s\\n" "$*" >> "$FIXTURE_ROOT/events"\n',
      systemctl:
        '#!/bin/sh\nprintf "systemctl %s\\n" "$*" >> "$FIXTURE_ROOT/events"\n',
    }
    for (const [name, script] of Object.entries(scripts)) {
      await writeFile(join(bin, name), script, { mode: 0o755 })
    }
    const command = workspaceSoftwareUpdateCommand(SOFTWARE)
      .replaceAll('/opt/', `${root}/opt/`)
      .replaceAll('/usr/local/', `${root}/usr/local/`)
      .replaceAll('/etc/', `${root}/etc/`)
      .replaceAll(
        '/tmp/conductive-privileged.',
        `${root}/tmp/conductive-privileged.`,
      )
      .replaceAll(
        '/tmp/conductive-software-backup.',
        `${root}/tmp/conductive-software-backup.`,
      )
    const result = await run('/bin/sh', ['-c', command], {
      cwd: root,
      env: environment,
    }).then(
      ({ stderr }) => ({ exitCode: 0, stderr }),
      (error: unknown) => {
        if (
          !(error instanceof Error) ||
          !('code' in error) ||
          !('stderr' in error)
        )
          throw error
        return { exitCode: error.code, stderr: String(error.stderr) }
      },
    )
    expect(result.exitCode, result.stderr).toBe(1)
    expect(await readFile(join(software, 'runner'), 'utf8')).toBe(
      'old runner\n',
    )
    expect(await readFile(join(tools, 'tool'), 'utf8')).toBe('old tools\n')
    expect((await run('/bin/sh', [runner], { env: environment })).stdout).toBe(
      'old runner\n',
    )
    expect(await readFile(terminal, 'utf8').catch(() => null)).toBeNull()
    expect(await readFile(join(root, 'events'), 'utf8')).toBe(
      'tools-install:23\nsystemctl daemon-reload\n',
    )
    expect(await readFile(join(root, 'backup-paths'), 'utf8')).toContain(
      software,
    )
    expect(await readdir(join(root, 'tmp'))).toEqual([])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
