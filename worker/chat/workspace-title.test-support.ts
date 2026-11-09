import type { TestHarness } from '../test-support/harness'
import { createFirstMessageFixture } from './first-message.test-support'
import type { TitleModelCall } from './title-model'
import type { ChatDependencies } from './types'

export async function createTitleFixture(
  harness: TestHarness,
  run: TitleModelCall | undefined,
  overrides: Partial<ChatDependencies> = {},
) {
  const pending: Promise<unknown>[] = []
  const first = await createFirstMessageFixture(harness, {
    runTitleModel: run,
    waitUntil: (work) => pending.push(work),
    ...overrides,
  })
  first.fixture.env.CONDUCTIVE_TITLE_MODEL = 'test-title'
  return {
    ...first,
    drain: async () => {
      while (pending.length) await Promise.all(pending.splice(0))
      await first.fixture.drain()
    },
  }
}
