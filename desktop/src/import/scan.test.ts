import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { expect, it } from 'vitest'
import { importFixture, sourceHashes } from '../../tests/import-fixture.ts'
import { runImportJob } from './worker-client.ts'

it('scans live metadata without messages, native decompression, bundles, archived paths or source writes', async () => {
  const fixture = await importFixture()
  const db = new DatabaseSync(fixture.database)
  try {
    db.exec('PRAGMA journal_mode=WAL')
    db.prepare('UPDATE workspaces SET workspace_name=? WHERE local_id=?').run(
      'Live WAL name',
      'local-workspace',
    )
    const marker = join(fixture.workspace, '.git/filter-was-run')
    const include = join(fixture.workspace, '.git/included-config')
    await writeFile(
      include,
      `[filter "unsafe"]\n\tclean = touch '${marker}'\n\tprocess = touch '${marker}'\n\trequired = true\n`,
    )
    fixture.git('config', 'include.path', include)
    await writeFile(
      join(fixture.workspace, '.gitattributes'),
      '*.txt filter=unsafe\n',
    )
    // Broken compressed bytes remain discoverable without being decoded by a scan.
    await writeFile(fixture.codex, Buffer.from('invalid zstd bytes'))
    const before = await sourceHashes(fixture.locations.home)
    const hash = async (path: string) =>
      createHash('sha256')
        .update(await readFile(path))
        .digest('hex')
    const wal = await hash(`${fixture.database}-wal`)
    const rows = await runImportJob(
      fixture.locations,
      { action: 'scan' },
      new AbortController().signal,
    )
    expect(rows).toEqual([
      {
        localWorkspaceId: 'local-workspace',
        name: 'Live WAL name',
        repository: 'firna/repository',
        branch: 'feature',
        sessionCount: 3,
        uploadBytes: expect.any(Number),
      },
    ])
    expect(JSON.stringify(rows)).not.toMatch(
      /PRIVATE|Claude session|Codex session|conductor\/workspaces|\.jsonl|source-fixture/,
    )
    const after = await sourceHashes(fixture.locations.home)
    delete before[
      'Library/Application Support/com.conductor.app/conductor.db-shm'
    ]
    delete after[
      'Library/Application Support/com.conductor.app/conductor.db-shm'
    ]
    expect(after).toEqual(before)
    expect(await hash(`${fixture.database}-wal`)).toBe(wal)
    db.exec(
      'ALTER TABLE workspaces DROP COLUMN repository_id; ALTER TABLE repos DROP COLUMN id; ALTER TABLE sessions DROP COLUMN workspace_id',
    )
    const changedWal = await hash(`${fixture.database}-wal`)
    const unknown = await runImportJob(
      fixture.locations,
      { action: 'scan' },
      new AbortController().signal,
    )
    expect(unknown).toEqual([
      {
        localWorkspaceId: 'local-workspace',
        name: 'Live WAL name',
        repository: null,
        branch: 'feature',
        sessionCount: null,
        uploadBytes: expect.any(Number),
      },
    ])
    expect(await hash(`${fixture.database}-wal`)).toBe(changedWal)
  } finally {
    db.close()
    await fixture.dispose()
  }
})
