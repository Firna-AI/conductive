import { describe, expect, test, vi } from 'vitest'
import { attachmentPath } from '../shared/attachment-paths'
import { pickWorkspaceFiles, unreadable } from './draft-files.test-support'
import { mentionText } from '../shared/mention-text'
import { fileMark } from './draft-marks'
import {
  attachmentUploadCompletePath,
  attachmentUploadPartPath,
  attachmentUploadStartPath,
} from '../shared/messages'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { sentParts } from '../test-support/fake-files'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { record } from './api/parse'
import type { FetchLike } from './api/client'
import { readyIds } from './draft-files'
import { OrgModel } from './org-model'
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const draft = { type: 'new-workspace', messageId: '' } as const
const startPath = attachmentUploadStartPath(org, draft)
const partPath = attachmentUploadPartPath(org, draft, FAKE_IDS.upload, 1)
const completePath = attachmentUploadCompletePath(org, draft, FAKE_IDS.upload)
const defaults = {
  repositoryId: 'storefront',
  choice: {
    agent: 'claude',
    model: 'Opus 5.5',
    effort: 'high',
    fast: false,
  } as const,
}
const shortly = { timeout: 10_000 }

/**
 * A New workspace form. Its fetch keeps the signal that the app gives each
 * part, because the copy of a request that the fake server keeps can lose
 * the abort of its signal.
 */
async function newForm(server: FakeApiServer, held?: HeldRequests) {
  const signals: AbortSignal[] = []
  const next = held?.fetch ?? server.fetch
  const fetch: FetchLike = (input, init) => {
    if (init?.method === 'PUT' && init.signal) signals.push(init.signal)
    return next(input, init)
  }
  const model = new OrgModel(testServices(server, { fetch }), org)
  await model.reload('list')
  return { model, form: model.newWorkspace(null), signals }
}

function notes(name = 'notes.txt'): File {
  return new File(['Cart notes'], name, { type: 'text/plain' })
}

