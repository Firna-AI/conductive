import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { expect, it, vi } from 'vitest'
import * as safeFiles from './safe-files.ts'
import {
  buildStage,
  prepareStage,
  readStagePage,
  readStagePart,
  reuseStage,
  sealStage,
} from './stage.ts'
import {
  claudeMemory,
  content,
  facts,
  manifest,
  packageFixture,
  packageSelection,
  signal,
  stagedPartPath,
} from './package-test-support.ts'

it('reuses a sealed inventory only for its exact unchanged source and reservation', async () => {
  const fixture = await packageFixture()
  try {
    await fixture.write('tracked.txt', 'selected bytes\n')
    for (let index = 0; index < 84; index++)
      await fixture.write(`many/file-${index}`, 'small\n')
    const stage = await packageSelection(fixture.locations)
    const entries = await manifest(fixture.locations, stage)
    expect(
      (await readStagePage(fixture.locations, stage.id, 0, signal())).length,
    ).toBe(256)
    expect(
      (await readStagePage(fixture.locations, stage.id, 256, signal())).length,
    ).toBe(entries.length - 256)
    const reused = await reuseStage(
      fixture.locations,
      'local-one',
      'org/member/device',
      'reservation-one',
      signal(),
    )
    expect(reused).toEqual(stage)
    const head = await fixture.git('rev-parse', 'HEAD')
    const other = await fixture.git(
      'commit-tree',
      'HEAD^{tree}',
      '-p',
      head,
      '-m',
      'Unrelated local ref',
    )
    await fixture.git('update-ref', 'refs/heads/unrelated', other)
    expect(
      await reuseStage(
        fixture.locations,
        'local-one',
        'org/member/device',
        'reservation-one',
        signal(),
      ),
    ).toEqual(stage)
    expect(
      await reuseStage(
        fixture.locations,
        'local-one',
        'another-account',
        'reservation-one',
        signal(),
      ),
    ).toBe(null)
    expect(
      await reuseStage(
        fixture.locations,
        'local-one',
        'org/member/device',
        'another-reservation',
        signal(),
      ),
    ).toBe(null)
    const part = entries.find((entry) => entry.kind === 'part')
    if (!part || part.kind !== 'part')
      throw new Error('Expected a package part.')
    const before = await readStagePart(
      fixture.locations,
      stage.id,
      part.part,
      signal(),
    )
    expect(reused?.snapshot.sourceFingerprint).toBe(
      stage.snapshot.sourceFingerprint,
    )
    expect(
      await readStagePart(fixture.locations, stage.id, part.part, signal()),
    ).toEqual(before)
    await expect(
      readStagePart(
        fixture.locations,
        stage.id,
        { ...part.part, sizeBytes: part.part.sizeBytes + 1 },
        signal(),
      ),
    ).rejects.toMatchObject({ code: 'read_failed' })
    await writeFile(
      await stagedPartPath(fixture.locations, stage, part.part),
      'tampered',
    )
    await expect(
      readStagePart(fixture.locations, stage.id, part.part, signal()),
    ).rejects.toMatchObject({ code: 'read_failed' })
    const db = new DatabaseSync(fixture.database)
    expect(
      await reuseStage(
        fixture.locations,
        'local-one',
        'org/member/device',
        'reservation-one',
        signal(),
      ),
    ).toBe(null)
    db.exec("UPDATE workspaces SET workspace_name = 'Changed metadata'")
    db.close()
    expect(
      await reuseStage(
        fixture.locations,
        'local-one',
        'org/member/device',
        'reservation-one',
        signal(),
      ),
    ).toBe(null)
    await expect(
      buildStage(fixture.locations, stage.id, facts(), [], signal()),
    ).rejects.toMatchObject({ code: 'read_failed' })
  } finally {
    await fixture.dispose()
  }
})

it('keeps the selected file and native bytes after the source changes', async () => {
  const fixture = await packageFixture()
  try {
    await fixture.write('tracked.txt', 'selected file\n')
    const original = claudeMemory()
    const native = await fixture.native(
      '.claude/projects/example/native-one.jsonl',
      original,
    )
    fixture.session(
      'old-claude',
      'native-one',
      'claude',
      'Selected conversation',
    )
    const prepared = await prepareStage(
      fixture.locations,
      'local-one',
      'org/member/device',
      'reservation-one',
      signal(),
    )
    await fixture.write('tracked.txt', 'later file\n')
    await writeFile(
      native,
      original.replace('Original answer.', 'Later answer.'),
    )
    const built = await buildStage(
      fixture.locations,
      prepared.id,
      facts(),
      [],
      signal(),
    )
    const stage = await sealStage(fixture.locations, built.id, [], signal())
    const entries = await manifest(fixture.locations, stage)
    const file = entries.find(
      (entry) => entry.kind === 'file' && entry.path === 'tracked.txt',
    )
    const session = entries.find((entry) => entry.kind === 'session')
    if (!file || file.kind !== 'file' || !session || session.kind !== 'session')
      throw new Error('Expected the selected content.')
    expect(
      (
        await content(fixture.locations, stage, entries, file.objectId)
      ).toString(),
    ).toBe('selected file\n')
    expect(
      (
        await content(fixture.locations, stage, entries, session.memoryObjectId)
      ).toString(),
    ).toBe(original)
    expect(
      (
        await content(
          fixture.locations,
          stage,
          entries,
          session.documentObjectId,
        )
      ).toString(),
    ).toContain('Original answer.')
    expect(
      await reuseStage(
        fixture.locations,
        'local-one',
        'org/member/device',
        'reservation-one',
        signal(),
      ),
    ).toBe(null)
  } finally {
    await fixture.dispose()
  }
})

it('rejects a source edit during selected capture before it publishes an inventory', async () => {
  const fixture = await packageFixture()
  const originalRead = safeFiles.readSourceFile
  let changed = false
  const reader = vi
    .spyOn(safeFiles, 'readSourceFile')
    .mockImplementation(async (path, abort, destination, identity) => {
      const result = await originalRead(path, abort, destination, identity)
      if (
        !changed &&
        destination &&
        path === join(fixture.workspace, 'tracked.txt')
      ) {
        changed = true
        await writeFile(path, 'changed during selection\n')
      }
      return result
    })
  try {
    await fixture.write('tracked.txt', 'before selection\n')
    await expect(
      prepareStage(
        fixture.locations,
        'local-one',
        'org/member/device',
        'reservation-one',
        signal(),
      ),
    ).rejects.toMatchObject({ code: 'source_changed' })
    expect(changed).toBe(true)
    expect(
      await reuseStage(
        fixture.locations,
        'local-one',
        'org/member/device',
        'reservation-one',
        signal(),
      ),
    ).toBe(null)
  } finally {
    reader.mockRestore()
    await fixture.dispose()
  }
})
