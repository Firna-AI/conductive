import { expect, it } from 'vitest'

import { createWorkspaceToolClient } from '../../tools/client'
import { TOOL_TEST_ORIGIN, TOOL_TEST_TOKEN } from './test-support'

const configuration = {
  machineOrigin: TOOL_TEST_ORIGIN,
  workspaceToken: TOOL_TEST_TOKEN,
}

it('drops unknown response fields and rejects malformed workspace data', async () => {
  const client = createWorkspaceToolClient(configuration, async () =>
    Response.json({
      secret: TOOL_TEST_TOKEN,
      workspaces: [
        {
          id: 'one',
          name: 'Lisbon',
          branch: 'user/lisbon-ab12',
          state: 'ready',
          ciphertext: 'encrypted-secret',
        },
      ],
    }),
  )
  expect(await client.list()).toEqual({
    workspaces: [
      { id: 'one', name: 'Lisbon', branch: 'user/lisbon-ab12', state: 'ready' },
    ],
  })
  const malformed = createWorkspaceToolClient(configuration, async () =>
    Response.json({
      workspaces: [
        { id: 'one', name: 'Lisbon', branch: 'branch', state: 'unknown' },
      ],
    }),
  )
  await expect(malformed.list()).rejects.toThrow(
    'The workspace reply is not valid. Try again.',
  )
})

it('keeps transport details and server error bodies out of tool failures', async () => {
  for (const send of [
    async (): Promise<Response> => {
      throw new Error(`Transport exposed ${TOOL_TEST_TOKEN}`)
    },
    async () =>
      Response.json({ error: { message: TOOL_TEST_TOKEN } }, { status: 500 }),
    async () => new Response(TOOL_TEST_TOKEN),
  ]) {
    const client = createWorkspaceToolClient(configuration, send)
    await expect(client.list()).rejects.toThrow(
      /^The workspace (request failed\.|reply is not valid\.)/,
    )
    await expect(client.list()).rejects.not.toThrow(TOOL_TEST_TOKEN)
  }
})
