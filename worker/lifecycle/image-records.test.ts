import { expect, it } from 'vitest'

import { orgSettingsPaths } from '../../src/shared/org-settings'
import { seedReadySoftwareImage } from '../software-image/test-support'
import { softwareVersion } from '../software-image/version'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { handleLifecycleRequest } from './browser'
import { readBuild, readBuildHistory } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { refreshImagesForPush, runImageAlarm } from './image-timers'
import { readOrgImage } from './org-image-data'

const fixtureForTest = setupBackendTests()
const firstScriptRevision =
  'be6b31db9d4866fc6f044babe83fdb1041582eb89e516bd3813031b547915b8f'

it.each(['software image', 'software step'] as const)(
  'publishes the version and exact script revision from the %s',
  async (source) => {
    const fixture = fixtureForTest()
    const { images, org, user } = fixture
    const db = images.env.DB
    await db
      .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
      .bind('echo first-install\n', org.id)
      .run()
    if (source === 'software image') await seedReadySoftwareImage(db)
    const version = await softwareVersion(SOFTWARE)
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await db
      .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
      .bind('echo next-install\n', org.id)
      .run()
    await finishImageBuild(fixture, id)
    expect(
      await db
        .prepare(
          `SELECT software_version AS softwareVersion,
           install_script_revision AS installScriptRevision FROM image_builds WHERE id = ?`,
        )
        .bind(id)
        .first(),
    ).toEqual({
      softwareVersion: version,
      installScriptRevision: firstScriptRevision,
    })
    expect(await readOrgImage(db, org.id)).toMatchObject({
      imageBuildId: id,
      softwareVersion: version,
      installScriptRevision: firstScriptRevision,
    })
  },
)

it('publishes the software and script revisions that a refresh inherits', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  await db.batch([
    db
      .prepare(
        `UPDATE image_builds SET software_version = 'inherited-software',
       install_script_revision = ? WHERE id = 'published-image'`,
      )
      .bind(firstScriptRevision),
    db
      .prepare(
        `UPDATE image_build_jobs SET software_version = 'inherited-software',
       install_script_revision = ?, install_script = ? WHERE build_id = 'published-image'`,
      )
      .bind(firstScriptRevision, 'echo first-install\n'),
    db
      .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
      .bind('echo next-install\n', org.id),
  ])
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'refresh',
    software: { ...SOFTWARE, sha256: 'b'.repeat(64) },
  })
  await finishImageBuild(fixture, id)
  expect(
    await db
      .prepare(
        `SELECT software_version AS softwareVersion,
         install_script_revision AS installScriptRevision FROM image_builds WHERE id = ?`,
      )
      .bind(id)
      .first(),
  ).toEqual({
    softwareVersion: 'inherited-software',
    installScriptRevision: firstScriptRevision,
  })
  expect(await readOrgImage(db, org.id)).toMatchObject({
    imageBuildId: id,
    softwareVersion: 'inherited-software',
    installScriptRevision: firstScriptRevision,
  })
})

it.each(['request', 'push', 'daily', 'pending push'] as const)(
  'records the %s refresh cause at admission and sends it with the history',
  async (cause) => {
    const fixture = fixtureForTest()
    const { images, org, user } = fixture
    if (cause === 'request') {
      const response = await handleLifecycleRequest(
        new Request(
          `https://app.conductive.test${orgSettingsPaths.refresh(org.id)}`,
          { method: 'POST' },
        ),
        { org, user, sessionId: 'test-session', body: {} },
        { ...fixture.runtime, images },
        {
          software: SOFTWARE,
          acceptFirstMessage: async () => {
            throw new Error('This request creates no workspace')
          },
          waitUntil: () => {},
        },
      )
      expect(response?.status).toBe(202)
      expect(await response?.json()).toMatchObject({
        build: { refreshCause: 'request' },
      })
    } else if (cause === 'push') {
      await refreshImagesForPush(images, {
        githubRepositoryId: 1,
        ref: 'refs/heads/main',
        software: SOFTWARE,
      })
    } else {
      await images.env.DB.prepare(
        `UPDATE org_images SET next_image_refresh_at = ?, pending_push_refresh_at = ?
         WHERE org_id = ? AND provider_account = 'boat'`,
      )
        .bind(
          cause === 'daily' ? TEST_TIME : TEST_TIME + 86_400_000,
          cause === 'pending push' ? TEST_TIME : null,
          org.id,
        )
        .run()
      await runImageAlarm(images, {
        orgId: org.id,
        software: SOFTWARE,
        buildId: null,
        nextAt: TEST_TIME,
      })
    }
    const history = await readBuildHistory(images.env.DB, org.id)
    const build = history.builds[0]
    const refreshCause = cause === 'pending push' ? 'push' : cause
    expect(build).toMatchObject({
      kind: 'refresh',
      state: 'running',
      refreshCause,
    })
    expect(
      (await readBuild(images.env.DB, org.id, build.id)).build,
    ).toMatchObject({
      kind: 'refresh',
      refreshCause,
    })
    expect(
      await images.env.DB.prepare(
        'SELECT refresh_cause FROM image_builds WHERE id = ?',
      )
        .bind(build.id)
        .first('refresh_cause'),
    ).toBe(refreshCause)
  },
)
