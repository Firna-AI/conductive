import { expect } from 'vitest'

import type { MemoryChatStorage } from './memory-storage.test-support'

interface CommitBoundaryFixture {
  storage: MemoryChatStorage
  action(error: string): Promise<void>
  read(): Promise<unknown>
  restart(): void | Promise<void>
  before: unknown
  after: unknown
  unpublished?(): void | Promise<void>
  verify?: {
    rejected(): Promise<void>
    committed(): Promise<void>
  }
}

/** Each action must preserve its whole receipt on both sides of a crash. */
export async function checkCommitBoundaries(
  prepare: () => Promise<CommitBoundaryFixture>,
): Promise<void> {
  for (const boundary of ['rejected', 'committed'] as const) {
    const fixture = await prepare()
    expect(await fixture.read()).toEqual(fixture.before)
    const error =
      boundary === 'rejected'
        ? 'Injected storage failure'
        : 'Injected post-commit crash'
    if (boundary === 'rejected') {
      fixture.storage.beforeCommit = async () => {
        fixture.storage.beforeCommit = null
        throw new Error(error)
      }
    } else fixture.storage.crashAfterCommit = true
    await fixture.action(error)
    fixture.storage.beforeCommit = null
    fixture.storage.crashAfterCommit = false
    await fixture.unpublished?.()
    await fixture.restart()
    expect(await fixture.read()).toEqual(
      boundary === 'rejected' ? fixture.before : fixture.after,
    )
    await fixture.verify?.[boundary]()
  }
}
