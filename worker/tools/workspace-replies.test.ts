import { expect, it } from 'vitest'

import {
  senderSnapshot,
  workspaceFixtures,
} from '../../src/test-support/fixtures/workspaces'
import { createdWorkspace } from './workspace-replies'

it('keeps optional archived computer evidence in tool create replies without rejecting older values', () => {
  const { created } = workspaceFixtures()
  const fields = {
    workspace: {
      ...created.workspace,
      owner: senderSnapshot(created.workspace.owner),
      state: 'archived',
      archivedAt: 1_800_000_000_000,
      restoreUntil: null,
    },
    sessionId: created.sessionId,
    sessionLink: 'https://app.conductive.test/session',
  }
  const archivedComputer = {
    state: 'deleted',
    restoreUntil: 1_801_209_600_000,
  }
  const current = {
    ...fields,
    workspace: { ...fields.workspace, archivedComputer },
  }
  expect(createdWorkspace(current)).toEqual(current)
  for (const optional of [undefined, null, { state: 'future-state' }])
    expect(
      createdWorkspace({
        ...fields,
        workspace: { ...fields.workspace, archivedComputer: optional },
      }),
    ).toEqual(fields)
})
