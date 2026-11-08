import { afterEach, expect, test, vi } from 'vitest'
import {
  workspacePath,
  workspacePaths,
  type WorkspaceState,
} from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { createApiClient } from '../api/client'
import { readOrderedWorkspaceResponse } from '../api/read-workspaces'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'
import { workspaceRoutes } from './workspace-routes'

const orgId = FAKE_IDS.org
const workspaceId = FAKE_IDS.workspace
const path = workspacePath(orgId, workspaceId)
const owner = {
  id: 'cal',
  githubLogin: 'calummoore',
  displayName: 'Cal',
  avatarUrl: null,
}

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

function setup(state: WorkspaceState) {
  const server = new FakeApiServer()
  const backend = createBackend(
    seedState(readDevOptions(`?workspace=${state}`)),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'unused',
  )
  for (let number = 1; number <= 7; number += 1) {
    backend.emit(workspaceId, {
      type: 'workspace.title',
      name: 'Recorded workspace name',
    })
  }
  const api = createApiClient(
    routeFetch(
      workspaceRoutes(backend),
      (requestPath) => guardScope(backend.state, requestPath),
      server.fetch,
    ),
  )
  return { api, backend }
}

test('development detail reads include the current event number for the ordered reader', async () => {
  const { api, backend } = setup('ready')
  const { detail } = workspaceFixtures()
  const workspace = { ...detail.workspace, owner }
  await expect(api.get(path, readOrderedWorkspaceResponse)).resolves.toEqual({
    ...detail,
    workspace,
    eventNumber: 7,
  })
  backend.emit(workspaceId, {
    type: 'workspace.title',
    name: 'Recorded workspace name',
  })
  await expect(api.get(path, readOrderedWorkspaceResponse)).resolves.toEqual({
    ...detail,
    workspace,
    eventNumber: 8,
  })
})

test('development Resume includes its starting event number for the ordered reader', async () => {
  vi.useFakeTimers()
  const { api } = setup('stopped')
  await expect(
    api.send(
      'POST',
      workspacePaths.resume(orgId, workspaceId),
      {},
      readOrderedWorkspaceResponse,
    ),
  ).resolves.toEqual({
    eventNumber: 8,
    workspace: {
      ...workspaceFixtures('stopped').detail.workspace,
      owner,
      state: 'starting',
      updatedAt: FAKE_TIME,
    },
    start: {
      kind: 'resume',
      startedAt: FAKE_TIME,
      steps: [
        {
          id: 'restore',
          label: 'Resuming with your files as you left them',
          state: 'running',
          startedAt: FAKE_TIME,
          completedAt: null,
        },
      ],
    },
    error: null,
  })
})
