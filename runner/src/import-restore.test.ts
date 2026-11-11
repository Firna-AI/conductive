import { lstat, readFile, readlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { importDocumentFile } from '../../src/shared/conductor-import-manifest'
import { importSessionId } from '../../src/shared/runner-import'
import { importRunnerFixture } from '../test-support/import'
import { importConversionFixture } from '../test-support/import-conversions'
import { claudeProjectKey } from './import-native'
import { importPendingPath } from './import-paths'

it('defers checkout writes then restores exact files, links, modes, native bytes and document pairs once across restarts', async () => {
  const h = await importRunnerFixture()
  const excludePath = join(h.cwd, '.git/info/exclude')
  const exclude = await readFile(excludePath, 'utf8')
  const longPath = 'x'.repeat(255)
  h.entries.push({
    kind: 'file',
    path: longPath,
    mode: '100644',
    objectId: 'code',
  })
  h.entries.push(
    { kind: 'directory', path: '.context/read-only', mode: 0o500 },
    {
      kind: 'file',
      path: '.context/read-only/exact',
      mode: '100644',
      objectId: 'code',
    },
  )
  h.snapshot.recordCount = h.entries.length
  await h.runner.start(false)
  expect(h.endpoint.runnerEvents.map((event) => event.event.type)).toEqual([
    'runner.ready',
  ])
  expect(await readFile(excludePath, 'utf8')).toBe(exclude)
  expect(await lstat(join(h.cwd, '.context')).catch(() => null)).toBeNull()
  expect((await h.metadata())?.result).toMatchObject({ ok: true })
  await h.deliver()
  expect(
    (await h.command({ kind: 'restore' }, 'restore-once'))?.result,
  ).toEqual({ ok: true })
  expect(await h.git('rev-parse', 'HEAD')).toBe(h.snapshot.headOid)
  expect(await h.git('branch', '--show-current')).toBe('imported-branch')
  expect(await h.read('foo')).toEqual(h.values.code)
  expect(await h.read(longPath)).toEqual(h.values.code)
  expect(await h.read('foo.conductive-import-next')).toEqual(
    Buffer.from('keep\n'),
  )
  expect((await lstat(join(h.cwd, 'foo'))).mode & 0o777).toBe(0o755)
  expect(await lstat(join(h.cwd, 'gone.txt')).catch(() => null)).toBeNull()
  expect(await readlink(join(h.cwd, 'link'))).toBe('../outside')
  expect((await lstat(join(h.cwd, '.context/empty'))).mode & 0o777).toBe(0o700)
  expect(await h.read('.context/notes.txt')).toEqual(h.values.code)
  expect(await h.read('.context/read-only/exact')).toEqual(h.values.code)
  expect((await lstat(join(h.cwd, '.context/read-only'))).mode & 0o777).toBe(
    0o500,
  )
  expect(await h.read(importDocumentFile('claude-document'))).toEqual(
    h.values.document,
  )
  expect(await h.read(importDocumentFile('codex-document'))).toEqual(
    h.values.document,
  )
  const claudePath = join(
    h.home,
    '.conductive/claude/projects',
    claudeProjectKey(h.cwd),
    'claude-native.jsonl',
  )
  expect(await readFile(claudePath)).toEqual(h.nativeClaude)
  expect(
    await readFile(
      join(
        h.home,
        '.conductive/codex/sessions/2026/11/10/rollout-codex-native.jsonl',
      ),
    ),
  ).toEqual(h.expectedCodex)
  expect(
    h.store.snapshot.sessions.map((session) => ({
      id: session.sessionId,
      native: session.providerSessionId,
      imported: session.conductorImport,
    })),
  ).toEqual([
    {
      id: importSessionId('claude-document'),
      native: 'claude-native',
      imported: { documentId: 'claude-document', preparation: 'prepared' },
    },
    {
      id: importSessionId('codex-document'),
      native: 'codex-native',
      imported: { documentId: 'codex-document', preparation: 'prepared' },
    },
  ])
  const rules = (await readFile(excludePath, 'utf8')).split('\n')
  expect(rules.filter((rule) => rule === '/.context/')).toEqual(['/.context/'])
  expect(rules.filter((rule) => rule === '.context/')).toEqual([])
  expect(
    await h
      .git('check-ignore', '--no-index', 'nested/.context/visible.txt')
      .catch(() => 'visible'),
  ).toBe('visible')
  await writeFile(join(h.cwd, 'foo'), 'later work\n')
  await h.restart()
  expect(
    (await h.command({ kind: 'restore' }, 'restore-once'))?.result,
  ).toEqual({ ok: true })
  expect(
    (await h.command({ kind: 'restore' }, 'restore-after-restart'))?.result,
  ).toEqual({ ok: true })
  expect(await h.read('foo')).toEqual(Buffer.from('later work\n'))
  expect((await h.command({ kind: 'finish' }))?.result).toEqual({ ok: true })
  expect(
    await lstat(importPendingPath(h.serviceHome)).catch(() => null),
  ).toBeNull()
  await h.restart()
  expect(
    h.store.snapshot.sessions.map((session) => session.providerSessionId),
  ).toEqual(['claude-native', 'codex-native'])
  expect(await h.read('foo')).toEqual(Buffer.from('later work\n'))
  expect(h.warnings).toEqual([])

  const converted = await importConversionFixture()
  expect(await converted.git('write-tree')).toBe(
    converted.snapshot.gitDisk.treeOid,
  )
  await converted.runner.start(false)
  await converted.metadata()
  await converted.deliver()
  expect((await converted.command({ kind: 'restore' }))?.result).toEqual({
    ok: true,
  })
  for (const [path, bytes] of Object.entries(converted.files))
    expect(await converted.read(path), path).toEqual(Buffer.from(bytes))
  expect(await converted.read(converted.untrackedPath)).toEqual(
    Buffer.from('Keep unrelated bytes.\n'),
  )
  expect(await readFile(converted.attributePath)).toEqual(converted.attributes)
  expect((await lstat(converted.attributePath)).mode & 0o777).toBe(0o640)
  expect(await readFile(join(converted.cwd, '.git/config'))).toEqual(
    converted.config,
  )
  expect(
    await lstat(join(converted.cwd, 'conversion-ran')).catch(() => null),
  ).toBeNull()
})

it('initializes transport outside a configured home and state path inside the checkout before disk admission', async () => {
  const h = await importRunnerFixture(
    { measureDisk: async () => ({ bsize: 4096n, bavail: 0n }) },
    {},
    true,
  )
  expect(await h.read('user-state.json')).toEqual(
    Buffer.from('{"source":"keep this file"}\n'),
  )
  expect(await lstat(h.home).catch(() => null)).toBeNull()
  await h.runner.start(false)
  expect((await h.metadata())?.result).toMatchObject({
    ok: false,
    error: { code: 'import_disk_space', availableBytes: '0' },
  })
  expect(await h.read('user-state.json')).toEqual(
    Buffer.from('{"source":"keep this file"}\n'),
  )
  expect(await readFile(join(h.cwd, '.git/index'))).toEqual(h.beforeIndex)
  expect(await lstat(h.home).catch(() => null)).toBeNull()
  expect(await lstat(join(h.cwd, '.context')).catch(() => null)).toBeNull()
})

it('reports actual disk sizes before checkout, context preparation or content delivery', async () => {
  const h = await importRunnerFixture({
    measureDisk: async () => ({ bsize: 4096n, bavail: 0n }),
  })
  const excludePath = join(h.cwd, '.git/info/exclude')
  const exclude = await readFile(excludePath, 'utf8')
  await h.runner.start(false)
  const reply = await h.metadata()
  expect(reply?.result).toMatchObject({
    ok: false,
    error: { code: 'import_disk_space', availableBytes: '0' },
  })
  expect(await h.git('branch', '--show-current')).toBe('main')
  expect(await h.read('foo')).toEqual(Buffer.from('old\n'))
  expect(await readFile(excludePath, 'utf8')).toBe(exclude)
  expect(await lstat(join(h.cwd, '.context')).catch(() => null)).toBeNull()

  let remainingBlocks = 1_000_000n
  const dependencies: (string | null)[] = []
  const later = await importRunnerFixture({
    measureDisk: async (path) => {
      dependencies.push(
        await readFile(join(path, '.git/FETCH_HEAD'), 'utf8').catch(() => null),
      )
      return { bsize: 4096n, bavail: remainingBlocks }
    },
  })
  const laterExclude = await readFile(join(later.cwd, '.git/info/exclude'))
  await later.runner.start(false)
  const firstAdmission = await later.metadata()
  expect(firstAdmission?.result).toMatchObject({ ok: true })
  await later.deliver()
  remainingBlocks = 16n
  expect((await later.command({ kind: 'restore' }))?.result).toMatchObject({
    ok: false,
    error: { code: 'import_disk_space', availableBytes: '65536' },
  })
  expect(dependencies).toEqual([
    null,
    expect.stringContaining(later.snapshot.headOid),
  ])
  expect(await later.git('branch', '--show-current')).toBe('main')
  expect(await later.read('foo')).toEqual(Buffer.from('old\n'))
  expect(await readFile(join(later.cwd, '.git/index'))).toEqual(
    later.beforeIndex,
  )
  expect(await readFile(join(later.cwd, '.git/info/exclude'))).toEqual(
    laterExclude,
  )
  expect(await lstat(join(later.cwd, '.context')).catch(() => null)).toBeNull()
  remainingBlocks = 100n
  expect(
    Number(
      firstAdmission?.result.ok ? firstAdmission.result.requiredBytes : '0',
    ),
  ).toBeGreaterThan(409600)
  expect((await later.command({ kind: 'restore' }))?.result).toEqual({
    ok: true,
  })
  expect(await later.read('foo')).toEqual(later.values.code)
})
