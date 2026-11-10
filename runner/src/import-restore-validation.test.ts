import { lstat, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { importRunnerFixture } from '../test-support/import'
import { importDigest } from './import-storage'

it('rejects corrupt ranges and incorrect expansion before checkout and then accepts a fresh exact delivery', async () => {
  const h = await importRunnerFixture()
  await h.runner.start(false)
  await h.metadata()
  const entry = h.entries.find(
    (entry) => entry.kind === 'part' && entry.objectId === 'code',
  )
  if (entry?.kind !== 'part') throw new Error('Missing code part.')
  const action = {
    kind: 'chunk' as const,
    part: entry.part,
    offset: 0,
    length: h.values.code.length,
    sha256: 'f'.repeat(64),
    base64: h.values.code.toString('base64'),
  }
  expect((await h.command(action))?.result).toMatchObject({ ok: false })
  expect(
    (
      await h.command({
        ...action,
        offset: 1,
        length: h.values.code.length - 1,
        sha256: importDigest(h.values.code.subarray(1)),
        base64: h.values.code.subarray(1).toString('base64'),
      })
    )?.result,
  ).toMatchObject({ ok: false })
  expect(await h.read('foo')).toEqual(Buffer.from('old\n'))
  await h.deliver()
  expect((await h.command({ kind: 'restore' }))?.result).toEqual({ ok: true })
  expect(await h.read('foo')).toEqual(h.values.code)

  const invalid = await importRunnerFixture()
  const memory = invalid.entries.find(
    (entry) => entry.kind === 'object' && entry.id === 'codex',
  )
  if (memory?.kind !== 'object') throw new Error('Missing native memory.')
  invalid.snapshot.restoredBytes -= memory.restoredBytes - 1
  memory.restoredBytes = 1
  await invalid.runner.start(false)
  await invalid.metadata()
  await invalid.deliver()
  expect((await invalid.command({ kind: 'restore' }))?.result).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
  expect(await invalid.git('branch', '--show-current')).toBe('main')
  expect(await invalid.read('foo')).toEqual(Buffer.from('old\n'))
  expect(await readFile(join(invalid.cwd, '.git/index'))).toEqual(
    invalid.beforeIndex,
  )
  expect(
    await lstat(join(invalid.cwd, '.context')).catch(() => null),
  ).toBeNull()
})
