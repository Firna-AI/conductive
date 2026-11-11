import { expect, it } from 'vitest'

import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it.each([
  {
    kind: 'refresh',
    sourceVersion: 1,
    expectedVersion: RUNNER_PROTOCOL_VERSION,
  },
  {
    kind: 'refresh',
    sourceVersion: 2,
    expectedVersion: RUNNER_PROTOCOL_VERSION,
  },
  {
    kind: 'build',
    sourceVersion: 1,
    expectedVersion: RUNNER_PROTOCOL_VERSION,
  },
] as const)(
  'records runner version $expectedVersion for a $kind from a version $sourceVersion image',
  async ({ kind, sourceVersion, expectedVersion }) => {
    const { images, org, user, runtime } = fixtureForTest()
    await runtime.env.DB.prepare(
      'UPDATE image_builds SET runner_protocol_version = ? WHERE id = ?',
    )
      .bind(sourceVersion, 'published-image')
      .run()
    const build = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind,
      software: SOFTWARE,
    })
    expect(
      await runtime.env.DB.prepare(
        'SELECT runner_protocol_version FROM image_builds WHERE id = ?',
      )
        .bind(build)
        .first('runner_protocol_version'),
    ).toBe(expectedVersion)
  },
)
