import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { readStagePart, readStageResults } from './stage.ts'
import {
  content,
  manifest,
  packageFixture,
  packageSelection,
  signal,
} from './package-test-support.ts'

it('includes the 100 MiB boundary, omits larger work files and makes independent bounded parts', async () => {
  const fixture = await packageFixture()
  try {
    for (const [path, size] of [
      ['boundary.bin', 104857600],
      ['too-large.bin', 104857601],
      ['.context/too-large.bin', 104857601],
    ] as const) {
      const file = await open(await fixture.write(path, ''), 'r+')
      await file.truncate(size)
      await file.close()
    }
    await fixture.write('empty.txt', '')
    const stage = await packageSelection(fixture.locations)
    const entries = await manifest(fixture.locations, stage)
    const boundary = entries.find(
      (entry) => entry.kind === 'file' && entry.path === 'boundary.bin',
    )
    const empty = entries.find(
      (entry) => entry.kind === 'file' && entry.path === 'empty.txt',
    )
    expect(boundary?.kind).toBe('file')
    if (
      !boundary ||
      boundary.kind !== 'file' ||
      !empty ||
      empty.kind !== 'file'
    )
      throw new Error('Expected the included work files.')
    expect(
      entries
        .filter((entry) => entry.kind === 'file')
        .map((entry) => entry.path),
    ).toEqual(['boundary.bin', 'empty.txt'])
    expect(
      entries.find(
        (entry) => entry.kind === 'object' && entry.id === boundary.objectId,
      ),
    ).toMatchObject({
      sizeBytes: 104857600,
      restoredBytes: 104857600,
      partCount: 105,
    })
    const parts = entries
      .filter((entry) => entry.kind === 'part')
      .filter((entry) => entry.objectId === boundary.objectId)
    expect(parts.map((entry) => entry.index)).toEqual(
      Array.from({ length: 105 }, (_, index) => index),
    )
    expect(parts.map((entry) => entry.part.sizeBytes)).toEqual([
      ...Array<number>(104).fill(1000000),
      857600,
    ])
    for (const part of [parts[0], parts[104]]) {
      if (!part) throw new Error('Expected boundary parts.')
      const bytes = await readStagePart(
        fixture.locations,
        stage.id,
        part.part,
        signal(),
      )
      expect(bytes).toEqual(new Uint8Array(part.part.sizeBytes))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        part.part.sha256,
      )
    }
    expect(
      await content(fixture.locations, stage, entries, empty.objectId),
    ).toEqual(Buffer.alloc(0))
    expect(
      await readStageResults(fixture.locations, stage.id, signal()),
    ).toEqual({
      files: [
        { path: '.context/too-large.bin', sizeBytes: 104857601 },
        { path: 'too-large.bin', sizeBytes: 104857601 },
      ],
      sessions: [],
    })
    expect(stage.snapshot.partCount).toBe(107)
  } finally {
    await fixture.dispose()
  }
})
