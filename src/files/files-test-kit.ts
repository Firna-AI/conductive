import { expect, vi } from 'vitest'
import type { WorkspaceEventEnvelope } from '../shared/events'
import type { FileEvent } from '../shared/files'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { createFilesClient, type FetchLike } from './api/files-client'
import { WorkspaceFiles, type FilesSubscribe } from './model/files-store'
import type { FilesNavigation, FilesTarget } from './navigation'

/** Test kit of the Files screens. Tests only. */

export function clientFor(fetch: FetchLike) {
  return createFilesClient({
    fetch,
    orgId: FAKE_IDS.org,
    workspaceId: FAKE_IDS.workspace,
  })
}

export function filesFor(
  server: FakeApiServer,
  subscribe: FilesSubscribe = (after, listener) =>
    server.events.subscribe(after, listener),
  fetch: FetchLike = server.fetch,
): WorkspaceFiles {
  return new WorkspaceFiles({ client: clientFor(fetch), subscribe })
}

/** Starts the store and waits until both routes have answered. */
export async function startFiles(files: WorkspaceFiles): Promise<void> {
  files.start()
  await waitUntil(() => {
    const snapshot = files.getSnapshot()
    expect(snapshot.tree ?? snapshot.treeError).not.toBeNull()
    expect(snapshot.changes ?? snapshot.changesError).not.toBeNull()
  })
}

/** The hang guard of a test that polls: twice the polling deadline. */
export const slow = { timeout: 20_000 }

/** Polls an expectation, with a deadline that only stops a hung test. */
export function waitUntil(check: () => void): Promise<void> {
  return vi.waitFor(check, { timeout: 10_000, interval: 5 })
}

/** The next live envelope of the fake workspace stream. */
export function envelopeAfter(
  server: FakeApiServer,
  event: FileEvent,
  skip = 0,
): WorkspaceEventEnvelope {
  const eventNumber = server.events.history().throughEventNumber + 1 + skip
  return {
    workspaceId: FAKE_IDS.workspace,
    eventNumber,
    occurredAt: FAKE_TIME + eventNumber,
    event,
  }
}

/** Addresses that name their target, and the targets of the clicks. */
export function testNavigation(): FilesNavigation & { visited: FilesTarget[] } {
  const visited: FilesTarget[] = []
  return {
    visited,
    href: (target) =>
      target.kind === 'list'
        ? `/list/${target.list}`
        : target.kind === 'file'
          ? `/file/${target.mode}/${target.path}`
          : `/diff/${target.path}`,
    navigate: (target) => visited.push(target),
  }
}

/** A promise that the test settles by hand, to order replies. */
export function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
