import { expect, it } from 'vitest'

import { workspaceFixtures } from '../../src/test-support/fixtures/workspaces'
import { createWorkspaceToolClient } from '../../tools/client'
import { TOOL_TEST_ORIGIN, TOOL_TEST_TOKEN } from './test-support'

it('keeps transcript continuation and rejects unpaired or empty send acceptance', async () => {
  const fixture = workspaceFixtures()
  const session = {
    ...fixture.sessions.sessions[0],
    title: null,
    startedBy: null,
    link: 'https://app.conductive.test/session',
    secret: TOOL_TEST_TOKEN,
  }
  const base = {
    workspace: fixture.detail.workspace,
    session,
    eventNumber: 7,
    resume: {
      state: 'failed',
      error: { code: 'start_failed', message: 'Try the start again.' },
    },
  }
  let value: unknown = { ...base, message: null, turnId: null }
  const client = createWorkspaceToolClient(
    { machineOrigin: TOOL_TEST_ORIGIN, workspaceToken: TOOL_TEST_TOKEN },
    async () => Response.json(value),
  )
  const empty = await client.createSession()
  expect(empty).toMatchObject({
    message: null,
    turnId: null,
    eventNumber: 7,
    session: { title: null, startedBy: null },
    resume: {
      state: 'failed',
      error: { code: 'start_failed', message: 'Try the start again.' },
    },
  })
  expect(empty.session).not.toHaveProperty('secret')
  expect(empty.workspace).not.toHaveProperty('repositoryId')
  await expect(client.sendMessage('session', { text: 'Work' })).rejects.toThrow(
    'The workspace reply is not valid. Try again.',
  )
  for (const acceptance of [
    { message: null, turnId: 'turn' },
    { message: fixture.message, turnId: null },
  ]) {
    value = { ...base, ...acceptance }
    await expect(client.createSession()).rejects.toThrow(
      'The workspace reply is not valid. Try again.',
    )
  }
  value = { ...base, message: fixture.message, turnId: 'accepted-turn' }
  await expect(
    client.sendMessage('session', { text: 'Work' }),
  ).resolves.toMatchObject({
    message: { id: 'ask' },
    turnId: 'accepted-turn',
    session: { link: 'https://app.conductive.test/session' },
  })
  value = {
    workspace: fixture.detail.workspace,
    session: { id: 'read', link: 'https://app.conductive.test/read' },
    detail: 'full',
    markdown: '',
    startLine: 2,
    endLine: 3,
    totalLines: 9,
    startOffset: 0,
    endOffset: 2,
    next: { line: 3, offset: 2 },
    secret: TOOL_TEST_TOKEN,
  }
  const read = await client.readSession('read', {
    detail: 'full',
    startLine: 2,
    startOffset: 0,
  })
  expect(read).toMatchObject({
    markdown: '',
    detail: 'full',
    startLine: 2,
    endLine: 3,
    totalLines: 9,
    startOffset: 0,
    endOffset: 2,
    next: { line: 3, offset: 2 },
  })
  expect(read).not.toHaveProperty('secret')
})
