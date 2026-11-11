import { sessionsPath } from '../../src/shared/sessions'
import { array } from '../chat/agent-events'
import { createAdapterRuntime } from '../chat/adapter-runtime.test-support'
import { record, string } from '../chat/inputs'
import { TEST_ORIGIN } from '../test-support/harness'
import {
  SQLITE_CHOICE,
  SQLITE_WORKSPACE_ID,
} from './sqlite-fixtures.test-support'

export async function createGitHubSQLiteHarness() {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/github/sqlite-worker.test-support.ts',
    SQLITE_WORKSPACE_ID,
  )
  const request = (path: string, body?: unknown) =>
    runtime.dispatchFetch(`${TEST_ORIGIN}${path}`, {
      headers,
      ...(body === undefined
        ? {}
        : { method: 'POST', body: JSON.stringify(body) }),
    })
  return {
    db: await runtime.getD1Database('DB'),
    request,
    async inspect() {
      return record(await (await request('/inspect')).json())
    },
    createSession: () =>
      request(sessionsPath('org', SQLITE_WORKSPACE_ID), {
        choice: SQLITE_CHOICE,
      }),
    evict: () =>
      runtime.unsafeEvictDurableObject('chat-adapter-tests', 'Workspace', {
        name: SQLITE_WORKSPACE_ID,
      }),
    dispose: () => runtime.dispose(),
  }
}

export function storedRecords(inspection: Record<string, unknown>) {
  return new Map(
    array(inspection.records, (value): [string, unknown] => {
      const pair = array(value, (item) => item)
      return [string(pair[0]), pair[1]]
    }),
  )
}

export function liveEvents(inspection: Record<string, unknown>) {
  return array(inspection.messages, record)
    .filter((message) => message.type === 'event')
    .map((message) => record(message.envelope))
}

export function historyMessages(inspection: Record<string, unknown>) {
  return array(inspection.messages, record)
    .filter((message) => message.type === 'history')
    .map((message) => record(message.history))
}

export function eventOrder(events: unknown) {
  return array(events, record).map((envelope) => ({
    eventNumber: envelope.eventNumber,
    type: record(envelope.event).type,
  }))
}

export type GitHubSQLiteHarness = Awaited<
  ReturnType<typeof createGitHubSQLiteHarness>
>
