import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { productionAgentTools } from '../tools/composition'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'
import { readWorkspace } from './workspace-data'
import { readWorkspaceToken } from './tokens'
import { finishImageBuild } from './image-test-support'
import { progressProviderSwitch } from './provider-switch-builds'
import {
  setupSwitchTests,
  requestSwitch,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it('creates on the current image during and after a switch while agent repository lists keep the published inputs', async () => {
  const fixture = await fixtureForTest()
  const { runtime, images, org, user, repositoryId } = fixture
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const before = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  expect(
    (await readWorkspace(runtime.env.DB, org.id, before.workspace.id))
      .providerAccount,
  ).toBe('boat')
  const token = await readWorkspaceToken(runtime.env, before.workspace.id)
  const repositories = async () => {
    const response = await productionAgentTools(
      new Request(runtime.env.MACHINE_ORIGIN + MACHINE_PATHS.repositories, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      runtime.env,
      runtime.dependencies,
    )
    expect(response.status).toBe(200)
    return response.json()
  }
  expect(await repositories()).toEqual({
    repositories: [
      {
        id: repositoryId,
        fullName: 'example/repository',
        defaultBranch: 'main',
        current: true,
      },
    ],
  })
  await finishImageBuild(fixture, (await record.read())?.buildId ?? '')
  const after = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: { ...FIRST_MESSAGE, id: 'message-after-switch' },
    }),
  )
  expect(
    (await readWorkspace(runtime.env.DB, org.id, after.workspace.id))
      .providerAccount,
  ).toBe(SECONDARY_IMAGE_ACCOUNT)
  expect(
    (await readWorkspace(runtime.env.DB, org.id, before.workspace.id))
      .providerAccount,
  ).toBe('boat')
  expect(await repositories()).toEqual({
    repositories: [
      {
        id: repositoryId,
        fullName: 'example/repository',
        defaultBranch: 'main',
        current: true,
      },
    ],
  })
})
