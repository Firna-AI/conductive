import { beforeAll, expect, it } from 'vitest'

import { workspacePath, workspacesPath } from '../../src/shared/workspaces'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import { array } from '../chat/agent-events'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
} from '../chat/integration/outer-seed.test-support'
import { featureFixture } from '../features/fixture.test-support'
import { recordWorkspaceSoftwareUpdateFailed } from './workspace-software-data'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

it('keeps the stored software warning in projected reads, the workspace list, and repeated create replies', async () => {
  const fixture = await featureFixture(bundle, {
    configuration: {
      CONDUCTIVE_RUNNER_ARCHIVE_URL: OUTER_SOFTWARE.url,
      CONDUCTIVE_RUNNER_ARCHIVE_SHA256: OUTER_SOFTWARE.sha256,
    },
  })
  try {
    const create = () =>
      fixture.request(workspacesPath(OUTER_ORG), {
        method: 'POST',
        headers: { Cookie: fixture.cookies.memberCookie },
        body: JSON.stringify({
          repositoryId: OUTER_REPOSITORY,
          firstMessage: {
            id: 'software-warning-message',
            text: 'Keep the software warning',
            choice: CLAUDE,
            attachmentIds: [],
          },
        }),
      })
    const created = await create()
    expect(created.status).toBe(201)
    const admitted = record(await created.json())
    const id = string(record(admitted.workspace).id)
    await recordWorkspaceSoftwareUpdateFailed(
      fixture.env.DB,
      OUTER_ORG,
      id,
      true,
    )
    const read = await fixture.request(workspacePath(OUTER_ORG, id), {
      headers: { Cookie: fixture.cookies.memberCookie },
    })
    expect(read.status).toBe(200)
    expect(await read.json()).toMatchObject({
      workspace: { softwareUpdateFailed: true },
    })
    const list = await fixture.request(workspacesPath(OUTER_ORG), {
      headers: { Cookie: fixture.cookies.memberCookie },
    })
    expect(list.status).toBe(200)
    const listed = array(record(await list.json()).workspaces, record).find(
      (workspace) => workspace.id === id,
    )
    expect(listed).toMatchObject({ id, softwareUpdateFailed: true })
    const repeated = await create()
    expect(repeated.status).toBe(201)
    const replayed = await repeated.json()
    expect(replayed).toMatchObject({
      workspace: { softwareUpdateFailed: true },
    })
    expect(replayed).not.toHaveProperty('softwareUpdateFailed')
  } finally {
    await fixture.dispose()
  }
})
