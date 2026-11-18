import { describe, expect, it, vi } from 'vitest'
import { fileMark, literalText } from '../../app/draft-marks'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { record } from '../api/json'
import { controlledUploads, note } from '../../app/draft-files.test-support'
import { chatFor } from './test-kit'

const session = FAKE_IDS.session
const messages = sessionPaths.messages(
  FAKE_IDS.org,
  FAKE_IDS.workspace,
  session,
)

async function attached(hold = false, fail: boolean | 'missing' = false) {
  const uploads = controlledUploads()
  const chat = chatFor({
    conversation: 'history',
    uploads,
    hold: (request) => hold && request.url.endsWith('/messages'),
    answer: async (request) =>
      fail && request.url.endsWith('/messages')
        ? Response.json(
            {
              error: {
                code: fail === 'missing' ? 'attachment_not_found' : 'offline',
                message: 'Offline',
              },
            },
            { status: fail === 'missing' ? 404 : 503 },
          )
        : null,
  })
  await chat.controller.start()
  chat.controller.attachFiles(session, [note('first.txt'), note('second.txt')])
  chat.controller.setDraft(
    session,
    `${fileMark('file-1')} ${fileMark('file-2')}`,
  )
  await uploads.started(1)
  await uploads.finish(0, 'first', 'returned/first.txt')
  await uploads.started(2)
  await uploads.finish(1, 'second', 'returned/second file.txt')
  return { ...chat, ...uploads }
}

describe('sending draft marks', () => {
  it('sends a chat with only chips and ends its detached files', async () => {
    const chat = await attached()
    chat.controller.setDraft(session, fileMark('file-1'))
    await chat.controller.send(session)
    expect(await chat.bodies('POST', messages)).toMatchObject([
      { text: '@returned/first.txt', attachmentIds: ['first'] },
    ])
    expect(chat.draftOf(session)).toMatchObject({
      text: '',
      files: [],
      detached: [],
    })
  })

  it('writes returned path mentions at every mark and unique IDs in first appearance order', async () => {
    const chat = await attached()
    const literal = 'Read @src/\uE000literal\uE001-\uE0020.ts '
    chat.controller.setDraft(
      session,
      `${literalText(literal)}${fileMark('file-2')} then ${fileMark('file-1')} and ${fileMark('file-2')}`,
    )
    await chat.controller.send(session)
    expect(
      (await chat.bodies('POST', messages)).map((body) => record(body)),
    ).toMatchObject([
      {
        text: `${literal}@"returned/second file.txt" then @returned/first.txt and @"returned/second file.txt"`,
        attachmentIds: ['second', 'first'],
      },
    ])
    expect(chat.draftOf(session)).toMatchObject({
      text: '',
      files: [],
      detached: [],
    })
  })

  it('clears the sent marks at Send, and keeps new text, new files, and literal escapes from during the send', async () => {
    const chat = await attached(true)
    const sending = chat.controller.send(session)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), {
      timeout: 10_000,
    })
    expect(chat.draftOf(session)).toMatchObject({
      text: '',
      files: [],
      detached: [],
    })
    chat.controller.attachFiles(session, [note('new.txt')])
    const newer = `${literalText('Next \uE000typed\uE001-\uE0020 ')}${fileMark('file-3')}`
    chat.controller.setDraft(session, newer)
    chat.held.shift()?.()
    await sending
    expect(chat.draftOf(session)).toMatchObject({
      text: newer,
      files: [{ id: 'file-3', state: 'uploading' }],
      detached: [],
    })
    await chat.started(3)
    await chat.finish(2, 'new')
  })

  it('keeps the encoded text and files after a refused send', async () => {
    const chat = await attached(false, true)
    const before = chat.draftOf(session)
    await chat.controller.send(session)
    expect(chat.draftOf(session)).toMatchObject({
      text: before?.text,
      files: before?.files,
    })
    expect(
      (await chat.bodies('POST', messages)).map((body) => record(body).text),
    ).toEqual(['@returned/first.txt @"returned/second file.txt"'])
  })

  it('marks each sent file as expired when the Worker no longer has it, and gives back its chips', async () => {
    const chat = await attached(true, 'missing')
    const before = chat.draftOf(session)?.text
    const sending = chat.controller.send(session)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), {
      timeout: 10_000,
    })
    chat.held.shift()?.()
    await sending
    expect(chat.draftOf(session)).toMatchObject({
      text: before,
      files: [
        { id: 'file-1', state: 'failed' },
        { id: 'file-2', state: 'failed' },
      ],
      detached: [],
    })
  })
})
