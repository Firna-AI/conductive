import { expect } from 'vitest'

interface CommitBoundaryFixture {
  failNextCommit(boundary: 'before' | 'after', message: string): Promise<void>
  clearFaults(): Promise<void>
  action(error: string): Promise<void>
  read(): Promise<unknown>
  restart(): void | Promise<void>
  before: unknown
  after: unknown
  unpublished?(): void | Promise<void>
  verify?: { rejected(): Promise<void>; committed(): Promise<void> }
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
    await fixture.failNextCommit(
      boundary === 'rejected' ? 'before' : 'after',
      error,
    )
    await fixture.action(error)
    await fixture.clearFaults()
    await fixture.unpublished?.()
    await fixture.restart()
    expect(await fixture.read()).toEqual(
      boundary === 'rejected' ? fixture.before : fixture.after,
    )
    await fixture.verify?.[boundary]()
  }
}
