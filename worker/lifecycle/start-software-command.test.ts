import { execFile } from 'node:child_process'
import {
  chmod,
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

import { SOFTWARE } from './backend-test-support'
import { workspaceSoftwareUpdateCommand } from './start-software-command'

const run = promisify(execFile)

it('restores the old runnable software and removes newly installed app files after an install failure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-software-rollback-'))
  const bin = join(root, 'bin')
  const software = join(root, 'opt/conductive/software')
  const runner = join(root, 'opt/conductive/runner-start.sh')
  const terminal = join(root, 'usr/local/lib/conductive')
  try {
    await Promise.all([
      mkdir(bin, { recursive: true }),
      mkdir(software, { recursive: true }),
      mkdir(join(root, 'tmp'), { recursive: true }),
      mkdir(join(root, 'run/ascii-secrets'), { recursive: true }),
    ])
    await writeFile(join(software, 'runner'), 'old runner\n')
    await writeFile(
      runner,
      '#!/bin/sh\ncat "$FIXTURE_ROOT/opt/conductive/software/runner"\n',
    )
    await writeFile(
      join(root, 'run/ascii-secrets/env.sh'),
      'WORKSPACE_TOKEN=private-token\n',
    )
    const scripts = {
      sudo: '#!/bin/sh\nshift\nshift\nexec "$@"\n',
      bash: `#!/bin/sh
set -eu
tar -tPf "$FIXTURE_ROOT"/tmp/conductive-software-backup.*/files.tar > "$FIXTURE_ROOT/backup-paths"
rm -rf "$FIXTURE_ROOT/opt/conductive/software"
mkdir -p "$FIXTURE_ROOT/opt/conductive/software" "$FIXTURE_ROOT/usr/local/lib/conductive"
printf 'new runner\\n' > "$FIXTURE_ROOT/opt/conductive/software/runner"
printf 'new launcher\\n' > "$FIXTURE_ROOT/opt/conductive/runner-start.sh"
printf 'new terminal\\n' > "$FIXTURE_ROOT/usr/local/lib/conductive/terminal"
exit 137
`,
      systemctl: '#!/bin/sh\nexit 0\n',
    }
    for (const [name, script] of Object.entries(scripts)) {
      await writeFile(join(bin, name), script)
      await chmod(join(bin, name), 0o755)
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
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        FIXTURE_ROOT: root,
      },
    }).then(
      () => 0,
      (error: unknown) =>
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : error,
    )
    expect(result).toBe(1)
    expect(await readFile(join(software, 'runner'), 'utf8')).toBe(
      'old runner\n',
    )
    expect(
      (
        await run('/bin/sh', [runner], {
          env: { ...process.env, FIXTURE_ROOT: root },
        })
      ).stdout,
    ).toBe('old runner\n')
    expect(
      await readFile(join(terminal, 'terminal'), 'utf8').catch(() => null),
    ).toBeNull()
    expect(await readFile(join(root, 'backup-paths'), 'utf8')).not.toContain(
      '/run/',
    )
    expect(await readFile(join(root, 'run/ascii-secrets/env.sh'), 'utf8')).toBe(
      'WORKSPACE_TOKEN=private-token\n',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it('activates the preview relay after a successful workspace software installation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-software-activation-'))
  const bin = join(root, 'bin')
  try {
    await mkdir(bin, { recursive: true })
    await mkdir(join(root, 'tmp'), { recursive: true })
    await writeFile(join(root, 'services'), '')
    const scripts = {
      sudo: '#!/bin/sh\nshift\nshift\nexec "$@"\n',
      bash: '#!/bin/sh\nexit 0\n',
      systemctl: '#!/bin/sh\nprintf "%s\\n" "$*" >> "$FIXTURE_ROOT/services"\n',
    }
    for (const [name, script] of Object.entries(scripts)) {
      await writeFile(join(bin, name), script)
      await chmod(join(bin, name), 0o755)
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
    await run('/bin/sh', ['-c', command], {
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        FIXTURE_ROOT: root,
      },
    })
    expect(await readFile(join(root, 'services'), 'utf8')).toBe(
      'start conductive-preview-relay.socket\nrestart conductive-preview-relay.service\n',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it('removes an incomplete software backup and preserves old app files when the archive write fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-software-backup-'))
  const bin = join(root, 'bin')
  const temporary = join(root, 'tmp')
  const software = join(root, 'opt/conductive/software')
  const runner = join(root, 'opt/conductive/runner-start.sh')
  try {
    await Promise.all([
      mkdir(bin, { recursive: true }),
      mkdir(temporary, { recursive: true }),
      mkdir(software, { recursive: true }),
    ])
    await writeFile(join(software, 'runner'), 'old runner\n')
    await writeFile(
      runner,
      '#!/bin/sh\ncat "$FIXTURE_ROOT/opt/conductive/software/runner"\n',
    )
    const scripts = {
      sudo: '#!/bin/sh\nshift\nshift\nexec "$@"\n',
      tar: `#!/bin/sh
set -eu
printf '%s\\n' "$1" >> "$FIXTURE_ROOT/tar-calls"
printf 'partial archive\\n' > "$2"
exit 2
`,
      bash: '#!/bin/sh\ntouch "$FIXTURE_ROOT/install-ran"\n',
      systemctl: '#!/bin/sh\ntouch "$FIXTURE_ROOT/service-ran"\n',
    }
    for (const [name, script] of Object.entries(scripts)) {
      await writeFile(join(bin, name), script)
      await chmod(join(bin, name), 0o755)
    }
    const command = workspaceSoftwareUpdateCommand(SOFTWARE)
      .replaceAll('/opt/', `${root}/opt/`)
      .replaceAll('/usr/local/', `${root}/usr/local/`)
      .replaceAll('/etc/', `${root}/etc/`)
      .replaceAll(
        '/tmp/conductive-privileged.',
        `${temporary}/conductive-privileged.`,
      )
      .replaceAll(
        '/tmp/conductive-software-backup.',
        `${temporary}/conductive-software-backup.`,
      )
    const result = await run('/bin/sh', ['-c', command], {
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        FIXTURE_ROOT: root,
      },
    }).then(
      () => 0,
      (error: unknown) =>
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : error,
    )
    expect(await readdir(temporary)).toEqual([])
    expect(result).toBe(1)
    expect(await readFile(join(software, 'runner'), 'utf8')).toBe(
      'old runner\n',
    )
    expect(
      (
        await run('/bin/sh', [runner], {
          env: { ...process.env, FIXTURE_ROOT: root },
        })
      ).stdout,
    ).toBe('old runner\n')
    expect(await readFile(join(root, 'tar-calls'), 'utf8')).toBe('-cPf\n')
    expect(await readdir(root)).not.toContain('install-ran')
    expect(await readdir(root)).not.toContain('service-ran')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
