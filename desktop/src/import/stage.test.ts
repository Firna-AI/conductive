import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { expect, it } from 'vitest'
import { readStageResults } from './stage.ts'
import {
  claudeMemory,
  content,
  manifest,
  packageFixture,
  packageSelection,
  signal,
} from './package-test-support.ts'

it('packages working bytes, modes, tombstones, links, context and native session recipes', async () => {
  const fixture = await packageFixture()
  try {
    await fixture.write('replaced-dir/old.txt', 'tracked child\n')
    await fixture.write('.gitattributes', '*.txt text\n')
    await fixture.write('clean-crlf.txt', 'first\r\nsecond\r\n')
    await utimes(
      join(fixture.workspace, 'clean-crlf.txt'),
      new Date('2020-01-01T00:00:00Z'),
      new Date('2020-01-01T00:00:00Z'),
    )
    await fixture.commit('directory base')
    expect(
      await fixture.git('status', '--porcelain', '--', 'clean-crlf.txt'),
    ).toBe('')
    await fixture.write('tracked.txt', 'staged version\n')
    await fixture.git('add', 'tracked.txt')
    await fixture.write('tracked.txt', 'working version\n')
    await chmod(join(fixture.workspace, 'script.sh'), 0o755)
    await rename(
      join(fixture.workspace, 'gone.txt'),
      join(fixture.workspace, 'renamed.txt'),
    )
    await fixture.write('.gitignore', '.context/\n')
    await fixture.write('.context/note.md', 'Context to keep.\n')
    await mkdir(join(fixture.workspace, '.context/empty'), {
      recursive: true,
      mode: 0o750,
    })
    await chmod(join(fixture.workspace, '.context'), 0o755)
    await chmod(join(fixture.workspace, '.context/empty'), 0o750)
    await mkdir(join(fixture.root, 'outside'))
    await writeFile(join(fixture.root, 'outside/old.txt'), 'outside sentinel\n')
    await symlink(
      join(fixture.root, 'outside'),
      join(fixture.workspace, 'directory-link'),
    )
    await symlink('tracked.txt', join(fixture.workspace, 'file-link'))
    await rm(join(fixture.workspace, 'replaced-dir'), { recursive: true })
    await symlink(
      join(fixture.root, 'outside'),
      join(fixture.workspace, 'replaced-dir'),
    )
    const memory = claudeMemory()
    await fixture.native('.claude/projects/example/native-one.jsonl', memory)
    fixture.session('old-claude', 'native-one', 'claude', 'Claude conversation')
    const codex = Buffer.from(
      `${JSON.stringify({ type: 'response_item', timestamp: '2026-11-10T11:00:00.000Z', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Codex question.' }] } })}\n`,
    )
    const compressed = zstdCompressSync(codex)
    await fixture.native(
      '.codex/sessions/2026/11/10/rollout-2026-11-10T11-00-00-22222222-2222-4222-8222-222222222222.jsonl.zst',
      compressed,
    )
    fixture.session(
      'old-codex',
      '22222222-2222-4222-8222-222222222222',
      'codex',
      'Codex conversation',
    )
    fixture.session('missing-file', 'gone-native', 'claude', 'Missing file')
    fixture.session('missing-id', null, 'codex', 'Never started')
    fixture.session(
      'unknown-agent',
      'native-one',
      'future-agent',
      'Unknown agent',
    )
    const stage = await packageSelection(fixture.locations)
    const entries = await manifest(fixture.locations, stage)
    const files = entries.filter((entry) => entry.kind === 'file')
    expect(files.map((entry) => [entry.path, entry.mode])).toEqual([
      ['.context/note.md', '100644'],
      ['.gitignore', '100644'],
      ['clean-crlf.txt', '100644'],
      ['renamed.txt', '100644'],
      ['script.sh', '100755'],
      ['tracked.txt', '100644'],
    ])
    const tracked = files.find((entry) => entry.path === 'tracked.txt')
    expect(tracked?.kind).toBe('file')
    if (!tracked) throw new Error('Expected a working file.')
    expect(
      (
        await content(fixture.locations, stage, entries, tracked.objectId)
      ).toString(),
    ).toBe('working version\n')
    const crlf = files.find((entry) => entry.path === 'clean-crlf.txt')
    if (!crlf) throw new Error('Expected the clean CRLF working file.')
    expect(
      await content(fixture.locations, stage, entries, crlf.objectId),
    ).toEqual(Buffer.from('first\r\nsecond\r\n'))
    expect(await readFile(join(fixture.workspace, 'clean-crlf.txt'))).toEqual(
      Buffer.from('first\r\nsecond\r\n'),
    )
    expect(entries.filter((entry) => entry.kind === 'delete')).toEqual([
      { kind: 'delete', path: 'gone.txt' },
    ])
    expect(entries.filter((entry) => entry.kind === 'symlink')).toEqual([
      {
        kind: 'symlink',
        path: 'directory-link',
        target: join(fixture.root, 'outside'),
      },
      { kind: 'symlink', path: 'file-link', target: 'tracked.txt' },
      {
        kind: 'symlink',
        path: 'replaced-dir',
        target: join(fixture.root, 'outside'),
      },
    ])
    expect(entries.filter((entry) => entry.kind === 'directory')).toEqual([
      { kind: 'directory', path: '.context', mode: 0o755 },
      { kind: 'directory', path: '.context/empty', mode: 0o750 },
    ])
    const sessions = entries.filter((entry) => entry.kind === 'session')
    expect(
      sessions.map((entry) => [entry.id, entry.nativePath, entry.messageCount]),
    ).toEqual([
      ['old-claude', 'native-one.jsonl', 2],
      [
        'old-codex',
        'sessions/2026/11/10/rollout-2026-11-10T11-00-00-22222222-2222-4222-8222-222222222222.jsonl',
        1,
      ],
    ])
    const [claude, codexSession] = sessions
    if (!claude || !codexSession)
      throw new Error('Expected both native sessions.')
    expect(
      await content(fixture.locations, stage, entries, claude.memoryObjectId),
    ).toEqual(Buffer.from(memory))
    expect(
      await content(
        fixture.locations,
        stage,
        entries,
        codexSession.memoryObjectId,
      ),
    ).toEqual(compressed)
    expect(
      entries.find(
        (entry) =>
          entry.kind === 'object' && entry.id === codexSession.memoryObjectId,
      ),
    ).toMatchObject({
      encoding: 'zstd',
      sizeBytes: compressed.length,
      restoredBytes: codex.length,
    })
    expect(
      (
        await content(
          fixture.locations,
          stage,
          entries,
          claude.documentObjectId,
        )
      ).toString(),
    ).toBe(
      '# Imported session\n\n## User\n\nOriginal question.\n\n## Assistant\n\nOriginal answer.\n\n',
    )
    const purposes = new Map(
      entries
        .filter((entry) => entry.kind === 'object')
        .map((entry) => [entry.id, entry.purpose]),
    )
    for (const entry of entries)
      if (entry.kind === 'part')
        expect(entry.part.group).toBe(
          purposes.get(entry.objectId) === 'document' ? 'document' : 'work',
        )
    expect(
      await readStageResults(fixture.locations, stage.id, signal()),
    ).toEqual({
      files: [],
      sessions: [
        { title: 'Missing file' },
        { title: 'Never started' },
        { title: 'Unknown agent' },
      ],
    })
    expect(stage.snapshot.sessionCount).toBe(2)
    expect(stage.snapshot.recordCount).toBe(entries.length)
  } finally {
    await fixture.dispose()
  }
})
