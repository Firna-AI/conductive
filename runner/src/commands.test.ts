import { expect, it, vi } from 'vitest'

import type { RunnerTurn } from '../../src/shared/runner'
import { turn } from '../test-support/harness'
import { parseWorkspaceMessage } from './commands'

const parse = (value: unknown) => parseWorkspaceMessage(value, () => {})

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
    commitAuthor: null,
  }
}

it('accepts only the version 2 welcome', () => {
  expect(() =>
    parse({
      type: 'welcome',
      protocolVersion: 2,
      streamId: 'stream',
      confirmedThrough: 0,
    }),
  ).not.toThrow()
  expect(
    parse({
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
    parse({
      type: 'welcome',
      protocolVersion: 1,
      streamId: 'stream',
      confirmedThrough: 0,
    }),
  ).toThrow('The runner protocol version is not supported.')
})

it('parses a turn credential and a message without a credential', () => {
  const input = command()
  expect(() => parse(input)).not.toThrow()
  expect(parse(input)).toEqual(input)
  const message = { ...input, type: 'message', credential: undefined }
  expect(parse(message)).toEqual({
    type: 'message',
    commandId: input.commandId,
    sessionId: input.sessionId,
    turnId: input.turnId,
    message: input.message,
    attachments: [],
  })
  expect(() =>
    parse({
      ...input,
      credential: { agent: 'codex', kind: 'api-key', token: 'other-agent' },
    }),
  ).toThrow()
  expect(() =>
    parse({
      ...input,
      credential: { agent: 'claude', kind: 'unknown', token: 'wrong-kind' },
    }),
  ).toThrow()
  expect(() =>
    parse({
      ...input,
      credential: undefined,
      login: { agent: 'claude', kind: 'api-key', secret: 'real-login' },
    }),
  ).toThrow()
})

it('keeps stable attachment paths and reads older metadata with a null path', () => {
  const original = command()
  const file = {
    id: 'file',
    name: 'trace.txt',
    kind: 'file',
    mediaType: 'text/plain',
    sizeBytes: 7,
  }
  for (const path of ['.context/attachments/file/trace.txt', null, undefined]) {
    const attachment = { ...file, path }
    const input = {
      ...original,
      message: { ...original.message, attachments: [attachment] },
    }
    expect(parse(input)).toMatchObject({
      message: { attachments: [{ ...file, path: path ?? null }] },
    })
  }
})

it('keeps the supplied commit author only on a turn command', () => {
  const command = turn()
  command.commitAuthor = {
    name: 'Alice Example',
    email: '1+alice@users.noreply.github.com',
  }
  const warn = vi.fn()
  expect(parseWorkspaceMessage(command, warn)).toMatchObject({
    type: 'turn',
    commitAuthor: {
      name: 'Alice Example',
      email: '1+alice@users.noreply.github.com',
    },
  })
  expect(
    parseWorkspaceMessage({ ...command, type: 'message' }, warn),
  ).not.toHaveProperty('commitAuthor')
})

it.each(['missing', 'null'])(
  'keeps a turn with a %s commit author and no warning',
  (kind) => {
    const command: Partial<RunnerTurn> = turn()
    if (kind === 'missing') delete command.commitAuthor
    const warn = vi.fn()
    expect(parseWorkspaceMessage(command, warn)).toMatchObject({
      type: 'turn',
      commitAuthor: null,
    })
    expect(warn).not.toHaveBeenCalled()
  },
)

it.each([
  { kind: 'text', value: 'not an author' },
  { kind: 'missing email', value: { name: 'Alice Example' } },
  {
    kind: 'non-string name',
    value: { name: 1, email: '1+alice@users.noreply.github.com' },
  },
  { kind: 'non-string email', value: { name: 'Alice Example', email: 1 } },
])('continues a turn and warns for a $kind commit author', ({ value }) => {
  const warn = vi.fn()
  expect(
    parseWorkspaceMessage({ ...turn(), commitAuthor: value }, warn),
  ).toMatchObject({ type: 'turn', commitAuthor: null })
  expect(warn.mock.calls).toEqual([
    ['The turn commit author is invalid. The sandbox author will be used.'],
  ])
})
