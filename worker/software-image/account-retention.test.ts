import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { LifecycleBoat } from '../lifecycle/lifecycle-boat-test-support'
import { providerForAccount } from '../sandbox/client'
import { FakeE2b } from '../test-support/fake-e2b'
import { TEST_TIME } from '../test-support/harness'
import { softwareImages } from './data'
import { repairSoftwareImages } from './repair'
import {
  seedReadySoftwareImage,
  softwareImageReleaseFixture,
} from './test-support'

const fixtureForTest = setupBackendTests()

it('keeps the current version across stored accounts and retires each other image through its own account', async () => {
  const { images, boat } = fixtureForTest()
  const release = softwareImageReleaseFixture(images)
  const secondary = new LifecycleBoat()
  secondary.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  const e2b = new FakeE2b()
  images.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
    e2b: {
      kind: 'e2b',
      apiKey: e2b.apiKey,
      domain: e2b.domain,
      templateId: 'e2b-base',
    },
  })
  const fetch = images.dependencies.fetch
  images.dependencies.fetch = (request) =>
    request.headers.get('X-Boat-Org') === 'second-org'
      ? secondary.fetch(request)
      : new URL(request.url).hostname.endsWith(e2b.domain)
        ? e2b.fetch(request)
        : fetch(request)
  const obsoleteNames: string[] = []
  for (const account of ['boat', 'boat-second', 'e2b']) {
    const current = await seedReadySoftwareImage(
      images.env.DB,
      `${account}-current`,
      {
        account,
      },
    )
    const obsolete = await seedReadySoftwareImage(
      images.env.DB,
      `${account}-obsolete`,
      {
        account,
        version: 'obsolete',
        now: TEST_TIME + 1,
      },
    )
    obsoleteNames.push(obsolete)
    if (account === 'e2b') {
      e2b.sandboxes.set('software-builder', {
        sandboxID: 'software-builder',
        state: 'running',
        metadata: {},
      })
      const provider = providerForAccount(
        images.env,
        images.dependencies.fetch,
        account,
      )
      await provider.saveSnapshot('software-builder', current)
      await provider.saveSnapshot('software-builder', obsolete)
      e2b.sandboxes.clear()
    }
  }
  await repairSoftwareImages(images)
  for (const account of ['boat-second', 'e2b', 'boat'])
    expect(
      (await softwareImages(images.env.DB, account)).map((image) => image.id),
    ).toEqual([`${account}-current`])
  expect(boat.deletedSnapshots).toEqual([obsoleteNames[0]])
  expect(secondary.deletedSnapshots).toEqual([obsoleteNames[1]])
  expect([...e2b.snapshots.keys()]).toEqual([
    (await softwareImages(images.env.DB, 'e2b'))[0].snapshotName,
  ])
  expect(release.reads).toBe(1)
  expect(boat.starts).toEqual([])
  expect(secondary.starts).toEqual([])
  expect(
    e2b.requests.filter((request) => request.method === 'POST'),
  ).toHaveLength(2)
})
