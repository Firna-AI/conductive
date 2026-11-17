import { describe, expect, test } from 'vitest'
import { attachmentPath } from '../shared/attachment-paths'
import { pickWorkspaceFiles, unreadable } from './draft-files.test-support'
import { mentionText } from '../shared/mention-text'
import { fileMark } from './draft-marks'
import {
  attachmentUploadPartPath,
  attachmentUploadStartPath,
} from '../shared/messages'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { sentParts } from '../test-support/fake-files'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const draftTarget = { type: 'new-workspace', messageId: '' } as const
const startPath = attachmentUploadStartPath(org, draftTarget)
const choice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
  fast: false,
} as const
const defaults = {
  repositoryId: 'storefront',
  choice: {
    agent: 'claude',
    model: 'Opus 5.5',
    effort: 'high',
    fast: false,
  } as const,
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
    await pickWorkspaceFiles(draft, [
      new File(['Cart notes'], 'notes.txt', { type: 'text/plain' }),
    ])
    // The file goes before the workspace exists, and its start names the
    // message.
    const starts = received(server, 'POST', startPath).map(
      async (request): Promise<unknown> => request.clone().json(),
    )
    expect({
      starts: await Promise.all(starts),
      parts: await sentParts(server.requests),
    }).toEqual({
      starts: [
        {
          name: 'notes.txt',
          mediaType: 'text/plain',
          sizeBytes: 10,
          messageId: 'client-1',
        },
      ],
      parts: [
        {
          path: attachmentUploadPartPath(org, draftTarget, FAKE_IDS.upload, 1),
          text: 'Cart notes',
        },
      ],
    })
    server.json(
      'POST',
      startPath,
      { error: { code: 'too_large', message: 'The file is too large.' } },
      413,
    )
    await pickWorkspaceFiles(draft, [new File(['Big'], 'big.bin')])
    const failed = draft.draft.get().files.at(-1)
    expect(failed).toMatchObject({
      state: 'failed',
      error: { code: 'too_large' },
    })
    // Send waits for the failed file until the user takes it off.
    expect(await draft.send(defaults)).toBeNull()
    draft.setText(`Let shoppers save their cart. ${fileMark('client-2')}  `)
    const created = await draft.send(defaults)
    expect(await server.requests.at(-1)?.json()).toEqual({
      repositoryId: 'billing-service',
      sectionId: 'checkout',
      firstMessage: {
        id: 'client-1',
        text: `Let shoppers save their cart. ${mentionText(await attachmentPath({ id: 'draft-attachment-1', name: 'postcode-overlap.png' }), false)}  `,
        attachmentIds: ['draft-attachment-1'],
        choice,
      },
    })
    expect(created?.workspace.id).toBe('saved-carts')
    expect(valueOf(model.workspaces.get())?.[0]?.id).toBe('saved-carts')
    expect(draft.draft.get().text).toBe('')
    expect(draft.draft.get().files).toEqual([])
    draft.setText('A newer draft')
    if (!created) throw new Error('The create did not return its workspace.')
    model.putWorkspace({ ...created.workspace, state: 'error' })
    expect(valueOf(model.workspaces.get())?.[0]).toMatchObject({
      id: 'saved-carts',
      state: 'error',
    })
    expect(draft.draft.get()).toMatchObject({
      text: 'A newer draft',
      files: [],
    })
    expect(draft.draft.get().messageId).not.toBe('client-1')
  })

  test('a picked section wins over the section of the draft until the send', async () => {
    const server = new FakeApiServer()
    const draft = (await loaded(server)).newWorkspace(null)
    draft.setSection('checkout')
    draft.setText('Fix the flaky cart test.')
    await draft.send(defaults)
    const [sent] = server.requests.slice(-1)
    expect({
      sent: (await sent.json()).sectionId,
      after: draft.draft.get().sectionId,
    }).toEqual({ sent: 'checkout', after: null })
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
    await pickWorkspaceFiles(draft, [notes()])
    expect(await draft.send(defaults)).toBeNull()
    expect(draft.create.get()).toMatchObject({
      state: 'failed',
      error: { code: 'start_failed' },
    })
    expect(draft.draft.get().text).toBe(
      `Fix the flaky cart test. ${fileMark('client-2')} `,
    )
    expect(draft.draft.get()).toMatchObject({
      files: [{ state: 'ready', attachment: { id: 'draft-attachment-1' } }],
      messageId: 'client-1',
    })
    draft.setText(`Fix the flaky cart test first. ${fileMark('client-2')} `)
    await draft.send(defaults)
    const [first, second] = server.requests.slice(-2)
    const firstBody = await first.json()
    const secondBody = await second.json()
    expect(firstBody).not.toHaveProperty('sectionId')
    expect(secondBody.firstMessage.id).toBe(firstBody.firstMessage.id)
    expect(draft.draft.get()).toMatchObject({
      text: `Fix the flaky cart test first. ${fileMark('client-2')} `,
      files: [{ state: 'ready', attachment: { id: 'draft-attachment-1' } }],
      messageId: 'client-1',
    })
    expect(firstBody.firstMessage.attachmentIds).toEqual(['draft-attachment-1'])
    expect(secondBody.firstMessage).toEqual({
      id: 'client-1',
      text: `Fix the flaky cart test first. ${mentionText(await attachmentPath({ id: 'draft-attachment-1', name: 'postcode-overlap.png' }), false)} `,
      attachmentIds: ['draft-attachment-1'],
      choice: defaults.choice,
    })
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
    held.hold('POST', startPath)
    const uploading = pickWorkspaceFiles(draft, [notes()])
    await draft.send(defaults)
    const whileUploading = received(server, 'POST', createPath).length
    held.release('POST', startPath)
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
          text: `Fix the flaky cart test. ${mentionText(await attachmentPath({ id: 'draft-attachment-1', name: 'postcode-overlap.png' }), false)} `,
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
    await pickWorkspaceFiles(draft, [notes()])
    expect(draft.attach([], unreadable('Ignored folder'))).toEqual([])
    expect(draft.draft.get()).toMatchObject({ refused: [], refusedFolders: [] })
    held.release('POST', createPath)
    const created = await creating
    expect({
      uploads: received(server, 'POST', startPath).length,
      created: created?.workspace.id,
      files: draft.draft.get().files,
      folders: draft.draft.get().refusedFolders,
    }).toEqual({ uploads: 0, created: 'saved-carts', files: [], folders: [] })
  })
})
