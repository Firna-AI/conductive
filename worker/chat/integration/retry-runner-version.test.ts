import { afterEach, beforeAll, expect, it } from 'vitest'

import { readCreated } from '../../../src/app/api/read-workspaces'
import { workspacePaths, workspacesPath } from '../../../src/shared/workspaces'
import { seedPublishedImage } from '../../lifecycle/published-image-test-support'
import type { WorkspaceStartResult } from '../../lifecycle/start-types'
import { CLAUDE } from '../harness.test-support'
import type { Workspace } from './journey-entry.test-support'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
} from './outer-seed.test-support'
import {
  driveWorkspaceStart,
  prepareWorkspaceStart,
} from './workspace-start.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/journey-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('pins a replacement computer to its version 2 image after a failed first start', async () => {
  const active = (fixture = await createOuterRuntime(bundle))
  const created = readCreated(
    await (
      await active.request(workspacesPath(OUTER_ORG), {
        method: 'POST',
        body: JSON.stringify({
          repositoryId: OUTER_REPOSITORY,
          firstMessage: {
            id: 'version-retry',
            text: 'Check the code',
            choice: CLAUDE,
            attachmentIds: [],
          },
        }),
      })
    ).json(),
  )
  const id = created.workspace.id
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = bindings.WORKSPACES.getByName(id)
  active.boat.commandExitCode = 1
  expect(
    await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
      actor,
      actor.waitCreationLifecycle(),
    ),
  ).toMatchObject({ ok: false, error: { code: 'workspace_start_failed' } })
  await seedPublishedImage(active.env.DB, {
    orgId: OUTER_ORG,
    buildId: 'runner-2-build',
    imageName: 'runner-2-image',
    repositories: [
      {
        id: OUTER_REPOSITORY,
        orgId: OUTER_ORG,
        fullName: 'owner/repository',
        defaultBranch: 'main',
      },
    ],
    software: OUTER_SOFTWARE,
    now: Date.now(),
    runnerProtocolVersion: 2,
  })
  active.boat.commandExitCode = 0
  expect(
    (
      await active.request(workspacePaths.resume(OUTER_ORG, id), {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(200)
  await prepareWorkspaceStart(actor)
  expect(active.boat.starts).toHaveLength(2)
  expect(active.boat.starts[1]).toMatchObject({ from: 'runner-2-image' })
  expect(
    await active.env.DB.prepare(
      'SELECT runner_protocol_version FROM workspaces WHERE id = ?',
    )
      .bind(id)
      .first('runner_protocol_version'),
  ).toBe(2)
})
