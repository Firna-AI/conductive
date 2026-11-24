import {
  explainSessionPath,
  sessionPaths,
  type ExplainSessionResponse,
} from '../../src/shared/sessions'
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

export const ASK_INPUT = {
  ...EXPLAIN_INPUT,
  promptId: 'explanation-prompt',
  question: 'Why is this selected?',
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
  const explain = (
    body: unknown = EXPLAIN_INPUT,
    cookie = fixture.memberCookie,
  ) => fixture.fetch(path, body, cookie)
  return {
    fixture,
    parent,
    path,
    explain,
    startAsk: async (): Promise<ExplainSessionResponse> => {
      const response = await explain(ASK_INPUT)
      if (response.status !== 201)
        throw new Error(
          `Ask returned ${response.status}: ${await response.text()}`,
        )
      return response.json()
    },
    close: (sessionId: string) =>
      fixture.fetch(
        sessionPaths.close(fixture.org.id, WORKSPACE_ID, sessionId),
        {
          stopRunningTurn: false,
        },
      ),
  }
}
