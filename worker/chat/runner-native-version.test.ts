import { expect, it } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { sessionPaths } from '../../src/shared/sessions'
import { TEST_ORIGIN } from '../test-support/harness'
import { createAdapterRuntime } from './adapter-runtime.test-support'
import { array } from './agent-events'
import { WORKSPACE_ID } from './harness.test-support'
import { record, string } from './inputs'
import { chatKey } from './storage-keys'
import {
  savedRunnerState,
  seedRunnerState,
} from './runner-connection-state.test-support'
import {
  disposeRunners,
  runnerControls,
  runnerState,
} from './runner-native.test-support'

it.each([
  {
    protocolVersion: 1,
    obsolete: true,
    processStartId: 'abcdef01-2345-4678-89ab-cdef01234567',
    expected: 'abcdef01-2345-4678-89ab-cdef01234567',
  },
  {
    protocolVersion: undefined,
    obsolete: true,
    processStartId: undefined,
    expected: null,
  },
  {
    protocolVersion: null,
    obsolete: true,
    processStartId: { token: 'private-runner-token' },
    expected: 'unknown',
  },
  { protocolVersion: 3, obsolete: false, processStartId: null, expected: null },
])(
  'retires a saved established runner with version $protocolVersion before dispatch and keeps the Durable Object usable',
  async ({ protocolVersion, obsolete, processStartId, expected }) => {
    const { runtime, headers } = await createAdapterRuntime(
      'worker/chat/runner-entry.test-support.ts',
    )
    const controls = runnerControls(runtime, headers)
    await controls.request('capture-warnings')
    const runner = await controls.connect(
      'native-runner',
      0,
      2,
      'abcdef01-2345-4678-89ab-cdef01234567',
    )
    const sockets = [runner.socket]
    try {
      runner.emit({ type: 'runner.ready' })
      expect(await runner.inbox.next()).toMatchObject({
        type: 'confirm',
        throughEventNumber: 1,
      })
      const sessionId = await controls.session()
      await controls.send(sessionId, 'running')
      const turn = record(await runner.inbox.next())
      expect(turn.type).toBe('turn')
      const stopped = await runtime.dispatchFetch(
        `${TEST_ORIGIN}${sessionPaths.interrupt('org', WORKSPACE_ID, sessionId)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ turnId: turn.turnId }),
        },
      )
      expect(stopped.status).toBe(200)
      expect(await runner.inbox.next()).toMatchObject({
        type: 'interrupt',
        turnId: turn.turnId,
      })
      await controls.send(sessionId, 'waiting')
      const before = await controls.request('settled')
      const stored = savedRunnerState(before.state)
      const connection = record(stored.connection)
      if (protocolVersion === undefined) delete connection.protocolVersion
      else connection.protocolVersion = protocolVersion
      if (processStartId === undefined) delete connection.processStartId
      else connection.processStartId = processStartId
      await controls.request('seed', seedRunnerState(stored))
      const sent = [...runner.received]
      await runtime.unsafeEvictDurableObject(
        'chat-adapter-tests',
        'Workspace',
        { name: WORKSPACE_ID, webSockets: 'hibernate' },
      )
      const after = await controls.request('settled')
      expect(after.instance).not.toBe(before.instance)
      expect(after.runner).toBeNull()
      expect(await runner.closed).toMatchObject({ code: 1000 })
      expect(after.fileAttached).toEqual([])
      expect(after.fileBinding).toBeNull()
      expect(runner.received).toEqual(sent)
      const connectionWarnings = array(after.warnings, (call) =>
        array(call, record),
      )
        .flat()
        .filter(
          ({ kind }) =>
            kind === 'runner_connected' || kind === 'runner_disconnected',
        )
      const connectionFields = {
        workspaceId: 'unknown',
        connectionId: string(connection.id),
        streamId: 'unknown',
      }
      expect(connectionWarnings).toEqual([
        {
          kind: 'runner_connected',
          message: 'The runner of a workspace connected.',
          ...connectionFields,
          protocolVersion: 2,
          processStartId: 'abcdef01-2345-4678-89ab-cdef01234567',
        },
        {
          kind: 'runner_disconnected',
          message: 'The runner of a workspace disconnected.',
          ...connectionFields,
          protocolVersion: protocolVersion ?? null,
          processStartId: expected,
        },
      ])
      const response = await runtime.dispatchFetch(
        `${TEST_ORIGIN}${chatHistoryPath('org', WORKSPACE_ID, sessionId)}`,
        { headers },
      )
      expect(response.status).toBe(200)
      const events = array(record(await response.json()).events, record).map(
        ({ event }) => record(event),
      )
      const failures = events.filter(({ type }) => type === 'turn.failed')
      expect(
        array(after.warnings, (call) => array(call, record))
          .flat()
          .filter(({ kind }) => kind === 'turn_ended_without_stop_request'),
      ).toEqual(
        obsolete
          ? [
              {
                kind: 'turn_ended_without_stop_request',
                message: 'A turn ended without a Stop request.',
                workspaceId: 'unknown',
                turnId: string(failures[1].turnId),
                state: 'failed',
                connectionId: null,
                streamId: null,
                processStartId: null,
                protocolVersion: null,
              },
            ]
          : [],
      )
      expect(events.filter(({ type }) => type === 'turn.failed')).toMatchObject(
        obsolete
          ? [
              {
                turnId: turn.turnId,
                retryMessageId: 'running',
                error: {
                  code: 'runner_protocol_unsupported',
                  message:
                    'This cloud computer can no longer run agents. Ask an admin to build the org image again. Then start a new workspace.',
                },
              },
              {
                retryMessageId: 'waiting',
                error: {
                  code: 'runner_protocol_unsupported',
                  message:
                    'This cloud computer can no longer run agents. Ask an admin to build the org image again. Then start a new workspace.',
                },
              },
            ]
          : [],
      )
      expect(
        events.filter(({ type }) => type === 'session.updated').at(-1),
      ).toMatchObject({
        session: obsolete
          ? {
              activeTurnId: null,
              retryMessageId: 'waiting',
              loginAvailable: true,
            }
          : {
              activeTurnId: turn.turnId,
              retryMessageId: null,
              loginAvailable: true,
            },
      })
      const storedAfter = runnerState(after.state)
      expect(
        [...storedAfter.keys()].filter((key) =>
          key.startsWith(chatKey('command', '')),
        ),
      ).toHaveLength(obsolete ? 0 : 3)
      await runtime.unsafeEvictDurableObject(
        'chat-adapter-tests',
        'Workspace',
        { name: WORKSPACE_ID },
      )
      expect((await controls.request('inspect')).runner).toBeNull()
      const replacement = await controls.connect('supported-replacement')
      sockets.push(replacement.socket)
    } finally {
      await disposeRunners(runtime, sockets)
    }
  },
)
