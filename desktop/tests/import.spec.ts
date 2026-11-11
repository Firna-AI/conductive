import { _electron, expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { importFixture, sourceHashes } from './import-fixture.ts'
import { importThroughMain } from './import-main.ts'

test('imports a selected source through the main device session and worker, then explicitly retries its immutable package', async () => {
  const fixture = await importFixture()
  const packaged = process.env.CONDUCTIVE_PACKAGED_APP
  const electron = await _electron.launch({
    ...(packaged ? { executablePath: packaged } : {}),
    args: [
      ...(packaged ? [] : ['.']),
      `--user-data-dir=${fixture.locations.userData}`,
    ],
    cwd: resolve(import.meta.dirname, '..'),
  })
  try {
    const before = await sourceHashes(fixture.locations.home)
    const result = await importThroughMain(electron, fixture.locations)
    expect(result.failure).toBeNull()
    expect(result.warnings).toBe(0)
    expect(result.prompts).toBe(1)
    expect(result.automaticFrames).toBe(0)
    expect(result.fingerprints).toHaveLength(2)
    expect(result.fingerprints[1]).toBe(result.fingerprints[0])
    expect(result.cursorZero).toBe(true)
    expect(result.storedParts).toBe(result.declaredParts)
    expect(result.storedParts).toBeGreaterThan(0)
    expect(result.snapshot?.gitDisk.reconstruction.objectCount).toBeGreaterThan(
      0,
    )
    expect(result.files).toContainEqual({ kind: 'delete', path: 'deleted.txt' })
    expect(result.files).toContainEqual({
      kind: 'symlink',
      path: 'link',
      target: '../outside-never-read',
    })
    expect(result.files).toContainEqual({
      kind: 'directory',
      path: '.context/empty',
      mode: 493,
    })
    expect(result.native).toHaveLength(2)
    expect(result.omittedSessions).toEqual([
      { title: 'Missing native session' },
    ])
    expect(result.scanRows.map((row) => row.localWorkspaceId)).toEqual([
      'local-workspace',
    ])
    expect(await sourceHashes(fixture.locations.home)).toEqual(before)
  } finally {
    await electron.close()
    await fixture.dispose()
  }
})
