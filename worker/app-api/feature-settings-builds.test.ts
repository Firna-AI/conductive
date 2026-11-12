import { expect, it } from 'vitest'

import { SOFTWARE } from '../lifecycle/backend-test-support'
import { setupFirstBuildTests } from '../lifecycle/first-build-test-support'
import { startImageBuild } from '../lifecycle/image-builds'
import { finishImageBuild } from '../lifecycle/image-test-support'
import {
  failBuild,
  readBuildHistory,
  readBuildJob,
} from '../lifecycle/build-data'
import { featureSettings } from './feature-settings'

const fixtureForTest = setupFirstBuildTests()

it('compares the install script with the newest build before the first image and with the published build afterward', async () => {
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
  const changes = async () => (await readBuildHistory(db, org.id)).changes
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
  await expect(changes()).resolves.toMatchObject({ installScript: false })
  await save('echo first')
  await expect(changes()).resolves.toMatchObject({ installScript: false })
  const first = await build()
  expect(await readBuildJob(db, org.id, first)).toMatchObject({
    providerAccount: 'secondary',
  })
  await expect(changes()).resolves.toMatchObject({ installScript: false })
  await save('echo second')
  await expect(changes()).resolves.toMatchObject({ installScript: true })
  await failBuild(db, first, 'Failed.', runtime.dependencies.now())
  await expect(changes()).resolves.toMatchObject({ installScript: true })
  const second = await build()
  await expect(changes()).resolves.toMatchObject({ installScript: false })
  await finishImageBuild(fixture, second)
  await expect(changes()).resolves.toMatchObject({ installScript: false })
  await save('echo third')
  await expect(changes()).resolves.toMatchObject({ installScript: true })
  const later = await build()
  await expect(changes()).resolves.toMatchObject({ installScript: true })
  await finishImageBuild(fixture, later)
  await expect(changes()).resolves.toMatchObject({ installScript: false })
})
