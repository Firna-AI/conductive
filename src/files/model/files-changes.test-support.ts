import { onTestFinished } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import type {
  WorkspaceEvent,
  WorkspaceSocketMessage,
} from '../../shared/events'
import { filePaths } from '../../shared/files'
import type { BranchChangedFile } from '../../shared/generated/BranchChangedFile'
import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { ChangesDelta } from '../../shared/generated/ChangesDelta'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { nextEnvelope } from '../../test-support/recorded-repairs'
import { observeFileReads } from '../files-test-kit'

const { org, workspace: id } = FAKE_IDS
export const changesPath = filePaths.changes(org, id)
export const zero = { files: 0, added: 0, removed: 0 }

export function row(path: string): BranchChangedFile {
  return { path, change: 'modified', uncommitted: true, added: 1, removed: 0 }
}

export function delta(revision: number, fields: Partial<ChangesDelta> = {}) {
  return {
    type: 'changes.changed',
    delta: {
      revision,
      baseBranch: 'main',
      summary: zero,
      omitted: zero,
      removes: [],
      upserts: [],
      ...fields,
    },
  } satisfies WorkspaceEvent
}

export async function startChanges(initial: BrowserChangesResponse) {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  let receive: (message: WorkspaceSocketMessage) => void = () => {}
  const reads = observeFileReads((cursor, listener) => {
    receive = listener
    return server.events.subscribe(cursor, listener, id)
  }, held.fetch)

  function stateRead(eventNumber: number) {
    return { eventNumber, repositoryId: null, failure: null }
  }

  function reply(
    list: BrowserChangesResponse,
    eventNumber = server.events.last(id),
  ) {
    server.json('GET', changesPath, {
      ...list,
      stateRead: stateRead(eventNumber),
    })
  }

  function unavailable(eventNumber?: number) {
    server.json(
      'GET',
      changesPath,
      {
        error: { code: 'file_unavailable' },
        stateRead:
          eventNumber === undefined ? undefined : stateRead(eventNumber),
      },
      503,
    )
  }

  function emit(event: WorkspaceEvent) {
    const envelope = nextEnvelope(server.events, event, FAKE_TIME)
    server.events.emit(envelope)
  }

  function replay() {
    receive({
      type: 'history',
      history: server.events.history(server.events.last(id), id),
    })
  }

  onTestFinished(() => {
    reads.files.stop()
    held.release('GET', changesPath)
    held.release('GET', changesPath)
  })
  reply(initial)
  reads.files.start()
  await Promise.all([reads.tree[0], reads.changes[0]])
  return {
    ...reads,
    emit,
    held,
    reply,
    unavailable,
    replay,
    nextNumber: () => server.events.last(id) + 1,
  }
}
