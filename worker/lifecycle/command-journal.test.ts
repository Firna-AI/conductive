import {
  appendFile,
  mkdir,
  readFile,
  readlink,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { lifecycleCommand } from './command-intents'
import { shellQuote } from './commands'
import { workspaceStartupCommand } from './image-software'
import { readSavedScript } from './saved-script'
import { localSavedScriptFixture } from './saved-script-test-support'

const owner = { kind: 'workspace', id: 'one', attempt: 'start-one' } as const
const startup = join(owner.kind, owner.id, owner.attempt, 'startup')

async function startAtTheLine(line = true, holdWorks = true) {
  const sandbox = await localSavedScriptFixture('repository-one', 'retention')
  const setting = join(sandbox.directory, 'ext4/vda1/reserved_clusters')
  const dataSetting = join(sandbox.directory, 'ext4/vda2/reserved_clusters')
  const environment = join(sandbox.directory, 'env.sh')
  const holdLog = join(sandbox.directory, 'hold.log')
  const result = join(sandbox.directory, 'workspace-journal', startup, 'result')
  const leases = join(sandbox.directory, 'disk/leases')
  const leaseSnapshot = join(sandbox.directory, 'active-lease')
  await mkdir(dirname(setting), { recursive: true })
  await mkdir(dirname(dataSetting), { recursive: true })
  await writeFile(setting, '700000\n')
  await writeFile(dataSetting, '6000\n')
  if (line)
    await appendFile(
      environment,
      "\nexport CONDUCTIVE_DISK_LINE_BYTES='72000000000'\n",
    )
  await writeFile(
    join(sandbox.directory, 'software/current/conductive'),
    holdWorks
      ? [
          '#!/bin/sh',
          '[ "$1 $2" = "disk hold" ] || exit 1',
          `. ${shellQuote(environment)}`,
          '[ -n "${CONDUCTIVE_DISK_LINE_BYTES:-}" ] || exit 0',
          `for lease in ${shellQuote(leases)}/*; do`,
          `  if [ -f "$lease" ]; then printf '4096\\n' > ${shellQuote(setting)}; exit; fi`,
          'done',
          `printf '700000\\n' > ${shellQuote(setting)}`,
          `cat ${shellQuote(result)} >> ${shellQuote(holdLog)}`,
        ].join('\n')
      : '#!/bin/sh\nexit 2\n',
  )
  return {
    sandbox,
    setting,
    dataSetting,
    holdLog,
    leaseSnapshot,
    ownerFile: join(dirname(result), 'owner'),
    command: workspaceStartupCommand(
      readSavedScript(
        `cat ${shellQuote(setting)}\ncat ${shellQuote(leases)}/* > ${shellQuote(leaseSnapshot)}`,
      ),
      null,
      'retention',
    ),
  }
}

it('releases only the root disk and publishes the result before restoring its hold', async () => {
  const {
    sandbox,
    command,
    holdLog,
    leaseSnapshot,
    ownerFile,
    setting,
    dataSetting,
  } = await startAtTheLine()
  try {
    expect(
      await sandbox.run(lifecycleCommand(owner, 'startup', command)),
    ).toEqual({
      exitCode: 0,
      stdout: '4096\n',
      stderr: '',
      timedOut: false,
    })
    const ownerPid = await readlink(ownerFile)
    expect(await readFile(leaseSnapshot, 'utf8')).toMatch(
      new RegExp(`^${ownerPid} [0-9]+\\n$`),
    )
    expect(await readFile(holdLog, 'utf8')).toBe('0\n')
    expect(await readFile(setting, 'utf8')).toBe('700000\n')
    expect(await readFile(dataSetting, 'utf8')).toBe('6000\n')
  } finally {
    await sandbox.dispose()
  }
})

it('keeps both disk settings when there is no disk line', async () => {
  const { sandbox, setting, dataSetting } = await startAtTheLine(false)
  try {
    expect(
      await sandbox.run(
        lifecycleCommand(
          owner,
          'startup',
          `cat ${shellQuote(setting)} ${shellQuote(dataSetting)}`,
        ),
      ),
    ).toMatchObject({ exitCode: 0, stdout: '700000\n6000\n' })
  } finally {
    await sandbox.dispose()
  }
})

it.each([
  { failure: 'software', line: true, stdout: '4096\n6000\n' },
  { failure: 'software', line: false, stdout: '700000\n6000\n' },
  { failure: 'lease', line: true, stdout: '4096\n6000\n' },
])(
  'uses the root-only fallback after a $failure failure with disk line $line',
  async ({ failure, line, stdout }) => {
    const { sandbox, setting, dataSetting } = await startAtTheLine(
      line,
      failure !== 'software',
    )
    try {
      if (failure === 'lease') {
        const disk = join(sandbox.directory, 'disk')
        await mkdir(disk)
        await writeFile(join(disk, 'leases'), '')
      }
      const mountInfo = join(sandbox.directory, 'mountinfo')
      const blockDevices = join(sandbox.directory, 'devices')
      await mkdir(blockDevices)
      await symlink('../vda1', join(blockDevices, '253:1'))
      await symlink('../vda2', join(blockDevices, '253:2'))
      await writeFile(
        mountInfo,
        '19 12 253:1 / / rw shared:1 - ext4 /dev/root rw\n' +
          '20 19 253:2 / /data rw - ext4 /dev/vda2 rw\n',
      )
      const command = lifecycleCommand(
        owner,
        'startup',
        `cat ${shellQuote(setting)} ${shellQuote(dataSetting)}`,
      )
        .replace('findmnt -', `findmnt --tab-file "${mountInfo}" -`)
        .replace('/dev/block/', `${blockDevices}/`)
      expect(await sandbox.run(command)).toMatchObject({ exitCode: 0, stdout })
    } finally {
      await sandbox.dispose()
    }
  },
)

it.each([
  { result: '7\n', exitCode: 7 },
  { result: '', exitCode: 125 },
  { result: '7', exitCode: 125 },
])(
  'recovers a legacy journal with result $result as exit $exitCode',
  async ({ result, exitCode }) => {
    const { sandbox, holdLog, setting } = await startAtTheLine()
    try {
      const legacy = join(sandbox.directory, 'command-journal', startup)
      await mkdir(legacy, { recursive: true })
      await symlink('1', join(legacy, 'owner'))
      await writeFile(join(legacy, 'result'), result)
      expect(
        await sandbox.run(lifecycleCommand(owner, 'startup', 'exit 73', true)),
      ).toMatchObject({ exitCode })
      expect(await readFile(setting, 'utf8')).toBe('700000\n')
      await expect(readFile(holdLog, 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      })
    } finally {
      await sandbox.dispose()
    }
  },
)

it('runs an image build journal with the existing disk hold', async () => {
  const { sandbox, holdLog, setting } = await startAtTheLine()
  try {
    const build = { kind: 'build', id: 'one' } as const
    expect(
      await sandbox.run(
        lifecycleCommand(build, 'install', `cat ${shellQuote(setting)}`),
      ),
    ).toMatchObject({ exitCode: 0, stdout: '700000\n' })
    await expect(readFile(holdLog, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })
  } finally {
    await sandbox.dispose()
  }
})

it('replays a completed workspace journal without releasing or restoring the hold', async () => {
  const { sandbox, command, holdLog, setting } = await startAtTheLine()
  try {
    const started = await sandbox.run(
      lifecycleCommand(owner, 'startup', command),
    )
    expect(started.exitCode).toBe(0)
    const calls = await readFile(holdLog, 'utf8')
    expect(
      await sandbox.run(lifecycleCommand(owner, 'startup', 'exit 73', true)),
    ).toEqual(started)
    expect(await readFile(setting, 'utf8')).toBe('700000\n')
    expect(await readFile(holdLog, 'utf8')).toBe(calls)
  } finally {
    await sandbox.dispose()
  }
})
