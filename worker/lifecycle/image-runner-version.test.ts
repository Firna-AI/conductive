import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

// Each job records the runner version of the Worker, 2, whatever its source
// image holds. Version 3 is an image that a newer Worker made before a
// rollback. The literal values keep each case from passing for code that
// records the source version, also after a change of the constant.
it.each([
  { kind: 'refresh', sourceVersion: 1, expectedVersion: 2 },
  { kind: 'refresh', sourceVersion: 3, expectedVersion: 2 },
  { kind: 'build', sourceVersion: 1, expectedVersion: 2 },
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
