import { expect, it } from 'vitest'

import {
  buildEventsPath,
  buildPath,
  orgSettingsPaths,
  type BuildResponse,
  type BuildsResponse,
  type ImageBuild,
} from '../../src/shared/org-settings'
import { createApp } from '../application'
import { TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import {
  SECONDARY_IMAGE_ACCOUNT,
  seedSecondaryOrgImage,
} from './org-image-account-test-support'

const backendFixture = setupBackendTests()

it('omits legacy storage from history, details, and the stream for an account with a disk line', async () => {
  const fixture = backendFixture()
  const { org, runtime, session } = fixture
  const { env } = runtime
  const id = 'secondary-image-build'
  await seedSecondaryOrgImage(fixture)
  const saveLegacyStorage = env.DB.prepare(
    'UPDATE image_builds SET storage_total_bytes = ?, storage_free_bytes = ? WHERE id = ?',
  )
  await env.DB.batch([
    env.DB.prepare('UPDATE orgs SET provider_account = ? WHERE id = ?').bind(
      SECONDARY_IMAGE_ACCOUNT,
      org.id,
    ),
    saveLegacyStorage.bind(84_204_138_496, 43_721_936_384, id),
  ])

  const app = createApp(runtime.dependencies)
  const get = (path: string) =>
    app.fetch(
      new Request(TEST_ORIGIN + path, { headers: { Cookie: session } }),
      env,
    )
  const build: ImageBuild = {
    id,
    orgId: org.id,
    kind: 'build',
    state: 'succeeded',
    startedAt: TEST_TIME - 1,
    completedAt: TEST_TIME - 1,
    durationMs: 0,
    error: null,
    storageTotalBytes: null,
    storageFreeBytes: null,
  }
  const historyResponse = await get(orgSettingsPaths.builds(org.id))
  expect(historyResponse.status).toBe(200)
  const history: BuildsResponse = await historyResponse.json()
  expect(history.currentImageBuildId).toBe(id)
  expect.soft(history.builds[0]).toEqual(build)

  await saveLegacyStorage.bind(68_534_575_104, 31_534_575_104, id).run()
  const detailResponse = await get(buildPath(org.id, id))
  expect(detailResponse.status).toBe(200)
  const detail: BuildResponse = await detailResponse.json()
  expect.soft(detail).toEqual({ build, log: [] })

  const eventsResponse = await get(buildEventsPath(org.id, id))
  expect(eventsResponse.status).toBe(200)
  expect(await eventsResponse.text()).toBe(
    `event: build\ndata: ${JSON.stringify(build)}\n\n`,
  )
})
