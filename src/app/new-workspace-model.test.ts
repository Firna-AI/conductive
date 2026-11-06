import { describe, expect, test } from 'vitest'
import { DRAFT_ATTACHMENTS_PATH } from '../shared/messages'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const choice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
} as const
const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}

async function loaded(server: FakeApiServer, held?: HeldRequests) {
  const model = new OrgModel(testServices(server, { fetch: held?.fetch }), org)
  await model.reload('list')
  return model
}

function notes(): File {
  return new File(['Cart notes'], 'notes.txt', { type: 'text/plain' })
}

/** The requests with this method and path that the server got, in their order. */
function received(server: FakeApiServer, method: string, path: string) {
  return server.requests.filter(
    (request) =>
      request.method === method && new URL(request.url).pathname === path,
  )
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
    server.json(
      'POST',
      DRAFT_ATTACHMENTS_PATH,
      { error: { code: 'too_large', message: 'The file is too large.' } },
      413,
    )
    await draft.attach([new File(['Big'], 'big.bin')])
    expect(draft.draft.get().upload.error?.code).toBe('too_large')
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
    expect(draft.draft.get().upload).toEqual({ pending: 0, error: null })
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

  test('Try again sends nothing while a file uploads, then sends the same message with the file', async () => {
    const server = new FakeApiServer()
    server.json(
      'POST',
      createPath,
      { error: { code: 'start_failed', message: 'It did not start.' } },
      502,
    )
    const held = new HeldRequests(server)
    const draft = (await loaded(server, held)).newWorkspace(null)
    draft.setText('Fix the flaky cart test.')
    await draft.send(defaults)
    held.hold('POST', DRAFT_ATTACHMENTS_PATH)
    const uploading = draft.attach([notes()])
    await draft.send(defaults)
    const whileUploading = received(server, 'POST', createPath).length
    held.release('POST', DRAFT_ATTACHMENTS_PATH)
    await uploading
    await draft.send(defaults)
    const creates = await Promise.all(
      received(server, 'POST', createPath).map((request) => request.json()),
    )
    const message = { id: 'client-1', text: 'Fix the flaky cart test.' }
    expect({
      whileUploading,
      sent: creates.map((body) => body.firstMessage),
    }).toEqual({
      whileUploading: 1,
      sent: [
        { ...message, attachmentIds: [], choice: defaults.choice },
        {
          ...message,
          attachmentIds: ['draft-attachment-1'],
          choice: defaults.choice,
        },
      ],
    })
  })

  test('a file that the user attaches while the create runs does not upload', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const draft = (await loaded(server, held)).newWorkspace('checkout')
    draft.setText('Let shoppers save their cart.')
    held.hold('POST', createPath)
    const creating = draft.send(defaults)
    await draft.attach([notes()])
    held.release('POST', createPath)
    const created = await creating
    expect({
      uploads: received(server, 'POST', DRAFT_ATTACHMENTS_PATH).length,
      created: created?.workspace.id,
      attachments: draft.draft.get().attachments,
    }).toEqual({ uploads: 0, created: 'saved-carts', attachments: [] })
  })
})
