import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { onTestFinished, vi } from 'vitest'

import { DiskStorage, type RunnerState } from '../src/state'
import { deferred } from './runtime'

export async function diskFixture(
  beforeRemove: () => Promise<void> = async () => {},
) {
  const directory = await mkdtemp(join(tmpdir(), 'conductive-state-'))
  const storage = new DiskStorage(join(directory, 'state.json'))
  const write = storage.write.bind(storage)
  const writes: RunnerState[] = []
  const pending = new Set<Promise<void>>()
  const releases = new Set<() => void>()
  let held: {
    matches: (value: RunnerState) => boolean
    arrived: (value: RunnerState) => void
    released: Promise<void>
  } | null = null
  vi.spyOn(storage, 'write').mockImplementation((value) => {
    const saving = (async () => {
      const snapshot = structuredClone(value)
      writes.push(snapshot)
      const hold = held
      if (hold?.matches(snapshot)) {
        held = null
        hold.arrived(snapshot)
        await hold.released
      }
      await write(value)
    })()
    pending.add(saving)
    void saving.finally(() => pending.delete(saving)).catch(() => {})
    return saving
  })
  onTestFinished(async () => {
    for (const release of releases) release()
    try {
      await beforeRemove()
      await Promise.allSettled(pending)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  return {
    storage,
    writes,
    holdNextWrite: (matches: (value: RunnerState) => boolean = () => true) => {
      const arrived = deferred<RunnerState>()
      const released = deferred<void>()
      const release = () => released.resolve()
      releases.add(release)
      held = { matches, arrived: arrived.resolve, released: released.promise }
      return { arrived: arrived.promise, release }
    },
  }
}
