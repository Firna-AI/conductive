import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { devSubscribe, emitDevEvent } from '../dev/devServer'
import { ToolStore } from './toolStore'

type Note = { type: 'note'; text: string }

/** Records the tool's own notes and each revoke, and ignores other events. */
function record(
  log: readonly string[],
  action: Note | WorkspaceEvent,
): readonly string[] {
  switch (action.type) {
    case 'note':
      return [...log, action.text]
    case 'preview.revoked':
      return [...log, `revoked ${action.previewId}`]
    default:
      return log
  }
}

function revoke(previewId: string): WorkspaceEvent {
  return { type: 'preview.revoked', previewId }
}

describe('ToolStore', () => {
  it('gives the reducer the events of its workspace in order, between its own actions, while it is connected', () => {
    const server = new FakeApiServer()
    // An event before the subscription arrives with the stored history.
    emitDevEvent(server, FAKE_IDS.workspace, revoke('preview-1'))
    const store = new ToolStore<readonly string[], Note>(
      { reducer: record, initialState: [] },
      { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace },
    )
    const changes = vi.fn()

    const unsubscribe = store.subscribe(changes)
    const stop = store.connect({
      fetch: server.fetch,
      subscribe: devSubscribe(server),
    })
    store.dispatch({ type: 'note', text: 'opened preview-2' })
    emitDevEvent(server, 'saved-carts', revoke('preview-2'))
    emitDevEvent(server, FAKE_IDS.workspace, revoke('preview-2'))
    const settled = store.getSnapshot()
    emitDevEvent(server, FAKE_IDS.workspace, {
      type: 'workspace.title',
      name: 'Address form',
    })
    stop()
    unsubscribe()
    emitDevEvent(server, FAKE_IDS.workspace, revoke('preview-3'))

    expect(store.getSnapshot()).toEqual([
      'revoked preview-1',
      'opened preview-2',
      'revoked preview-2',
    ])
    expect(store.getSnapshot()).toBe(settled)
    expect(changes).toHaveBeenCalledTimes(3)
  })
})
