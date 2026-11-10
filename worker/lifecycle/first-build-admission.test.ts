import { expect, it } from 'vitest'

import { SOFTWARE } from './backend-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { setupFirstBuildTests } from './first-build-test-support'
import { startImageBuild } from './image-builds'
import { failBuild } from './build-data'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { seedPublishedImage } from './published-image-test-support'

const fixtureForTest = setupFirstBuildTests()

it.each(['read', 'claim'] as const)(
  'names a running first build and a missing build at creation %s admission',
  async (admission) => {
    const { runtime, images, org, user, repositoryId } = await fixtureForTest()
    const db = runtime.env.DB
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    if (admission === 'claim') {
      runtime.env.DB = new Proxy(db, {
        get(target, property) {
          if (property === 'batch')
            return async (queries: D1PreparedStatement[]) => {
              await target
                .prepare(
                  "UPDATE org_images SET image_build_id = NULL, image_name = NULL WHERE org_id = ? AND provider_account = 'boat'",
                )
                .bind(org.id)
                .run()
              return target.batch(queries)
            }
          const value: unknown = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    }
    let publication = 0
    const create = async () => {
      if (admission === 'claim') {
        await seedPublishedImage(db, {
          orgId: org.id,
          buildId: `publication-${++publication}`,
          imageName: 'published-image',
          repositories: [
            {
              id: repositoryId,
              orgId: org.id,
              fullName: 'example/repository',
              defaultBranch: 'main',
            },
          ],
          software: SOFTWARE,
          now: 1,
        })
      }
      return createCompletedWorkspace(runtime, org.id, user, {
        repositoryId,
        firstMessage: FIRST_MESSAGE,
      })
    }
    await expect(create()).rejects.toMatchObject({
      status: 409,
      code: 'image_required',
      message: 'The cloud computer is still being prepared.',
    })
    await failBuild(db, id, 'Build failed.', 2)
    await expect(create()).rejects.toMatchObject({
      status: 409,
      code: 'image_required',
      message:
        'The cloud computer needs a build. Ask an org admin to build it.',
    })
    expect(
      await db
        .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
        .first('count'),
    ).toBe(0)
  },
)
