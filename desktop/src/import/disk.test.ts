import { symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import * as gitCommands from './git.ts'
import { buildStage, prepareStage, readStagePage, sealStage } from './stage.ts'
import {
  facts,
  divergedSource,
  manifest,
  packageFixture,
  packageSelection,
  signal,
} from './package-test-support.ts'

it('measures canonical bundle objects and counts every HEAD path with distinct LFS payloads', async () => {
  const fixture = await packageFixture(false)
  try {
    const pointer = `version https://git-lfs.github.com/spec/v1\noid sha256:${'1'.repeat(64)}\nsize 123\n`
    await fixture.write('a.txt', 'same\n')
    await fixture.write('dir/b.txt', 'same\n')
    await fixture.write('lfs1', pointer)
    await fixture.write('dir/lfs2', pointer)
    await symlink('dir/b.txt', join(fixture.workspace, 'link'))
    await fixture.commit('base')
    const stage = await packageSelection(fixture.locations)
    expect(stage.snapshot.gitDisk).toEqual({
      version: 1,
      treeOid: await fixture.git('rev-parse', 'HEAD^{tree}'),
      reconstruction: {
        objectCount: 6,
        inflatedBytes: 515,
        maxObjectBytes: 181,
      },
      checkout: {
        fileCount: 4,
        fileBytes: 266,
        directoryCount: 1,
        symlinkCount: 1,
        symlinkBytes: 9,
        pathBytes: 33,
      },
      lfs: {
        cacheObjectCount: 1,
        cacheBytes: 123,
        checkoutPathCount: 2,
        checkoutBytes: 246,
      },
    })
  } finally {
    await fixture.dispose()
  }
})

it('rebuilds unproven exclusions and seals only the exact final prerequisite set', async () => {
  const fixture = await packageFixture()
  try {
    const root = await fixture.git('rev-parse', 'HEAD')
    await fixture.write('tracked.txt', 'next committed\n')
    await fixture.commit('next')
    const tree = await fixture.git('rev-parse', 'HEAD^{tree}')
    const first = await fixture.git('commit-tree', tree, '-p', root, '-m', 'A1')
    const base = await fixture.git('commit-tree', tree, '-p', first, '-m', 'A2')
    const sideRoot = await fixture.git(
      'commit-tree',
      tree,
      '-p',
      root,
      '-m',
      'T0',
    )
    const sideFirst = await fixture.git(
      'commit-tree',
      tree,
      '-p',
      first,
      '-m',
      'T1',
    )
    const head = await fixture.git(
      'commit-tree',
      tree,
      '-p',
      base,
      '-p',
      sideRoot,
      '-p',
      sideFirst,
      '-m',
      'Head',
    )
    await fixture.git('update-ref', 'refs/heads/work', head)
    const prepared = await prepareStage(
      fixture.locations,
      'local-one',
      'scope',
      'reservation',
      signal(),
    )
    const incremental = await buildStage(
      fixture.locations,
      prepared.id,
      facts(base),
      undefined,
      signal(),
    )
    expect(incremental.candidates).toEqual([base])
    const runGit = gitCommands.git
    const unproven = vi
      .spyOn(gitCommands, 'git')
      .mockImplementation((directory, args, abort, input) =>
        args[0] === 'merge-base'
          ? Promise.resolve('')
          : runGit(directory, args, abort, input),
      )
    const fallback = await (async () => {
      try {
        return await buildStage(
          fixture.locations,
          prepared.id,
          facts(base),
          undefined,
          signal(),
        )
      } finally {
        unproven.mockRestore()
      }
    })()
    expect(fallback.candidates).toEqual([])
    expect(fallback.snapshot.bundleObjectId).not.toBe(null)
    const full = await buildStage(
      fixture.locations,
      prepared.id,
      facts(base),
      [],
      signal(),
    )
    expect(full.candidates).toEqual([])
    expect(full.snapshot.sourceFingerprint).not.toBe(
      incremental.snapshot.sourceFingerprint,
    )
    expect(full.snapshot.gitDisk.checkout).toEqual(
      incremental.snapshot.gitDisk.checkout,
    )
    expect(full.snapshot.gitDisk.reconstruction).toEqual(
      fallback.snapshot.gitDisk.reconstruction,
    )
    await expect(
      sealStage(
        fixture.locations,
        prepared.id,
        [{ kind: 'prerequisite', oid: base, receiptId: 'stale-receipt' }],
        signal(),
      ),
    ).rejects.toMatchObject({ code: 'read_failed' })
    const sealed = await sealStage(fixture.locations, prepared.id, [], signal())
    expect(
      (await manifest(fixture.locations, sealed)).filter(
        (entry) => entry.kind === 'prerequisite',
      ),
    ).toEqual([])
    const next = await prepareStage(
      fixture.locations,
      'local-one',
      'scope',
      'another-reservation',
      signal(),
    )
    const noBundle = await buildStage(
      fixture.locations,
      next.id,
      { ...facts(head), defaultHeadOid: base },
      undefined,
      signal(),
    )
    expect(noBundle.candidates).toEqual([base, head].sort())
    expect(noBundle.snapshot.bundleObjectId).toBe(null)
    expect(noBundle.snapshot.gitDisk.reconstruction).toEqual({
      objectCount: 0,
      inflatedBytes: 0,
      maxObjectBytes: 0,
    })
    const proven = await sealStage(
      fixture.locations,
      next.id,
      [
        { kind: 'prerequisite', oid: base, receiptId: 'base-receipt' },
        { kind: 'prerequisite', oid: head, receiptId: 'head-receipt' },
      ],
      signal(),
    )
    expect(
      await readStagePage(fixture.locations, proven.id, 0, signal()),
    ).toEqual(
      [
        { kind: 'prerequisite', oid: base, receiptId: 'base-receipt' },
        { kind: 'prerequisite', oid: head, receiptId: 'head-receipt' },
      ].sort((left, right) => left.oid.localeCompare(right.oid)),
    )
    expect(proven.snapshot.recordCount).toBe(2)
    expect(proven.snapshot.sourceFingerprint).toBe(
      noBundle.snapshot.sourceFingerprint,
    )
    const diverged = await divergedSource(fixture, base)
    const shared = await prepareStage(
      fixture.locations,
      'local-one',
      'scope',
      'diverged-reservation',
      signal(),
    )
    const advancedFacts = { ...facts(), defaultHeadOid: diverged.remoteHead }
    const suggested = await buildStage(
      fixture.locations,
      shared.id,
      advancedFacts,
      undefined,
      signal(),
    )
    expect(suggested.candidates).toEqual([base, diverged.localHead].sort())
    expect(suggested.snapshot.bundleObjectId).toBe(null)
    const retained = await buildStage(
      fixture.locations,
      shared.id,
      advancedFacts,
      [base],
      signal(),
    )
    expect(retained.candidates).toEqual([base])
    expect(retained.headOid).toBe(diverged.localHead)
    expect(retained.snapshot.bundleObjectId).not.toBe(null)
    expect(retained.snapshot.gitDisk.treeOid).toBe(diverged.tree)
    const complete = await buildStage(
      fixture.locations,
      shared.id,
      advancedFacts,
      [],
      signal(),
    )
    expect(retained.snapshot.gitDisk.reconstruction.objectCount).toBeLessThan(
      complete.snapshot.gitDisk.reconstruction.objectCount,
    )
    expect(retained.snapshot.storedBytes).toBeLessThan(
      complete.snapshot.storedBytes,
    )
  } finally {
    await fixture.dispose()
  }
})
