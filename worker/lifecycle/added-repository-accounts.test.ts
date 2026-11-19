import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { failBuild, readBuildJob, runningBuild } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import {
  SECONDARY_IMAGE_ACCOUNT,
  seedSecondaryOrgImage,
} from './org-image-account-test-support'

const fixtureForTest = setupBackendTests()

it.each(['succeeded', 'failed'] as const)(
  'uses only the fixed account latest full build after a refresh when that build %s',
  async (ownState) => {
    const fixture = fixtureForTest()
    const { images, org, user } = fixture
    const db = images.env.DB
    await seedSecondaryOrgImage(fixture)
    await db
      .prepare('UPDATE orgs SET provider_account = ? WHERE id = ?')
      .bind(SECONDARY_IMAGE_ACCOUNT, org.id)
      .run()
    if (ownState === 'failed') {
      const failed = await startImageBuild(images, {
        orgId: org.id,
        userId: user.id,
        kind: 'build',
        software: SOFTWARE,
      })
      await failBuild(
        db,
        failed,
        'The install script failed.',
        images.dependencies.now(),
      )
    }
    await db
      .prepare('UPDATE image_builds SET state = ?, started_at = ? WHERE id = ?')
      .bind(
        ownState === 'succeeded' ? 'failed' : 'succeeded',
        images.dependencies.now() + 100,
        'published-image',
      )
      .run()
    const refresh = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'refresh',
      software: SOFTWARE,
    })
    await db.batch([
      db
        .prepare(
          `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, selected)
        VALUES ('added-secondary-repo', ?, 2, 'example/added', 'main', 1)`,
        )
        .bind(org.id),
      db
        .prepare('UPDATE settings SET revision = revision + 1 WHERE org_id = ?')
        .bind(org.id),
    ])
    await finishImageBuild(fixture, refresh)
    const added = await runningBuild(db, org.id)
    const job = added === null ? null : await readBuildJob(db, org.id, added)
    expect(
      job && {
        kind: job.kind,
        providerAccount: job.providerAccount,
        repositories: JSON.parse(job.repositoriesJson),
      },
    ).toEqual(
      ownState === 'failed'
        ? null
        : {
            kind: 'build',
            providerAccount: SECONDARY_IMAGE_ACCOUNT,
            repositories: expect.arrayContaining([
              {
                id: 'added-secondary-repo',
                orgId: org.id,
                fullName: 'example/added',
                defaultBranch: 'main',
              },
            ]),
          },
    )
  },
)
