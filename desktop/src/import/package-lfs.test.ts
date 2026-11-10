import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { chmod, mkdir, open, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import type { ImportLfsObject } from '../../../src/shared/conductor-import-lfs.ts'
import {
  buildStage,
  prepareStage,
  readStageLfsPage,
  readStageResults,
  recordStageLfsPage,
  sealStage,
} from './stage.ts'
import {
  content,
  facts,
  manifest,
  packageFixture,
  signal,
} from './package-test-support.ts'

it('omits only advertised unchanged LFS and retains local or changed payloads across proof rebuilds', async () => {
  const fixture = await packageFixture(false)
  try {
    const pointers = join(fixture.root, 'pointers')
    await mkdir(pointers)
    await fixture.git('config', 'filter.lfs.clean', `cat ${pointers}/%f`)
    await fixture.write('.gitattributes', '*.bin filter=lfs\n')
    const available: ImportLfsObject[] = []
    for (const [path, bytes] of [
      ['clean.bin', 'P'.repeat(123)],
      ['changed.bin', 'Q'.repeat(99)],
      ['mode.bin', 'R'.repeat(17)],
      ['large.bin', ''],
    ] as const) {
      const file = await fixture.write(path, bytes)
      if (path === 'large.bin') {
        const handle = await open(file, 'r+')
        await handle.truncate(104857601)
        await handle.close()
      }
      const hash = createHash('sha256')
      for await (const chunk of createReadStream(file)) hash.update(chunk)
      const oid = hash.digest('hex')
      if (path === 'clean.bin' || path === 'large.bin')
        available.push({
          oid,
          sizeBytes: path === 'large.bin' ? 104857601 : bytes.length,
        })
      await writeFile(
        join(pointers, path),
        `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${path === 'large.bin' ? 104857601 : bytes.length}\n`,
      )
      await utimes(
        file,
        new Date('2020-01-01T00:00:00Z'),
        new Date('2020-01-01T00:00:00Z'),
      )
    }
    const literal = `version https://git-lfs.github.com/spec/v1\noid sha256:${'f'.repeat(64)}\nsize 456\n`
    await fixture.write('literal.bin', literal)
    await writeFile(join(pointers, 'literal.bin'), literal)
    await utimes(
      join(fixture.workspace, 'literal.bin'),
      new Date('2020-01-01T00:00:00Z'),
      new Date('2020-01-01T00:00:00Z'),
    )
    const base = await fixture.commit('base')
    await fixture.write('local.bin', 'L'.repeat(23))
    await writeFile(
      join(pointers, 'local.bin'),
      `version https://git-lfs.github.com/spec/v1\noid sha256:${createHash('sha256').update('L'.repeat(23)).digest('hex')}\nsize 23\n`,
    )
    await utimes(
      join(fixture.workspace, 'local.bin'),
      new Date('2020-01-01T00:00:00Z'),
      new Date('2020-01-01T00:00:00Z'),
    )
    await fixture.commit('next')
    if (await fixture.git('status', '--porcelain'))
      throw new Error('The LFS source fixture must have a clean cached index.')
    await fixture.write('changed.bin', 'changed working payload')
    await chmod(join(fixture.workspace, 'mode.bin'), 0o755)
    const prepared = await prepareStage(
      fixture.locations,
      'local-one',
      'scope',
      'reservation',
      signal(),
    )
    const lfs = await readStageLfsPage(
      fixture.locations,
      prepared.id,
      0,
      signal(),
    )
    expect(
      lfs.objects
        .map((object) => object.sizeBytes)
        .sort((left, right) => left - right),
    ).toEqual([23, 123, 104857601])
    expect(lfs.nextCursor).toBe(null)
    const unadvertised = await buildStage(
      fixture.locations,
      prepared.id,
      facts(base),
      undefined,
      signal(),
    )
    expect(unadvertised.snapshot.objectCount).toBe(6)
    expect(
      await readStageResults(fixture.locations, prepared.id, signal()),
    ).toEqual({
      files: [{ path: 'large.bin', sizeBytes: 104857601 }],
      sessions: [],
    })
    await recordStageLfsPage(
      fixture.locations,
      prepared.id,
      'facts-one',
      0,
      available,
      signal(),
    )
    const prospective = await buildStage(
      fixture.locations,
      prepared.id,
      facts(base),
      undefined,
      signal(),
    )
    expect(prospective.candidates).toEqual([base])
    expect(prospective.snapshot.objectCount).toBe(5)
    expect(
      await readStageResults(fixture.locations, prepared.id, signal()),
    ).toEqual({ files: [], sessions: [] })
    const full = await buildStage(
      fixture.locations,
      prepared.id,
      facts(base),
      [],
      signal(),
    )
    expect(full.candidates).toEqual([])
    expect(full.snapshot.sourceFingerprint).not.toBe(
      prospective.snapshot.sourceFingerprint,
    )
    expect(full.snapshot.objectCount).toBe(5)
    expect(
      await readStageResults(fixture.locations, prepared.id, signal()),
    ).toEqual({ files: [], sessions: [] })
    const otherFacts = await buildStage(
      fixture.locations,
      prepared.id,
      { ...facts(base), id: 'different-facts' },
      [],
      signal(),
    )
    expect(otherFacts.snapshot.objectCount).toBe(6)
    const stage = await sealStage(
      fixture.locations,
      otherFacts.id,
      [],
      signal(),
    )
    const entries = await manifest(fixture.locations, stage)
    const files = entries.filter((entry) => entry.kind === 'file')
    expect(files.map((entry) => [entry.path, entry.mode])).toEqual([
      ['changed.bin', '100644'],
      ['clean.bin', '100644'],
      ['literal.bin', '100644'],
      ['local.bin', '100644'],
      ['mode.bin', '100755'],
    ])
    const local = files.find((entry) => entry.path === 'local.bin')
    const changed = files.find((entry) => entry.path === 'changed.bin')
    const literalFile = files.find((entry) => entry.path === 'literal.bin')
    if (!local || !changed || !literalFile)
      throw new Error('Expected the local working payloads.')
    expect(
      (
        await content(fixture.locations, stage, entries, local.objectId)
      ).toString(),
    ).toBe('LLLLLLLLLLLLLLLLLLLLLLL')
    expect(
      (
        await content(fixture.locations, stage, entries, changed.objectId)
      ).toString(),
    ).toBe('changed working payload')
    expect(
      (
        await content(fixture.locations, stage, entries, literalFile.objectId)
      ).toString(),
    ).toBe(literal)
    expect(
      await readStageResults(fixture.locations, prepared.id, signal()),
    ).toEqual({
      files: [{ path: 'large.bin', sizeBytes: 104857601 }],
      sessions: [],
    })
  } finally {
    await fixture.dispose()
  }
})
