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
import { seedPublishedImage } from './published-image-test-support'
import {
  recordWorkspaceInstallScriptRevision,
  recordWorkspaceSoftwareUpdateFailed,
} from './workspace-software-data'

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

it('reports the current image install script in workspace reads, lists, and repeated creates', async () => {
  const fixture = await featureFixture(bundle, {
    configuration: {
      CONDUCTIVE_RUNNER_ARCHIVE_URL: OUTER_SOFTWARE.url,
      CONDUCTIVE_RUNNER_ARCHIVE_SHA256: OUTER_SOFTWARE.sha256,
    },
  })
  try {
    const db = fixture.env.DB
    const headers = { Cookie: fixture.cookies.memberCookie }
    const create = () =>
      fixture.request(workspacesPath(OUTER_ORG), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          repositoryId: OUTER_REPOSITORY,
          firstMessage: {
            id: 'install-script-message',
            text: 'Compare the installed setup',
            choice: CLAUDE,
            attachmentIds: [],
          },
        }),
      })
    const created = await create()
    expect(created.status).toBe(201)
    const admitted = record(await created.json())
    const id = string(record(admitted.workspace).id)
    expect(admitted).toMatchObject({
      workspace: { installScriptChanged: false },
    })

    async function expectReport(changed: boolean) {
      const read = await fixture.request(workspacePath(OUTER_ORG, id), {
        headers,
      })
      expect(read.status).toBe(200)
      expect(await read.json()).toMatchObject({
        workspace: { installScriptChanged: changed },
      })
      const list = await fixture.request(workspacesPath(OUTER_ORG), {
        headers,
      })
      expect(list.status).toBe(200)
      const listed = array(record(await list.json()).workspaces, record)
      expect(listed.find((workspace) => workspace.id === id)).toMatchObject({
        installScriptChanged: changed,
      })
      const repeated = await create()
      expect(repeated.status).toBe(201)
      const replayed = await repeated.json()
      expect(replayed).toMatchObject({
        workspace: { installScriptChanged: changed },
      })
      expect(replayed).not.toHaveProperty('installScriptChanged')
    }

    await seedPublishedImage(db, {
      orgId: OUTER_ORG,
      buildId: 'changed-script-build',
      imageName: 'changed-script-image',
      repositories: [],
      software: OUTER_SOFTWARE,
      now: 2,
    })
    await db
      .prepare(
        `UPDATE image_builds SET install_script_revision = 'current-script'
         WHERE id = 'changed-script-build'`,
      )
      .run()
    await expectReport(true)
    await recordWorkspaceInstallScriptRevision(db, OUTER_ORG, id, 'old-script')
    await expectReport(true)
    await recordWorkspaceInstallScriptRevision(
      db,
      OUTER_ORG,
      id,
      'current-script',
    )
    await expectReport(false)

    await seedPublishedImage(db, {
      orgId: OUTER_ORG,
      buildId: 'same-script-refresh',
      imageName: 'same-script-image',
      repositories: [],
      software: OUTER_SOFTWARE,
      now: 3,
    })
    await db
      .prepare(
        `UPDATE image_builds SET kind = 'refresh', install_script_revision = 'current-script'
         WHERE id = 'same-script-refresh'`,
      )
      .run()
    await seedPublishedImage(db, {
      orgId: OUTER_ORG,
      buildId: 'other-account-build',
      imageName: 'other-account-image',
      providerAccount: 'other-account',
      repositories: [],
      software: OUTER_SOFTWARE,
      now: 4,
    })
    await db
      .prepare(
        `UPDATE image_builds SET install_script_revision = 'other-script'
         WHERE id = 'other-account-build'`,
      )
      .run()
    await expectReport(false)
    await db
      .prepare('DELETE FROM org_images WHERE org_id = ?')
      .bind(OUTER_ORG)
      .run()
    await expectReport(false)
  } finally {
    await fixture.dispose()
  }
})
