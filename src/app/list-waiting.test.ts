import { describe, expect, test } from 'vitest'
import type { Workspace } from '../shared/generated/Workspace'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { workspaceUpdated, type ListData } from './list-changes'

/** The list with the open workspace in `state`, and its listed answer. */
function listWith(
  state: Workspace['state'],
  messageWaiting: boolean | undefined,
) {
  const { workspaces, detail } = workspaceFixtures(state)
  const { workspace } = detail
  const listed: Workspace = {
    ...workspace,
    ...(messageWaiting !== undefined && { messageWaiting }),
  }
  const list: ListData = {
    ...workspaces,
    workspaces: workspaces.workspaces.map((item) =>
      item.id === FAKE_IDS.workspace ? listed : item,
    ),
    sections: [],
  }
  return { list, workspace }
}

function openRow(list: ListData): Workspace | undefined {
  return list.workspaces.find((item) => item.id === FAKE_IDS.workspace)
}

describe('the waiting message of a listed row', () => {
  test('stays while the row and the event record both start', () => {
    const { list, workspace } = listWith('starting', true)
    const next = workspaceUpdated({ ...workspace, state: 'starting' })(list)
    expect(openRow(next)?.messageWaiting).toBe(true)
  })

  test('goes when the event record no longer starts', () => {
    const { list, workspace } = listWith('starting', true)
    const next = workspaceUpdated({ ...workspace, state: 'working' })(list)
    expect(openRow(next)).not.toHaveProperty('messageWaiting')
  })

  test('never moves the mark of a later start', () => {
    const { list, workspace } = listWith('stopped', true)
    const next = workspaceUpdated({ ...workspace, state: 'starting' })(list)
    expect(openRow(next)).not.toHaveProperty('messageWaiting')
  })

  test('takes the answer of a newer record that carries one', () => {
    const { list, workspace } = listWith('starting', true)
    const next = workspaceUpdated({
      ...workspace,
      state: 'starting',
      messageWaiting: false,
    })(list)
    expect(openRow(next)?.messageWaiting).toBe(false)
  })
})
