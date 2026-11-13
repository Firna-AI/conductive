import { describe, expect, test, vi } from 'vitest'
import { attachmentPath } from '../shared/attachment-paths'
import { pickWorkspaceFiles, unreadable } from './draft-files.test-support'
import { mentionText } from '../shared/mention-text'
import { fileMark } from './draft-marks'
import { attachmentUploadPath } from '../shared/messages'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { sentFiles } from '../test-support/fake-files'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { readyIds } from './draft-files'
import { OrgModel } from './org-model'
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const createPath = workspacesPath(org)
const uploadPath = attachmentUploadPath(org, {
  type: 'new-workspace',
  messageId: '',
})
const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}
const shortly = { timeout: 10_000 }

async function newForm(server: FakeApiServer, held?: HeldRequests) {
  const model = new OrgModel(testServices(server, { fetch: held?.fetch }), org)
  await model.reload('list')
  return { model, form: model.newWorkspace(null) }
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
        sized('recording.mov', 25_000_001),
        sized('limit.bin', 25_000_000),
        notes(),
        sized('archive.zip', 25_000_001),
      ],
      unreadable('Pictures', 'Design notes'),
    )
    const picked = form.draft.get()
    const uploaded = await sentFiles(server.requests)
    await form.send(defaults)
    expect({
      refused: picked.refused,
      folders: picked.refusedFolders,
      uploaded: uploaded.map((file) => file.query.name),
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

  test('Try again uploads the kept File of a failed upload, and the message keeps its ID and its text', async () => {
    const server = new FakeApiServer()
    const { form } = await newForm(server)
    form.setText('Fix the flaky cart test.')
    const { messageId } = form.draft.get()
    server.json(
      'POST',
      uploadPath,
      { error: { code: 'internal_error', message: 'The request failed.' } },
      502,
    )
    await pickWorkspaceFiles(form, [notes()])
    const [failed] = form.draft.get().files
    server.json(
      'POST',
      uploadPath,
      {
        attachment: {
          id: 'draft-attachment-2',
          path: await attachmentPath({
            id: 'draft-attachment-2',
            name: 'notes.txt',
          }),
          name: 'notes.txt',
          kind: 'file',
          mediaType: 'text/plain',
          sizeBytes: 10,
        },
      },
      201,
    )
    await form.retryFile(failed?.id ?? 'missing')
    const [first, second] = await sentFiles(server.requests)
    await form.send(defaults)
    expect(second).toEqual(first)
    expect({
      failed: failed?.state,
      sent: await lastCreate(server),
    }).toEqual({
      failed: 'failed',
      sent: {
        repositoryId: 'storefront',
        firstMessage: {
          id: messageId,
          text: `Fix the flaky cart test. ${mentionText(await attachmentPath({ id: 'draft-attachment-2', name: 'notes.txt' }), false)} `,
          attachmentIds: ['draft-attachment-2'],
          choice: defaults.choice,
        },
      },
    })
  })

  test('a change of person aborts the upload that runs, drops the files, and starts no later upload', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const { model, form } = await newForm(server, held)
    held.holdAnswer('POST', uploadPath)
    const attaching = pickWorkspaceFiles(form, [notes(), notes('later.txt')])
    await vi.waitFor(async () => {
      expect(await sentFiles(server.requests)).toHaveLength(1)
    }, shortly)
    model.creations.clear()
    const dropped = form.draft.get().files
    held.release('POST', uploadPath)
    await attaching
    expect({
      aborted: server.requests.at(-1)?.signal.aborted,
      dropped,
      late: form.draft.get().files,
      uploaded: (await sentFiles(server.requests)).map((file) => file.text),
    }).toEqual({
      aborted: true,
      dropped: [],
      late: [],
      uploaded: ['Cart notes'],
    })
  })

  test('Remove aborts the upload of its file, and the late reply brings back nothing', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const { form } = await newForm(server, held)
    held.holdAnswer('POST', uploadPath)
    const attaching = pickWorkspaceFiles(form, [notes()])
    await vi.waitFor(async () => {
      expect(await sentFiles(server.requests)).toHaveLength(1)
    }, shortly)
    form.setText('')
    held.release('POST', uploadPath)
    await attaching
    expect({
      aborted: server.requests.at(-1)?.signal.aborted,
      files: form.draft.get().files,
    }).toEqual({ aborted: true, files: [] })
  })

  test('a create that finds an expired file turns it failed, keeps the text, and Try again uploads the kept File', async () => {
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
    const [first, second] = await sentFiles(server.requests)
    expect(second).toEqual(first)
    expect({
      expired: expired.files.map((item) => item.state),
      text: expired.text,
      again: readyIds(form.draft.get().files),
    }).toEqual({
      expired: ['failed'],
      text: `Let shoppers save their cart. ${fileMark('client-2')} `,
      again: ['draft-attachment-1'],
    })
  })
})
