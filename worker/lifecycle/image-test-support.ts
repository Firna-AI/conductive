import type { backendFixture } from './backend-test-support'
import { advanceImageBuild } from './image-builds'

export async function finishImageBuild(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  id: string,
): Promise<void> {
  for (let step = 0; step < 20; step++) {
    if (await advanceImageBuild(fixture.images, fixture.org.id, id)) return
  }
  throw new Error('Build did not finish')
}
