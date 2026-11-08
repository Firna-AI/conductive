import { describe, expect, test } from 'vitest'
import { attachmentUploadPath } from '../shared/messages'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { sentFiles } from '../test-support/fake-files'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const uploadPath = attachmentUploadPath(org, {
  type: 'new-workspace',
  messageId: '',
})
const reply = workspaceFixtures().created
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
    // The raw file goes before the workspace exists, and names the message.
    expect(await sentFiles(server.requests)).toEqual([
      {
        path: uploadPath,
        query: {
          name: 'notes.txt',
          mediaType: 'text/plain',
          messageId: 'client-1',
        },
        text: 'Cart notes',
      },
    ])
    server.json(
      'POST',
      uploadPath,
      { error: { code: 'too_large', message: 'The file is too large.' } },
      413,
    )
    await draft.attach([new File(['Big'], 'big.bin')])
    const failed = draft.draft.get().files.at(-1)
    expect(failed).toMatchObject({
      state: 'failed',
      error: { code: 'too_large' },
    })
    // Send waits for the failed file until the user takes it off.
    expect(await draft.send(defaults)).toBeNull()
    draft.removeFile(failed?.id ?? '')
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
    expect(draft.draft.get().files).toEqual([])
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
    held.hold('POST', uploadPath)
    const uploading = draft.attach([notes()])
    await draft.send(defaults)
    const whileUploading = received(server, 'POST', createPath).length
    held.release('POST', uploadPath)
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
      uploads: received(server, 'POST', uploadPath).length,
      created: created?.workspace.id,
      files: draft.draft.get().files,
    }).toEqual({ uploads: 0, created: 'saved-carts', files: [] })
  })

  test('a returned message keeps its edits and files until its retry gets another workspace', async () => {
    const server = new FakeApiServer()
    const model = await loaded(server)
    const form = model.newWorkspace(null)
    form.setText('Fix the flaky cart test.')
    await form.attach([notes()])
    await form.send(defaults)
    // The open of the new workspace answered 404: its start failed.
    model.creations.removed('saved-carts')
    const returned = model.creations.of('saved-carts').get()
    expect(returned?.state).toBe('failed')
    if (returned?.state !== 'failed') throw new Error('No form came back.')
    const retry = returned.form
    retry.setText('Fix the flaky cart test first.')

    // The server answers with the failed workspace again.
    expect(await retry.send(defaults)).toBeNull()
    expect(retry.draft.get()).toMatchObject({
      text: 'Fix the flaky cart test first.',
      files: [{ state: 'ready', attachment: { id: 'draft-attachment-1' } }],
      messageId: 'client-1',
    })
    expect(retry.create.get()).toEqual({ state: 'not-started' })
    expect(model.creations.of('saved-carts').get()?.state).toBe('failed')

    const workspace = { ...reply.workspace, id: 'gift-cards' }
    server.json('POST', createPath, { ...reply, workspace }, 201)
    expect((await retry.send(defaults))?.workspace.id).toBe('gift-cards')
    expect(await received(server, 'POST', createPath).at(-1)?.json()).toEqual({
      repositoryId: 'storefront',
      firstMessage: {
        id: 'client-1',
        text: 'Fix the flaky cart test first.',
        attachmentIds: ['draft-attachment-1'],
        choice: defaults.choice,
      },
    })
    expect(model.creations.of('saved-carts').get()).toBeNull()
    expect(model.creations.of('gift-cards').get()?.state).toBe('starting')
  })
})
