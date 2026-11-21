import { expect, it } from 'vitest'

import { duringTurn, fakeToolContext, turn } from '../test-support/input'
import { readRequest } from './read-request'

const repository = {
  fullName: 'acme/billing',
  folder: '/home/user/code/billing',
}

it('reads the instruction folder of start options and the repository of input', () => {
  const options = {
    cwd: '/home/user/code/billing',
    home: '/home/user',
    sessionId: 'session-1',
    endpoint: 'https://machines.conductive.test/v1/model/claude',
    credential: { type: 'gateway', ...turn().credential },
    commitAuthor: null,
    choice: turn().message.choice,
    conversationId: null,
    instructions: 'Fixed.',
    tools: fakeToolContext,
    backgroundNoteIds: [],
  }
  for (const instructionFolder of ['/home/user/code/storefront', null]) {
    const request = {
      type: 'start',
      requestId: 'start',
      options: { ...options, instructionFolder },
    }
    expect(readRequest(request)).toEqual(request)
  }
  const older = { type: 'start', requestId: 'older', options }
  expect(readRequest(older)).toEqual(older)
  for (const input of [
    { ...turn(), repository },
    { ...duringTurn(turn()), repository },
  ]) {
    const request = { type: 'send', requestId: 'send', input }
    expect(readRequest(request)).toEqual(request)
  }
  const send = { type: 'send', requestId: 'older', input: turn() }
  expect(readRequest(send)).toEqual(send)
  expect(() =>
    readRequest({
      type: 'send',
      requestId: 'bad',
      input: { ...turn(), repository: { fullName: 'acme/billing' } },
    }),
  ).toThrow()
})
