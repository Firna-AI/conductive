import { WORKSPACE_ID } from './harness.test-support'
import { readOutputSnapshot } from './output-filter-records'
import { captureEnvironment, outputFixture } from './runner-output.test-support'

export type AnswerFixture = Awaited<ReturnType<typeof outputFixture>>

export function setAnswerValues(f: AnswerFixture, values: string[]) {
  return captureEnvironment(
    f,
    Object.fromEntries(
      values.map((value, index) => [`VALUE_${index}`, { value, secret: true }]),
    ),
  )
}

export function answerState(f: AnswerFixture) {
  return f.chat.store.read(WORKSPACE_ID, async (view) =>
    Promise.all(
      [null, ...(await view.output.streams())].map((streamId) =>
        readOutputSnapshot(f.env, view, WORKSPACE_ID, streamId),
      ),
    ),
  )
}

export async function shownAnswer(f: AnswerFixture, messageId: string) {
  const history = await f.history(f.context.sessionId)
  return history.events
    .flatMap(({ event }) =>
      event.type === 'assistant.delta' && event.messageId === messageId
        ? [event.text]
        : [],
    )
    .join('')
}
