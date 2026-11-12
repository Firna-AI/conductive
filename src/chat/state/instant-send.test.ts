import { describe, expect, it, vi } from 'vitest'
import { fileMark } from '../../app/draft-marks'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { record, text } from '../api/json'
import { pickChatFiles } from './draft-files.test-support'
import { chatFor } from './test-kit'

const id = FAKE_IDS.session
const messages = sessionPaths.messages(FAKE_IDS.org, FAKE_IDS.workspace, id)
const shortly = { timeout: 10_000 }
const file = () => new File(['png'], 'cart.png', { type: 'image/png' })
const isSend = (request: Request) =>
  request.method === 'POST' && request.url.endsWith('/messages')
const refusal = Response.json(
  {
    error: {
      code: 'session_closed',
      message: 'Reopen the session to send a message.',
    },
  },
  { status: 409 },
)

/** A chat whose sends wait until the test lets them go, and then get `reply`. */
async function chatWithSends(reply?: () => Response) {
  const chat = chatFor({
    conversation: 'history',
    hold: isSend,
    answer: async (request) => (reply && isSend(request) ? reply() : null),
  })
  await chat.controller.start()
  return chat
}

const stateOf = (chat: Awaited<ReturnType<typeof chatWithSends>>) =>
  chat.controller.getSnapshot().sessionStates[id]

describe('a message while its send waits', () => {
  it('leaves the composer and shows in the chat at once, with its files', async () => {
    const chat = await chatWithSends()
    chat.controller.setDraft(id, 'Keep a saved cart for 30 days.')
    await pickChatFiles(chat, id, [file()])
    const sending = chat.controller.send(id)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    const sent = stateOf(chat).pending[0]?.text ?? ''
    expect(sent).toMatch(/^Keep a saved cart for 30 days\. @\S+/)
    expect(chat.draftOf(id)).toMatchObject({
      text: '',
      files: [],
      detached: [],
      sending: true,
    })
    expect(stateOf(chat).pending).toEqual([
      {
        id: 'client-1',
        text: sent,
        attachments: [expect.objectContaining({ id: 'attachment-1' })],
        state: 'queued',
      },
    ])
    chat.held.splice(0, 1)[0]()
    await sending
    expect(chat.draftOf(id)?.sending).toBe(false)
    const [body] = await chat.bodies('POST', messages)
    expect(text(record(body).text)).toBe(sent)
    expect(stateOf(chat).pending.map((message) => message.text)).toEqual([sent])
  })

  it('goes back to the composer with its files and its ID when the Worker refuses it', async () => {
    const chat = await chatWithSends(() => refusal.clone())
    chat.controller.setDraft(id, 'Keep a saved cart for 30 days.')
    await pickChatFiles(chat, id, [file()])
    const before = chat.draftOf(id)?.text
    expect(before).toBe(`Keep a saved cart for 30 days. ${fileMark('file-1')} `)
    const sending = chat.controller.send(id)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    chat.held.splice(0, 1)[0]()
    await sending
    expect(stateOf(chat).pending).toEqual([])
    expect(chat.draftOf(id)).toMatchObject({
      text: before,
      files: [{ state: 'ready', attachment: { id: 'attachment-1' } }],
      sendId: 'client-1',
      sending: false,
    })
    expect(chat.controller.getSnapshot().notice?.title).toBe(
      "Your message didn't send",
    )
  })

  it('goes back before the text that the user typed during the send, as a new message', async () => {
    const chat = await chatWithSends(() => refusal.clone())
    chat.controller.setDraft(id, 'Keep a saved cart for 30 days.')
    const sending = chat.controller.send(id)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    chat.controller.setDraft(id, 'And show the expiry date.')
    chat.held.splice(0, 1)[0]()
    await sending
    expect(chat.draftOf(id)).toMatchObject({
      text: 'Keep a saved cart for 30 days.\nAnd show the expiry date.',
      sendId: null,
      sending: false,
    })
  })

  it('shows a fixed prompt at once, and takes it out of the chat when it fails', async () => {
    const chat = await chatWithSends(() => refusal.clone())
    const prompting = chat.controller.sendPrompt('Fix the failed checks.')
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    expect(stateOf(chat).pending.map((message) => message.text)).toEqual([
      'Fix the failed checks.',
    ])
    chat.held.splice(0, 1)[0]()
    expect(await prompting).toBe('failed')
    expect(stateOf(chat).pending).toEqual([])
  })
})
