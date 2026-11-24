import { describe, expect, it, vi } from 'vitest'
import { explainSessionPath } from '../../shared/sessions'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  askedText,
  isSend as isMemberSend,
  memberChat,
  streamLinked,
} from './linked-kit'
import { chatFor } from './test-kit'

const id = FAKE_IDS.session
const shortly = { timeout: 10_000 }
const isSend = (request: Request) =>
  request.method === 'POST' && request.url.endsWith('/messages')
const serverError = () =>
  Response.json(
    { error: { code: 'internal', message: 'The request failed.' } },
    { status: 500 },
  )

/** A chat whose sends wait until the test lets them go, and then fail. */
async function failingChat() {
  const chat = chatFor({
    conversation: 'history',
    hold: isSend,
    answer: async (request) => (isSend(request) ? serverError() : null),
  })
  await chat.controller.start()
  return chat
}

type Chat = Awaited<ReturnType<typeof failingChat>>

/** The stream shows the message of the member with this client ID. */
function accept(
  chat: Chat,
  messageId: string,
  text: string,
  sessionId: string = id,
): void {
  chat.emit({
    type: 'message.accepted',
    message: {
      id: messageId,
      sessionId,
      sender: {
        id: 'cal',
        githubLogin: 'calummoore',
        displayName: 'Cal',
        avatarUrl: null,
      },
      text,
      attachments: [],
      choice: {
        agent: 'claude',
        model: 'Opus 5.5',
        effort: 'high',
        fast: false,
      },
      createdAt: FAKE_TIME,
      state: 'queued',
    },
  })
}

/** Starts a send of the draft and lets its failed answer go. */
async function failSend(chat: Chat, text: string): Promise<void> {
  chat.controller.setDraft(id, text)
  const sending = chat.controller.send(id)
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
  chat.held.splice(0, 1)[0]()
  await sending
}

const notice = (chat: Chat) => chat.controller.getSnapshot().notice

describe('a failed send whose message still arrives', () => {
  it('drops the notice and the copy in the draft when the stream shows it later', async () => {
    const chat = await failingChat()
    await failSend(chat, 'ok, generate them')
    expect(notice(chat)?.title).toBe("Your message didn't send")
    expect(chat.draftOf(id)).toMatchObject({
      text: 'ok, generate them',
      sendId: 'client-1',
    })
    accept(chat, 'client-1', 'ok, generate them')
    expect(notice(chat)).toBeNull()
    expect(chat.draftOf(id)).toMatchObject({
      text: '',
      files: [],
      sendId: null,
      sending: false,
    })
  })

  it('shows no notice when the stream showed the message before the error', async () => {
    const chat = await failingChat()
    chat.controller.setDraft(id, 'ok, generate them')
    const sending = chat.controller.send(id)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    accept(chat, 'client-1', 'ok, generate them')
    chat.held.splice(0, 1)[0]()
    await sending
    expect(notice(chat)).toBeNull()
    expect(chat.draftOf(id)).toMatchObject({ text: '', sendId: null })
  })

  it('keeps a draft that the user changed after the failure', async () => {
    const chat = await failingChat()
    await failSend(chat, 'ok, generate them')
    chat.controller.setDraft(id, 'ok, generate them all')
    accept(chat, 'client-1', 'ok, generate them')
    expect(notice(chat)).toBeNull()
    expect(chat.draftOf(id)?.text).toBe('ok, generate them all')
  })

  it('keeps the notice while no transcript shows the message', async () => {
    const chat = await failingChat()
    await failSend(chat, 'ok, generate them')
    accept(chat, 'other-message', 'Something else.')
    expect(notice(chat)?.title).toBe("Your message didn't send")
    expect(chat.draftOf(id)?.text).toBe('ok, generate them')
  })

  it('drops the notice of a fixed prompt when the stream shows it later', async () => {
    const chat = await failingChat()
    const prompting = chat.controller.sendPrompt('Fix the failed checks.')
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    chat.held.splice(0, 1)[0]()
    expect(await prompting).toBe('failed')
    expect(notice(chat)?.title).toBe("Your message didn't send")
    accept(chat, 'client-1', 'Fix the failed checks.')
    expect(notice(chat)).toBeNull()
  })

  it('drops the notice and the draft copy when the message shows in a linked session', async () => {
    const chat = memberChat({
      wrap: (opens) => async (request) =>
        isMemberSend(request) ? serverError() : opens(request),
    })
    await chat.controller.start()
    chat.controller.setDraft(id, askedText)
    await chat.controller.send(id)
    expect(chat.controller.getSnapshot().notice?.title).toBe(
      "Your message didn't send",
    )
    streamLinked(chat)
    expect(chat.controller.getSnapshot().notice).toBeNull()
    expect(chat.draftOf(id)).toMatchObject({ text: '', sendId: null })
  })
})

const explainPath = explainSessionPath(FAKE_IDS.org, FAKE_IDS.workspace, id)
const isStart = (request: Request) =>
  request.method === 'POST' && new URL(request.url).pathname === explainPath
const quote = {
  messageId: 'answer-1',
  quote: 'Manual entry still works',
  before: '',
  after: '',
}
const prompt = 'Explain "Manual entry still works"'

/** A chat whose starts of an explanation fail with a server error. */
async function failingStarts(hold?: (request: Request) => boolean) {
  const chat = chatFor({
    conversation: 'history',
    hold,
    answer: async (request) => (isStart(request) ? serverError() : null),
  })
  await chat.controller.start()
  return chat
}

describe('a failed start of an explanation whose written prompt still arrives', () => {
  it('names the written prompt with a new ID, and drops the notice when the stream shows it later', async () => {
    const chat = await failingStarts()
    const outcome = await chat.controller.explain(id, quote)
    const failed = notice(chat)?.title
    accept(chat, 'client-1', prompt, 'explain-new')
    expect({
      outcome,
      failed,
      bodies: await chat.bodies('POST', explainPath),
      notice: notice(chat),
    }).toEqual({
      outcome: { kind: 'unknown' },
      failed: "The explanation didn't start",
      bodies: [{ ...quote, promptId: 'client-1' }],
      notice: null,
    })
  })

  it('gives the explanation and no notice when the stream showed the written prompt before a server error', async () => {
    const chat = await failingStarts(isStart)
    const starting = chat.controller.explain(id, quote)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    accept(chat, 'client-1', prompt, 'explain-new')
    chat.held.splice(0, 1)[0]()
    expect(await starting).toEqual({
      kind: 'started',
      sessionId: 'explain-new',
    })
    expect(notice(chat)).toBeNull()
  })
})
