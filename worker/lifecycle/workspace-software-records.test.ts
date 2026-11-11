import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { seedPublishedImage } from './published-image-test-support'
import {
  readWorkspaceImageRecords,
  recordWorkspaceInstallScriptRevision,
  recordWorkspaceSoftwareUpdateFailed,
  recordWorkspaceSoftwareVersion,
  workspaceInstallScriptDiffers,
  workspaceSoftwareIsOlder,
} from './workspace-software-data'

const fixtureForTest = setupBackendTests()

it('records the claimed image at first start even after a newer image publishes', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const db = runtime.env.DB
  await db
    .prepare(
      `UPDATE image_builds SET software_version = 'claimed-version',
     install_script_revision = 'claimed-script' WHERE id = 'published-image'`,
    )
    .run()
  const queued = fixture.nextQueued()
  const pending = createCompletedWorkspace(runtime, org.id, user, {
    repositoryId,
    firstMessage: FIRST_MESSAGE,
  })
  void pending.catch(() => {})
  const id = await queued
  await seedPublishedImage(db, {
    orgId: org.id,
    buildId: 'newer-build',
    imageName: 'newer-image',
    repositories: [
      {
        id: repositoryId,
        orgId: org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME + 1,
  })
  await db
    .prepare(
      `UPDATE image_builds SET software_version = 'newer-version',
     install_script_revision = 'newer-script' WHERE id = 'newer-build'`,
    )
    .run()
  const actor = fixture.starts.get(id)
  const endpoint = fixture.actors.get(id)?.endpoint()
  if (!actor || !endpoint) throw new Error('Missing admitted workspace start')
  for (let step = 0; step < 15 && (await actor.job()); step++) {
    if ((await actor.job())?.phase === 'runner')
      await endpoint.reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.advance()
  }
  await pending
  expect(await readWorkspaceImageRecords(db, org.id, id)).toEqual({
    softwareVersion: 'claimed-version',
    orgImageBuildId: 'published-image',
    installScriptRevision: 'claimed-script',
    softwareUpdateFailed: false,
  })
})

it('compares and updates software and script records independently', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const db = runtime.env.DB
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  expect(await workspaceSoftwareIsOlder(db, org.id, id, 'current')).toBe(true)
  await recordWorkspaceSoftwareUpdateFailed(db, org.id, id, true)
  expect(await readWorkspaceImageRecords(db, org.id, id)).toMatchObject({
    softwareVersion: null,
    softwareUpdateFailed: true,
  })
  await recordWorkspaceSoftwareVersion(db, org.id, id, 'current')
  expect(await workspaceSoftwareIsOlder(db, org.id, id, 'current')).toBe(false)
  expect(await workspaceSoftwareIsOlder(db, org.id, id, 'next')).toBe(true)
  expect(await readWorkspaceImageRecords(db, org.id, id)).toMatchObject({
    softwareVersion: 'current',
    softwareUpdateFailed: false,
  })
  await db
    .prepare(
      `UPDATE image_builds SET install_script_revision = 'new-script'
     WHERE id = 'published-image'`,
    )
    .run()
  expect(await workspaceInstallScriptDiffers(db, org.id, id)).toBe(true)
  await recordWorkspaceInstallScriptRevision(db, org.id, id, 'new-script')
  expect(await workspaceInstallScriptDiffers(db, org.id, id)).toBe(false)
  await seedPublishedImage(db, {
    orgId: org.id,
    buildId: 'same-script-build',
    imageName: 'same-script-image',
    repositories: [
      {
        id: repositoryId,
        orgId: org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME + 1,
  })
  await db
    .prepare(
      `UPDATE image_builds SET install_script_revision = 'new-script'
     WHERE id = 'same-script-build'`,
    )
    .run()
  expect(await workspaceInstallScriptDiffers(db, org.id, id)).toBe(false)
  await seedPublishedImage(db, {
    orgId: org.id,
    buildId: 'other-account-build',
    imageName: 'other-account-image',
    providerAccount: 'other-account',
    repositories: [],
    software: SOFTWARE,
    now: TEST_TIME + 2,
  })
  await db
    .prepare(
      `UPDATE image_builds SET install_script_revision = 'other-account-script'
     WHERE id = 'other-account-build'`,
    )
    .run()
  expect(await workspaceInstallScriptDiffers(db, org.id, id)).toBe(false)
  await recordWorkspaceSoftwareUpdateFailed(db, org.id, id, true)
  await recordWorkspaceInstallScriptRevision(db, org.id, id, 'new-script')
  expect(await readWorkspaceImageRecords(db, org.id, id)).toEqual({
    softwareVersion: 'current',
    orgImageBuildId: 'published-image',
    installScriptRevision: 'new-script',
    softwareUpdateFailed: true,
  })
  await recordWorkspaceSoftwareUpdateFailed(db, org.id, id, false)
  await recordWorkspaceSoftwareVersion(db, 'another-org', id, 'wrong-version')
  await recordWorkspaceInstallScriptRevision(
    db,
    'another-org',
    id,
    'wrong-script',
  )
  await recordWorkspaceSoftwareUpdateFailed(db, 'another-org', id, true)
  expect(await readWorkspaceImageRecords(db, org.id, id)).toEqual({
    softwareVersion: 'current',
    orgImageBuildId: 'published-image',
    installScriptRevision: 'new-script',
    softwareUpdateFailed: false,
  })
})
