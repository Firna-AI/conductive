import { expect } from 'vitest'

import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import { workspacesPath } from '../../src/shared/workspaces'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
} from '../chat/integration/outer-seed.test-support'
import { featureState, type FeatureFixture } from './fixture.test-support'

export const RETAINED_CONFIGURATION = {
  CONDUCTIVE_RUNNER_ARCHIVE_URL: OUTER_SOFTWARE.url,
  CONDUCTIVE_RUNNER_ARCHIVE_SHA256: OUTER_SOFTWARE.sha256,
}

export async function admitRetainedCreation(active: FeatureFixture) {
  const created = await active.request(workspacesPath(OUTER_ORG), {
    method: 'POST',
    headers: { Cookie: active.cookies.memberCookie },
    body: JSON.stringify({
      repositoryId: OUTER_REPOSITORY,
      firstMessage: {
        id: 'allocated-create-message',
        text: 'Keep this after allocation',
        choice: CLAUDE,
        attachmentIds: [],
      },
    }),
  })
  expect(created.status).toBe(201)
  const response = record(await created.json())
  return {
    id: string(record(response.workspace).id),
    sessionId: string(response.sessionId),
    branch: string(record(response.workspace).branch),
  }
}

export async function retainedCreationJob(active: FeatureFixture, id: string) {
  return record(
    featureState(await active.actor(id).inspectFeatureState()).get(
      'lifecycle:start-job',
    ),
  )
}

export async function advanceRetainedCreation(
  active: FeatureFixture,
  id: string,
  phase: 'ready' | 'fetch' | 'branch' | 'startup',
) {
  let job = await retainedCreationJob(active, id)
  while (job.phase !== phase) {
    await active.actor(id).advanceStartAlarm()
    job = await retainedCreationJob(active, id)
  }
  return job
}

export async function deleteAndRestoreCreation(active: FeatureFixture) {
  expect(
    (
      await active.request(deleteOrgPath(OUTER_ORG), {
        method: 'POST',
        body: JSON.stringify({ name: 'Chat org' }),
      })
    ).status,
  ).toBe(200)
  expect(
    (
      await active.request(restoreOrgPath(OUTER_ORG), {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(200)
}
