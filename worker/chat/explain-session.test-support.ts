import { explainSessionPath } from '../../src/shared/sessions'
import type { TestHarness } from '../test-support/harness'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'

export const EXPLAIN_INPUT = {
  messageId: 'parent-message',
  quote: 'Selected text',
  before: 'Before',
  after: 'After',
}

export async function explanationFixture(harness: TestHarness) {
  const fixture = await createChatFixture(harness)
  await fixture.setEnvironment({
    CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify(CLAUDE),
    CONDUCTIVE_MODELS: JSON.stringify([
      { ...CLAUDE, label: 'Claude', efforts: ['high'] },
      { ...CODEX, label: 'Codex', efforts: ['medium'], fast: true },
    ]),
  })
  const parent = await fixture.createSession()
  await fixture.send(parent.id, EXPLAIN_INPUT.messageId)
  const path = explainSessionPath(fixture.org.id, WORKSPACE_ID, parent.id)
  return {
    fixture,
    parent,
    path,
    explain: (body: unknown = EXPLAIN_INPUT) =>
      fixture.fetch(path, body, fixture.memberCookie),
  }
}
