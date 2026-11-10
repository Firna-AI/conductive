import type { TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture } from './harness.test-support'

export async function transcriptFixture(harness: TestHarness) {
  const fixture = await createChatFixture(harness)
  await fixture.setEnvironment({
    CONDUCTIVE_MODELS: JSON.stringify([
      { ...CLAUDE, label: 'Test model', efforts: ['high'] },
    ]),
  })
  return fixture
}
