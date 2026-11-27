import { expect, it } from 'vitest'
import { emptyChanges } from '../files-test-kit'
import {
  changesPath,
  delta,
  startChanges,
  zero,
} from './files-changes.test-support'

it('drops stale Changes after an unavailable read and retries at an empty replay', async () => {
  const { files, tree, changes, emit, replay, reply, unavailable } =
    await startChanges({ ...emptyChanges, revision: 1 })
  unavailable()
  emit(delta(3))
  await changes[1]

  const afterFailure = files.getSnapshot()
  const readsAfterFailure = changes.length
  const fresh = { ...emptyChanges, revision: 3, unpushedCommits: 2 }
  reply(fresh)
  replay()

  expect(changes).toHaveLength(3)
  await changes[2]
  expect(readsAfterFailure).toBe(2)
  expect(afterFailure.changes).toBeNull()
  expect(afterFailure.changesError).toEqual({
    kind: 'failed',
    status: 503,
    code: 'file_unavailable',
  })
  expect(files.getSnapshot().changes).toEqual(fresh)
  expect(files.getSnapshot().changesError).toBeNull()
  expect(tree).toHaveLength(1)
})

it('keeps an empty replay retry and its queued deltas when the active read fails', async () => {
  const {
    files,
    tree,
    changes,
    emit,
    held,
    replay,
    reply,
    unavailable,
    nextNumber,
  } = await startChanges({ ...emptyChanges, revision: 1 })
  unavailable()
  const cutoff = nextNumber()
  held.holdAnswer('GET', changesPath)
  emit(delta(3))
  emit(delta(4, { unpushedCommits: 4 }))

  replay()
  expect(changes).toHaveLength(2)
  reply({ ...emptyChanges, revision: 3 }, cutoff)
  held.holdAnswer('GET', changesPath)
  held.release('GET', changesPath)
  await changes[1]

  expect(changes).toHaveLength(3)
  expect(files.getSnapshot().changes).toBeNull()
  held.release('GET', changesPath)
  await changes[2]
  expect(files.getSnapshot().changes).toEqual({
    ...emptyChanges,
    revision: 4,
    unpushedCommits: 4,
    omitted: zero,
  })
  expect(changes).toHaveLength(3)
  expect(tree).toHaveLength(1)
})

it('ends Changes recovery when an unavailable read covers the queued deltas', async () => {
  const { files, changes, emit, unavailable, nextNumber } = await startChanges({
    ...emptyChanges,
    revision: 1,
  })
  const cutoff = nextNumber()
  unavailable(cutoff)
  emit(delta(3))
  const failed = await changes[1]

  expect(failed.stateRead?.eventNumber).toBe(cutoff)
  expect(files.getSnapshot().changes).toBeNull()
  expect(files.getSnapshot().changesError).toEqual({
    kind: 'failed',
    status: 503,
    code: 'file_unavailable',
  })
  emit({ type: 'files.unavailable' })
  expect(changes).toHaveLength(2)
})

it.each([
  { reason: 'a revision gap', revisions: [6] },
  {
    reason: 'queue eviction',
    revisions: Array.from({ length: 40 }, (_, index) => index + 5),
  },
])(
  'reads Changes again when $reason leaves the queued deltas incomplete',
  async ({ revisions }) => {
    const { files, changes, emit, held, reply, nextNumber } =
      await startChanges({ ...emptyChanges, revision: 2 })
    const saved = files.getSnapshot().changes
    reply({ ...emptyChanges, revision: 4 }, nextNumber())
    held.holdAnswer('GET', changesPath)
    emit(delta(4))
    for (const revision of revisions) emit(delta(revision))
    const fresh = {
      ...emptyChanges,
      revision: revisions.at(-1),
      unpushedCommits: 5,
    }
    reply(fresh)
    held.holdAnswer('GET', changesPath)

    expect(changes).toHaveLength(2)
    held.release('GET', changesPath)
    await changes[1]
    expect(files.getSnapshot().changes).toBe(saved)
    expect(changes).toHaveLength(3)
    held.release('GET', changesPath)
    await changes[2]
    expect(files.getSnapshot().changes).toEqual(fresh)
    expect(changes).toHaveLength(3)
  },
)