/** A file that says it has `size` bytes, without those bytes in memory. */
function sized(name: string, size: number): File {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/** The JSON bodies of the requests with this method and path, in order. */
function bodies(server: FakeApiServer, method: string, path: string) {
  return Promise.all(
    server.requests
      .filter(
        (request) =>
          request.method === method && new URL(request.url).pathname === path,
      )
      .map(async (request): Promise<unknown> => request.clone().json()),
  )
}

/** The bytes of each part that the server got, in order. */
async function partTexts(server: FakeApiServer): Promise<string[]> {
  return (await sentParts(server.requests)).map(({ text }) => text)
}

/** The JSON body of the last create request. */
async function lastCreate(server: FakeApiServer) {
  const creates = server.requests.filter(
    (request) =>
      request.method === 'POST' && new URL(request.url).pathname === createPath,
  )
  const body: unknown = await creates.at(-1)?.clone().json()
  return body
}

describe('the files of a New workspace draft', () => {
  test('a pick refuses a file over the limit with no upload, and its other files upload and go with the message', async () => {
    const server = new FakeApiServer()
    const { form } = await newForm(server)
    form.setText('Let shoppers save their cart.')
    await pickWorkspaceFiles(
      form,
      [
        sized('recording.mov', 1_000_000_001),
        sized('limit.bin', 1_000_000_000),
        notes(),
        sized('archive.zip', 1_000_000_001),
      ],
      unreadable('Pictures', 'Design notes'),
    )
    const picked = form.draft.get()
    const uploaded = await bodies(server, 'POST', startPath)
    await form.send(defaults)
    expect({
      refused: picked.refused,
      folders: picked.refusedFolders,
      uploaded: uploaded.map((body) => record(body).name),
      ready: picked.files.map((item) => item.state),
      sent: await lastCreate(server),
      foldersAfterSend: form.draft.get().refusedFolders,
    }).toMatchObject({
      refused: ['recording.mov', 'archive.zip'],
      folders: ['Pictures', 'Design notes'],
      uploaded: ['limit.bin', 'notes.txt'],
      ready: ['ready', 'ready'],
      foldersAfterSend: [],
      sent: {
        firstMessage: {
          attachmentIds: ['draft-attachment-1', 'draft-attachment-1'],
        },
      },
    })
  })

  test('Try again of a failed upload sends only what the Worker did not confirm, and the message keeps its ID and its text', async () => {
    const server = new FakeApiServer()
    const { form } = await newForm(server)
    form.setText('Fix the flaky cart test.')
    const { messageId } = form.draft.get()
    server.json(
      'POST',
      completePath,
      { error: { code: 'internal_error', message: 'The request failed.' } },
      502,
    )
    await pickWorkspaceFiles(form, [notes()])
    const [failed] = form.draft.get().files
    const path = await attachmentPath({
      id: 'draft-attachment-2',
      name: 'notes.txt',
    })
    server.json(
      'POST',
      completePath,
      {
        attachment: {
          id: 'draft-attachment-2',
          path,
          name: 'notes.txt',
          kind: 'file',
          mediaType: 'text/plain',
          sizeBytes: 10,
        },
      },
      201,
    )
    await form.retryFile(failed?.id ?? 'missing')
    await form.send(defaults)
    expect({
      failed: failed?.state,
      starts: await bodies(server, 'POST', startPath),
      parts: await partTexts(server),
      completes: (await bodies(server, 'POST', completePath)).length,
      sent: await lastCreate(server),
    }).toEqual({
      failed: 'failed',
      starts: [
        {
          name: 'notes.txt',
          mediaType: 'text/plain',
          sizeBytes: 10,
          messageId,
        },
      ],
      parts: ['Cart notes'],
      completes: 2,
      sent: {
        repositoryId: 'storefront',
        firstMessage: {
          id: messageId,
          text: `Fix the flaky cart test. ${mentionText(path, false)} `,
          attachmentIds: ['draft-attachment-2'],
          choice: defaults.choice,
        },
      },
    })
  })

  test('a change of person aborts the upload that runs, drops the files, and starts no later upload', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const { model, form, signals } = await newForm(server, held)
    held.holdAnswer('PUT', partPath)
    const attaching = pickWorkspaceFiles(form, [notes(), notes('later.txt')])
    await vi.waitFor(async () => {
      expect(await partTexts(server)).toHaveLength(1)
    }, shortly)
    model.creations.clear()
    const dropped = form.draft.get().files
    held.release('PUT', partPath)
    await attaching
    expect({
      aborted: signals.map((signal) => signal.aborted),
      dropped,
      late: form.draft.get().files,
      uploaded: await partTexts(server),
      starts: (await bodies(server, 'POST', startPath)).length,
    }).toEqual({
      aborted: [true],
      dropped: [],
      late: [],
      uploaded: ['Cart notes'],
      starts: 1,
    })
  })

  test('Remove aborts the upload of its file, and the late reply brings back nothing', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const { form, signals } = await newForm(server, held)
    held.holdAnswer('PUT', partPath)
    const attaching = pickWorkspaceFiles(form, [notes()])
    await vi.waitFor(async () => {
      expect(await partTexts(server)).toHaveLength(1)
    }, shortly)
    form.setText('')
    held.release('PUT', partPath)
    await attaching
    expect({
      aborted: signals.map((signal) => signal.aborted),
      files: form.draft.get().files,
    }).toEqual({ aborted: [true], files: [] })
  })

  test('a create that finds an expired file turns it failed, keeps the text, and Try again uploads the kept File as a new upload', async () => {
    const server = new FakeApiServer()
    const { form } = await newForm(server)
    form.setText('Let shoppers save their cart.')
    await pickWorkspaceFiles(form, [notes()])
    server.json(
      'POST',
      createPath,
      {
        error: {
          code: 'attachment_not_found',
          message: 'The attached file is not available. Upload it again.',
        },
      },
      404,
    )
    expect(await form.send(defaults)).toBeNull()
    const expired = form.draft.get()
    await form.retryFile(expired.files[0]?.id ?? 'missing')
    expect({
      expired: expired.files.map((item) => item.state),
      text: expired.text,
      starts: (await bodies(server, 'POST', startPath)).length,
      parts: await partTexts(server),
      again: readyIds(form.draft.get().files),
    }).toEqual({
      expired: ['failed'],
      text: `Let shoppers save their cart. ${fileMark('client-2')} `,
      starts: 2,
      parts: ['Cart notes', 'Cart notes'],
      again: ['draft-attachment-1'],
    })
  })
})
