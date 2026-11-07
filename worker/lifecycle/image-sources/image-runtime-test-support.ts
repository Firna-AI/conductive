import { TEST_TIME } from '../../test-support/harness'
import { storeBoatKey } from '../../sandbox/keys'
import { LifecycleBoat } from '../lifecycle-boat-test-support'
import type { ImageRuntime } from '../image-builds'
import { createGitHubImageSourceMaterializer } from './materialize'
import { firstOrgAdmin } from '../settings-data'
import type { localSourceFixture } from './local-source-test-support'

/** Native sources use real Git. Other image operations keep the lifecycle provider boundary. */
export async function nativeImageRuntime(
  fixture: Awaited<ReturnType<typeof localSourceFixture>>,
) {
  const boat = new LifecycleBoat()
  const admin = await firstOrgAdmin(fixture.env.DB, fixture.org.id)
  if (!admin) throw new Error('Missing image admin')
  await storeBoatKey(
    fixture.env,
    fixture.org.id,
    admin.userId,
    'boat-first',
    boat.fetch,
    TEST_TIME,
  )
  const dependencies = {
    now: () => TEST_TIME,
    randomToken: () => 'image-runtime-unused',
    fetch: (request: Request) =>
      new URL(request.url).hostname === 'boat.dev'
        ? boat.fetch(request)
        : fixture.access.fetch(request),
  }
  const runtime: ImageRuntime = {
    env: fixture.env,
    dependencies,
    prepareSources: (input) =>
      createGitHubImageSourceMaterializer(
        fixture.env,
        dependencies,
      )({ ...input, provider: fixture.provider }),
    scheduler: { schedule: async () => {} },
  }
  return { runtime, boat, admin }
}
