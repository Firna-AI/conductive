import { describe, expect, it, vi } from 'vitest'
import { unreadable, uploadsSettled } from '../../app/draft-files.test-support'
import { fileMark } from '../../app/draft-marks'
import { pickChatFiles } from './draft-files.test-support'
import type { FileReply, FileTransport } from '../../app/api/client'
import {
  attachmentUploadPartPath,
  attachmentUploadStartPath,
} from '../../shared/messages'
import { sessionPaths } from '../../shared/sessions'
import { sentParts } from '../../test-support/fake-files'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { deferred } from '../../test-support/mount'
import { record } from '../api/json'
import { chatFor } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const id = FAKE_IDS.session
const target = { type: 'workspace', workspaceId: ws } as const
const startPath = attachmentUploadStartPath(org, target)
const partPath = (partNumber: number) =>
  attachmentUploadPartPath(org, target, FAKE_IDS.upload, partNumber)
const messages = sessionPaths.messages(org, ws, id)
const shortly = { timeout: 10_000 }
const file = (name = 'overlap.png') =>
  new File(['png'], name, { type: 'image/png' })
const isPart = (request: Request, partNumber: number) =>
  request.method === 'PUT' &&
  new URL(request.url).pathname === partPath(partNumber)
const isStart = (request: Request) =>
  request.method === 'POST' && new URL(request.url).pathname === startPath
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

/** Each raw part that the fake got, as its path and its bytes. */
async function parts(requests: readonly Request[]) {
  return (await sentParts(requests)).map(({ path, text }) => `${path} ${text}`)
}

/**
 * Runs the wait of `ms` before a retry, once the upload waits that long on
 * the timers of the chat. Other timers of the chat keep waiting.
 */
async function runWait(chat: ReturnType<typeof chatFor>, ms: number) {
  await vi.waitFor(() => expect(chat.timers.waits()).toContain(ms), shortly)
  chat.timers.run(ms)
}

/** A chat whose first part waits, and whose held requests keep their signals. */
function chatThatHolds() {
  const uploads: Request[] = []
  const chat = chatFor({
    conversation: 'history',
    hold: (request) => isPart(request, 1) && uploads.push(request) === 1,
  })
  return { chat, uploads }
}

describe('the files of a chat draft', () => {
  it('keeps a failed upload with its receipts, Send waits, and Try again sends only the part with no receipt', async () => {
    let failures = 0
    const chat = chatFor({
      conversation: 'history',
      answer: async (request) => {
        // The file of three bytes goes in parts of two bytes. Its second
        // part fails at its first send and at each of its three retries.
        if (isStart(request)) {
          const parts = { partSizeBytes: 2, partCount: 2 }
          const uploadId = FAKE_IDS.upload
          return Response.json({ uploadId, ...parts }, { status: 201 })
        }
        if (!isPart(request, 2)) return null
        if ((failures += 1) <= 4) {
          return refusal('attachment_upload_failed', 'Try again.', 503)
        }
        return Response.json({ partNumber: 2, etag: 'etag-2' })
      },
    })
    await chat.controller.start()
    chat.controller.setDraft(id, 'See the screenshot.')
    const picking = pickChatFiles(chat, id, [file()])
    for (const ms of [1_000, 2_000, 4_000]) await runWait(chat, ms)
    await picking
    const [failed] = chat.draftOf(id)?.files ?? []
    await chat.controller.send(id)
    const whileFailed = chat.requests('POST', messages).length
    const source = chat.controller.draftFiles(chat.draftOf(id)?.id ?? 'missing')
    source.retry(failed?.id ?? 'missing')
    await uploadsSettled(source.files, source.subscribe)
    await chat.controller.send(id)
    const sent = await chat.bodies('POST', messages)
    expect({
      failed: failed?.state,
      whileFailed,
      starts: chat.requests('POST', startPath).length,
      parts: await parts(chat.server.requests),
      sent: sent.map((body) => record(body).attachmentIds),
    }).toEqual({
      failed: 'failed',
      whileFailed: 0,
      starts: 1,
      // Part 2 failed at its first send and at its three retries. Try
      // again sent it once more, in the same upload.
      parts: [
        `${partPath(1)} pn`,
        `${partPath(2)} g`,
        `${partPath(2)} g`,
        `${partPath(2)} g`,
        `${partPath(2)} g`,
        `${partPath(2)} g`,
      ],
      sent: [['attachment-1']],
    })
  })

  it('shows the bytes that the browser measured while a file uploads', async () => {
    const reply = deferred<FileReply>()
    const started = deferred<(sentBytes: number) => void>()
    const files: FileTransport = ({ progress }) => {
      started.resolve(progress)
      return reply.promise
    }
    const chat = chatFor({ conversation: 'history', files })
    await chat.controller.start()
    const uploading = pickChatFiles(chat, id, [file()])
    const measure = await started.promise
    const sentBytes = () =>
      chat
        .draftOf(id)
        ?.files.map((item) =>
          item.state === 'uploading' ? item.sentBytes : item.state,
        )
    const before = sentBytes()
    measure(2)
    const measured = sentBytes()
    reply.resolve({ status: 200, body: { partNumber: 1, etag: 'etag-1' } })
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
    await pickChatFiles(
      chat,
      id,
      [
        sized('recording.mov', 1_000_000_001),
        file(),
        sized('archive.zip', 1_000_000_001),
      ],
      unreadable('Pictures', 'Design notes'),
    )
    const picked = chat.draftOf(id)
    const uploaded = await chat.bodies('POST', startPath)
    await chat.controller.send(id)
    const [sent] = await chat.bodies('POST', messages)
    expect({
      refused: picked?.refused,
      folders: picked?.refusedFolders,
      uploaded: uploaded.map((body) => record(body).name),
      sent: record(sent).attachmentIds,
      afterSend: chat.draftOf(id)?.refused,
      foldersAfterSend: chat.draftOf(id)?.refusedFolders,
    }).toEqual({
      refused: ['recording.mov', 'archive.zip'],
      folders: ['Pictures', 'Design notes'],
      uploaded: ['overlap.png'],
      sent: ['attachment-1'],
      afterSend: [],
      foldersAfterSend: [],
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
    expect({
      aborted,
      states: chat.draftOf(id)?.files.map((item) => item.state),
      parts: uploads.map(({ url }) => new URL(url).pathname),
      starts: await chat.bodies('POST', startPath),
    }).toEqual({
      aborted: true,
      states: [],
      parts: [partPath(1)],
      starts: [{ name: 'overlap.png', mediaType: 'image/png', sizeBytes: 3 }],
    })
  })

  it('turns an expired file failed when Send finds it gone, keeps the text, and Try again uploads the kept File as a new upload', async () => {
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
    const sent = await chat.bodies('POST', messages)
    expect({
      expired: expired?.files.map((item) =>
        item.state === 'failed' ? item.error.message : item.state,
      ),
      text: expired?.text,
      starts: chat.requests('POST', startPath).length,
      parts: await parts(chat.server.requests),
      sent: sent.map((body) => record(body).attachmentIds),
    }).toEqual({
      expired: [gone],
      text: `See the screenshot. ${fileMark('file-1')} `,
      starts: 2,
      parts: [`${partPath(1)} png`, `${partPath(1)} png`],
      sent: [['attachment-1'], ['attachment-1']],
    })
  })
})
