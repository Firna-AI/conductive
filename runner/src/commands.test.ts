import { expect, it } from 'vitest'

import { turn } from '../test-support/harness'
import { parseWorkspaceMessage } from './commands'

function command() {
  const original = turn()
  return {
    type: 'turn',
    commandId: original.commandId,
    sessionId: original.sessionId,
    turnId: original.turnId,
    message: original.message,
    attachments: original.attachments,
    credential: {
      agent: 'claude',
      kind: 'api-key',
      token: 'sk-ant-api-turn-token',
    },
  }
}

it('accepts only the version 2 welcome', () => {
  expect(() =>
    parseWorkspaceMessage({
      type: 'welcome',
      protocolVersion: 2,
      streamId: 'stream',
      confirmedThrough: 0,
    }),
  ).not.toThrow()
  expect(
    parseWorkspaceMessage({
      type: 'welcome',
      protocolVersion: 2,
      streamId: 'stream',
      confirmedThrough: 0,
    }),
  ).toEqual({
    type: 'welcome',
    protocolVersion: 2,
    streamId: 'stream',
    confirmedThrough: 0,
  })
  expect(() =>
    parseWorkspaceMessage({
      type: 'welcome',
      protocolVersion: 1,
      streamId: 'stream',
      confirmedThrough: 0,
    }),
  ).toThrow('The runner protocol version is not supported.')
})

it('parses a turn credential and a message without a credential', () => {
  const input = command()
  expect(() => parseWorkspaceMessage(input)).not.toThrow()
  expect(parseWorkspaceMessage(input)).toEqual(input)
  const message = { ...input, type: 'message', credential: undefined }
  expect(parseWorkspaceMessage(message)).toEqual({
    type: 'message',
    commandId: input.commandId,
    sessionId: input.sessionId,
    turnId: input.turnId,
    message: input.message,
    attachments: [],
  })
  expect(() =>
    parseWorkspaceMessage({
      ...input,
      credential: { agent: 'codex', kind: 'api-key', token: 'other-agent' },
    }),
  ).toThrow()
  expect(() =>
    parseWorkspaceMessage({
      ...input,
      credential: { agent: 'claude', kind: 'unknown', token: 'wrong-kind' },
    }),
  ).toThrow()
  expect(() =>
    parseWorkspaceMessage({
      ...input,
      credential: undefined,
      login: { agent: 'claude', kind: 'api-key', secret: 'real-login' },
    }),
  ).toThrow()
})
