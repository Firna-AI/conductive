import { routes } from '../../src/app/router'
import { TEST_ORIGIN } from '../test-support/harness'
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
          owner: { id: 'owner', githubLogin: 'owner-login', displayName: null },
          id: 'one',
          number: 1,
          link: `${TEST_ORIGIN}${routes.workspace('org-a', 'one')}`,
          name: 'Lisbon',
          branch: 'user/lisbon-ab12',
          state: 'input',
          ciphertext: 'encrypted-secret',
        },
      ],
    }),
  )
  await expect(client.list()).resolves.toEqual({
    workspaces: [
      {
        owner: { id: 'owner', githubLogin: 'owner-login', displayName: null },
        id: 'one',
        number: 1,
        link: `${TEST_ORIGIN}${routes.workspace('org-a', 'one')}`,
        name: 'Lisbon',
        branch: 'user/lisbon-ab12',
        state: 'input',
      },
    ],
  })
  const malformed = createWorkspaceToolClient(configuration, async () =>
    Response.json({
      workspaces: [
        {
          owner: { id: 'owner', githubLogin: 'owner-login', displayName: null },
          id: 'one',
          number: 1,
          link: `${TEST_ORIGIN}${routes.workspace('org-a', 'one')}`,
          name: 'Lisbon',
          branch: 'branch',
          state: 'unknown',
        },
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

it('preserves Worker refusal codes and messages for every call without credentials', async () => {
  const client = createWorkspaceToolClient(
    { ...configuration, turnId: 'active-turn' },
    async () =>
      Response.json(
        {
          error: {
            code: 'membership_required',
            message: `Access ended for ${TOOL_TEST_TOKEN}.`,
            details: { private: TOOL_TEST_TOKEN },
          },
        },
        { status: 403 },
      ),
  )
  const calls = [
    () => client.list(),
    () => client.listRepositories(),
    () => client.listSections(),
    () => client.listModels(),
    () => client.create({ repositoryId: 'repository', firstMessage: 'Work' }),
    () => client.listSessions(),
    () => client.readSession('session'),
    () => client.createSession(),
    () => client.sendMessage('session', { text: 'Work' }),
    () => client.getWorkspace(),
    () => client.renameWorkspace({ name: 'Work' }),
    () => client.moveWorkspace({ sectionId: 'section' }),
    () => client.archiveWorkspace(),
    () => client.getSession('session'),
    () => client.renameSession('session', { title: 'Work' }),
    () => client.closeSession('session'),
    () => client.stopSession('session'),
    () => client.getMessage('session', 'message'),
    () => client.createSection({ name: 'Work' }),
    () => client.deleteSection('section'),
    () => client.listPreviews(),
    () => client.openPreview({ port: 4321 }),
    () => client.closePreview('preview'),
    () =>
      client.runMacCommand({
        command: 'pwd',
        folder: '/tmp',
        reason: 'Check folder',
      }),
  ]
  for (const call of calls) {
    await expect(call()).rejects.toMatchObject({
      status: 403,
      code: 'membership_required',
      message: 'Access ended for [redacted].',
    })
  }
})
