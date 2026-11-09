import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it('records the installed image runner version when a refresh starts', async () => {
  const { images, org, user, runtime } = fixtureForTest()
  await runtime.env.DB.prepare(
    'UPDATE image_builds SET runner_protocol_version = 2 WHERE id = ?',
  )
    .bind('published-image')
    .run()
  const refresh = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'refresh',
    software: SOFTWARE,
  })
  expect(
    await runtime.env.DB.prepare(
      'SELECT runner_protocol_version FROM image_builds WHERE id = ?',
    )
      .bind(refresh)
      .first('runner_protocol_version'),
  ).toBe(2)
})
