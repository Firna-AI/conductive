import { describe, expect, test } from 'vitest'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { testServices } from './test-kit'

const org = FAKE_IDS.org
const choice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
} as const
const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}

async function loaded(server: FakeApiServer) {
  const model = new OrgModel(testServices(server), org)
  await model.reload('list')
  return model
}

describe('NewWorkspaceModel', () => {
  test('the first message creates the workspace in the section, with the choices and a file', async () => {
    const server = new FakeApiServer()
    const model = await loaded(server)
    const draft = model.newWorkspace('checkout')
    draft.setText('Let shoppers save their cart.')
    draft.setRepository('billing-service')
    draft.setChoice(choice)
    await draft.attach([
      new File(['Cart notes'], 'notes.txt', { type: 'text/plain' }),
    ])
    expect(await server.requests.at(-1)?.json()).toEqual({
      name: 'notes.txt',
      kind: 'file',
      mediaType: 'text/plain',
      dataBase64: 'Q2FydCBub3Rlcw==',
    })
    const created = await draft.send(defaults)
    expect(await server.requests.at(-1)?.json()).toEqual({
      repositoryId: 'billing-service',
      sectionId: 'checkout',
      firstMessage: {
        id: 'client-1',
        text: 'Let shoppers save their cart.',
        attachmentIds: ['draft-attachment-1'],
        choice,
      },
    })
    expect(created?.workspace.id).toBe('saved-carts')
    expect(valueOf(model.workspaces.get())?.[0]?.id).toBe('saved-carts')
    expect(draft.draft.get().text).toBe('')
  })

  test('a failed create keeps the draft, and Try again sends the same message', async () => {
    const server = new FakeApiServer()
    server.json(
      'POST',
      workspacesPath(org),
      {
        error: {
          code: 'start_failed',
          message: 'The cloud computer did not start.',
        },
      },
      502,
    )
    const draft = (await loaded(server)).newWorkspace(null)
    draft.setText('Fix the flaky cart test.')
    expect(await draft.send(defaults)).toBeNull()
    expect(draft.create.get()).toMatchObject({
      state: 'failed',
      error: { code: 'start_failed' },
    })
    expect(draft.draft.get().text).toBe('Fix the flaky cart test.')
    await draft.send(defaults)
    const [first, second] = server.requests.slice(-2)
    const firstBody = await first.json()
    expect(firstBody).not.toHaveProperty('sectionId')
    expect((await second.json()).firstMessage.id).toBe(
      firstBody.firstMessage.id,
    )
  })
})
