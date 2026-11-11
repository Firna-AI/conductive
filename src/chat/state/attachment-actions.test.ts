import { describe, expect, it, vi } from 'vitest'
import { uploadsSettled } from '../../app/draft-files.test-support'
import { fileMark } from '../../app/draft-marks'
import { pickChatFiles } from './draft-files.test-support'
import type { FileReply, FileTransport } from '../../app/api/client'
import {
  attachmentUploadPath,
  attachmentUploadUrl,
} from '../../shared/messages'
import { sessionPaths } from '../../shared/sessions'
import { sentFiles } from '../../test-support/fake-files'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { deferred } from '../../test-support/mount'
import { record } from '../api/json'
import { chatFor } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const id = FAKE_IDS.session
const uploadPath = attachmentUploadPath(org, {
  type: 'workspace',
  workspaceId: ws,
})
const messages = sessionPaths.messages(org, ws, id)
const shortly = { timeout: 10_000 }
const file = (name = 'overlap.png') =>
  new File(['png'], name, { type: 'image/png' })
const isUpload = (request: Request) =>
  request.method === 'POST' && new URL(request.url).pathname === uploadPath
const isSend = (request: Request) =>
  request.method === 'POST' && new URL(request.url).pathname === messages

/** An API error body, as the Worker sends it. */
function refusal(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

/** A file that says it has `size` bytes, without those bytes in memory. */
function sized(name: string, size: number): File {
  const big = new File(['x'], name)
  Object.defineProperty(big, 'size', { value: size })
  return big
}

/** A chat whose uploads wait, and whose held requests keep their signals. */
function chatThatHolds() {
  const uploads: Request[] = []
  const chat = chatFor({
    conversation: 'history',
    hold: (request) => isUpload(request) && uploads.push(request) === 1,
  })
  return { chat, uploads }
}

describe('the files of a chat draft', () => {
  it('keeps a failed upload with its file, Send waits, and Try again uploads the same file', async () => {
    let uploads = 0
    const chat = chatFor({
      conversation: 'history',
      answer: async (request) =>
        isUpload(request) && (uploads += 1) === 1
          ? refusal('internal_error', 'The request failed.', 502)
          : null,
    })
    await chat.controller.start()
    chat.controller.setDraft(id, 'See the screenshot.')
    await pickChatFiles(chat, id, [file()])
    const [failed] = chat.draftOf(id)?.files ?? []
    await chat.controller.send(id)
    const whileFailed = chat.requests('POST', messages).length
    const source = chat.controller.draftFiles(chat.draftOf(id)?.id ?? 'missing')
    source.retry(failed?.id ?? 'missing')
    await uploadsSettled(source.files, source.subscribe)
    await chat.controller.send(id)
    const [first, second] = await sentFiles(chat.server.requests)
    const sent = await chat.bodies('POST', messages)
    expect(second).toEqual(first)
    expect({
      first,
      failed: failed?.state,
      whileFailed,
      sent: sent.map((body) => record(body).attachmentIds),
    }).toEqual({
      first: {
        path: uploadPath,
        query: { name: 'overlap.png', mediaType: 'image/png' },
        text: 'png',
      },
      failed: 'failed',
      whileFailed: 0,
      sent: [['attachment-1']],
    })
  })

  it('shows the bytes that the browser measured while a file uploads', async () => {
    const reply = deferred<FileReply>()
    let measure: (sentBytes: number) => void = () => {}
    const files: FileTransport = ({ progress }) => {
      measure = progress
      return reply.promise
    }
    const chat = chatFor({ conversation: 'history', files })
    await chat.controller.start()
    const uploading = pickChatFiles(chat, id, [file()])
    const sentBytes = () =>
      chat
        .draftOf(id)
        ?.files.map((item) =>
          item.state === 'uploading' ? item.sentBytes : item.state,
        )
    const before = sentBytes()
    measure(2)
    const measured = sentBytes()
    const attachment = {
      id: 'attachment-7',
      name: 'overlap.png',
      kind: 'image',
      mediaType: 'image/png',
      sizeBytes: 3,
    }
    reply.resolve({ status: 201, body: { attachment } })
    await uploading
    expect({ before, measured, done: sentBytes() }).toEqual({
      before: [null],
      measured: [2],
      done: ['ready'],
    })
  })

  it('refuses a file over the limit with no upload, and uploads the other files of the pick', async () => {
    const chat = chatFor({ conversation: 'history' })
    await chat.controller.start()
    chat.controller.setDraft(id, 'See the recording.')
    await pickChatFiles(chat, id, [sized('recording.mov', 25_000_001), file()])
    const picked = chat.draftOf(id)
    const uploaded = await sentFiles(chat.server.requests)
    await chat.controller.send(id)
    const [sent] = await chat.bodies('POST', messages)
    expect({
      refused: picked?.refused,
      uploaded: uploaded.map((item) => item.query.name),
      sent: record(sent).attachmentIds,
      afterSend: chat.draftOf(id)?.refused,
    }).toEqual({
      refused: ['recording.mov'],
      uploaded: ['overlap.png'],
      sent: ['attachment-1'],
      afterSend: [],
    })
  })

  it('aborts the upload of a removed file, ignores its late reply, and Send takes no file', async () => {
    const { chat, uploads } = chatThatHolds()
    await chat.controller.start()
    chat.controller.setDraft(id, 'See the screenshot.')
    const uploading = pickChatFiles(chat, id, [file()])
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    chat.controller.setDraft(id, 'See the screenshot.')
    const aborted = uploads[0]?.signal.aborted
    chat.held.splice(0, 1)[0]()
    await uploading
    const late = chat.draftOf(id)?.files
    await chat.controller.send(id)
    const [sent] = await chat.bodies('POST', messages)
    expect({ aborted, late, sent: record(sent).attachmentIds }).toEqual({
      aborted: true,
      late: [],
      sent: [],
    })
  })

  it('aborts the upload when the chat stops, ignores its late reply, and starts no later upload', async () => {
    const { chat, uploads } = chatThatHolds()
    await chat.controller.start()
    const uploading = pickChatFiles(chat, id, [file(), file('later.png')])
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    chat.controller.stop()
    const aborted = uploads[0]?.signal.aborted
    chat.held.splice(0, 1)[0]()
    await uploading
    const target = { type: 'workspace', workspaceId: ws } as const
    expect({
      aborted,
      states: chat.draftOf(id)?.files.map((item) => item.state),
      requests: uploads.map(({ url }) => {
        const { pathname, search } = new URL(url)
        return `${pathname}${search}`
      }),
    }).toEqual({
      aborted: true,
      states: [],
      requests: [
        attachmentUploadUrl(org, target, {
          name: 'overlap.png',
          mediaType: 'image/png',
        }),
      ],
    })
  })

  it('turns an expired file failed when Send finds it gone, keeps the text, and Try again uploads the kept File', async () => {
    let sends = 0
    const gone = 'The attached file is not available. Upload it again.'
    const chat = chatFor({
      conversation: 'history',
      answer: async (request) =>
        isSend(request) && (sends += 1) === 1
          ? refusal('attachment_not_found', gone, 404)
          : null,
    })
    await chat.controller.start()
    chat.controller.setDraft(id, 'See the screenshot.')
    await pickChatFiles(chat, id, [file()])
    await chat.controller.send(id)
    const expired = chat.draftOf(id)
    const source = chat.controller.draftFiles(expired?.id ?? 'missing')
    source.retry(expired?.files[0]?.id ?? 'missing')
    await uploadsSettled(source.files, source.subscribe)
    await chat.controller.send(id)
    const [first, second] = await sentFiles(chat.server.requests)
    const sent = await chat.bodies('POST', messages)
    expect(second).toEqual(first)
    expect({
      expired: expired?.files.map((item) =>
        item.state === 'failed' ? item.error.message : item.state,
      ),
      text: expired?.text,
      sent: sent.map((body) => record(body).attachmentIds),
    }).toEqual({
      expired: [gone],
      text: `See the screenshot. ${fileMark('file-1')} `,
      sent: [['attachment-1'], ['attachment-1']],
    })
  })
})
