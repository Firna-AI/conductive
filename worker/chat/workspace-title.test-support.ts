import type { TestHarness } from '../test-support/harness'
import { createFirstMessageFixture } from './first-message.test-support'
import type { TitleModelCall } from './title-model'
import type { ChatFixtureOptions } from './harness.test-support'

export async function createTitleFixture(
  harness: TestHarness,
  run: TitleModelCall | undefined,
  overrides: ChatFixtureOptions = {},
) {
  const first = await createFirstMessageFixture(harness, {
    runTitleModel: run,
    ...overrides,
  })
  await first.fixture.setEnvironment({ CONDUCTIVE_TITLE_MODEL: 'test-title' })
  return {
    ...first,
    drain: () => first.fixture.drainAttachments(),
  }
}
