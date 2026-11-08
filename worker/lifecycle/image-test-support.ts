import type { backendFixture } from './backend-test-support'
import { advanceImageBuild } from './image-builds'
import { readBuildJob } from './build-data'

export async function finishImageBuild(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  id: string,
): Promise<void> {
  for (let step = 0; step < 20; step++) {
    const retryAt = (
      await readBuildJob(fixture.images.env.DB, fixture.org.id, id)
    ).providerRetry?.retryAt
    if (
      retryAt !== null &&
      retryAt !== undefined &&
      retryAt > fixture.images.dependencies.now()
    )
      fixture.setTime(retryAt)
    if (await advanceImageBuild(fixture.images, fixture.org.id, id)) return
  }
  throw new Error('Build did not finish')
}
