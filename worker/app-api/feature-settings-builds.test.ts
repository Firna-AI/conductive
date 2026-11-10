import { expect, it } from 'vitest'

import { SOFTWARE } from '../lifecycle/backend-test-support'
import { setupFirstBuildTests } from '../lifecycle/first-build-test-support'
import { startImageBuild } from '../lifecycle/image-builds'
import { finishImageBuild } from '../lifecycle/image-test-support'
import { failBuild, readBuildJob } from '../lifecycle/build-data'
import { featureSettings } from './feature-settings'

const fixtureForTest = setupFirstBuildTests()

it('compares settings with the newest build before the first image and with the published build afterward', async () => {
  const fixture = await fixtureForTest()
  const { runtime, images, org, user } = fixture
  const db = runtime.env.DB
  fixture.boat.server.addAccount({
    orgId: 'settings-second-org',
    apiKey: 'settings-second-key',
  })
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    secondary: {
      kind: 'boat',
      orgId: 'settings-second-org',
      apiKey: 'settings-second-key',
    },
  })
  await db
    .prepare('UPDATE orgs SET provider_account = ? WHERE id = ?')
    .bind('secondary', org.id)
    .run()
  const settings = async () =>
    (
      await featureSettings(
        runtime.env,
        { user, org, sessionId: 'session', body: null },
        runtime.dependencies,
        false,
      )
    ).json()
  const save = (installScript: string) =>
    featureSettings(
      runtime.env,
      { user, org, sessionId: 'session', body: { installScript } },
      runtime.dependencies,
      true,
    )
  const build = () =>
    startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: false },
  })
  await save('echo first')
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: false },
  })
  const first = await build()
  expect(await readBuildJob(db, org.id, first)).toMatchObject({
    providerAccount: 'secondary',
  })
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: false },
  })
  await save('echo second')
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: true },
  })
  await failBuild(db, first, 'Failed.', runtime.dependencies.now())
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: true },
  })
  const second = await build()
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: false },
  })
  await finishImageBuild(fixture, second)
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: false },
  })
  await save('echo third')
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: true },
  })
  const later = await build()
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: true },
  })
  await finishImageBuild(fixture, later)
  await expect(settings()).resolves.toMatchObject({
    settings: { needsBuild: false },
  })
})
