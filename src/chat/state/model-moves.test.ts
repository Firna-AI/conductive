import { describe, expect, it, vi } from 'vitest'
import { readyIds } from '../../app/draft-files'
import type { AgentChoice } from '../../shared/agents'
import { filePaths } from '../../shared/files'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { chatFor, newSessionRecord, opensSession } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const id = FAKE_IDS.session
const codex: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
}
/** The ID of the new session: the first client ID that the chat takes. */
const created = 'client-1'
const shortly = { timeout: 10_000 }
const isModel = (request: Request) =>
  request.method === 'PUT' && request.url.endsWith('/model')

type Chat = ReturnType<typeof chatFor>

async function attach(chat: Chat, sessionId: string, fileId: string) {
  chat.server.json(
    'POST',
    filePaths.attachments(org, ws),
    {
      attachment: {
        id: fileId,
        name: `${fileId}.png`,
        kind: 'image',
        mediaType: 'image/png',
        sizeBytes: 3,
      },
    },
    201,
  )
  const file = new File(['png'], `${fileId}.png`, { type: 'image/png' })
  await chat.controller.attachFiles(sessionId, [file])
}

/** The user types at the end of the text that the composer of a session shows. */
function type(chat: Chat, sessionId: string, words: string) {
  const shown = chat.draftOf(sessionId)?.text ?? ''
  chat.controller.setDraft(
    sessionId,
    shown === '' ? words : `${shown} ${words}`,
  )
}

const files = (chat: Chat, sessionId: string) =>
  readyIds(chat.draftOf(sessionId)?.files ?? [])

/**
 * A chat whose draft has a file that the backend keeps and one that it drops.
 * Its pick of a Codex model waits until the test lets the reply go. The test
 * records the draft of the new session in the first snapshot that shows it.
 */
async function pickThatWaits() {
  const chat = chatFor({
    conversation: 'history',
    hold: isModel,
    answer: opensSession(codex, (file) => file === 'kept-file'),
  })
  await chat.controller.start()
  chat.controller.setDraft(id, 'Check the postcode rules.')
  await attach(chat, id, 'kept-file')
  await attach(chat, id, 'dropped-file')
  const firstShown: (string | null)[] = []
  chat.controller.subscribe(() => {
    const snapshot = chat.controller.getSnapshot()
    const known = [...snapshot.sessions, ...snapshot.history]
    if (firstShown.length > 0 || !known.some((item) => item.id === created)) {
      return
    }
    firstShown.push(snapshot.sessionStates[created]?.draft.text ?? null)
  })
  const picking = chat.controller.chooseModel(id, codex)
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
  const reply = async () => {
    chat.held.splice(0, 1)[0]()
    await picking
  }
  return { chat, firstShown, reply }
}

describe('a model change that opens a session', () => {
  it('keeps both drafts when the stream shows the new session before the reply', async () => {
    const { chat, firstShown, reply } = await pickThatWaits()
    chat.emit({
      type: 'session.updated',
      session: newSessionRecord(created, codex),
    })
    await chat.controller.select(created)
    type(chat, created, 'Also check Irish postcodes.')
    await attach(chat, created, 'late-file')
    await reply()
    expect(chat.draftOf(created)?.text).toBe(
      'Check the postcode rules. Also check Irish postcodes.',
    )
    expect(files(chat, created)).toEqual(['kept-file', 'late-file'])
    expect(chat.draftOf(id)?.text).toBe('')
    expect(files(chat, id)).toEqual([])
    expect(firstShown).toEqual(['Check the postcode rules.'])
    expect(chat.controller.getSnapshot().activeSessionId).toBe(created)
    expect(await chat.bodies('PUT', sessionPaths.model(org, ws, id))).toEqual([
      {
        choice: codex,
        draft: {
          text: 'Check the postcode rules.',
          attachmentIds: ['kept-file', 'dropped-file'],
        },
        newSessionId: created,
      },
    ])
  })

  it('moves the draft once when the reply comes before the stream record', async () => {
    const { chat, firstShown, reply } = await pickThatWaits()
    await reply()
    expect(firstShown).toEqual(['Check the postcode rules.'])
    expect(files(chat, created)).toEqual(['kept-file'])
    await chat.controller.select(id)
    type(chat, id, 'Next, the shipping form.')
    chat.emit({
      type: 'session.updated',
      session: newSessionRecord(created, codex),
    })
    expect(chat.draftOf(id)?.text).toBe('Next, the shipping form.')
    expect(chat.draftOf(created)?.text).toBe('Check the postcode rules.')
    expect(chat.controller.getSnapshot().activeSessionId).toBe(id)
  })

  it('keeps the moved draft in the closed session when it closes before the reply', async () => {
    const { chat, reply } = await pickThatWaits()
    chat.emit({
      type: 'session.updated',
      session: newSessionRecord(created, codex),
    })
    chat.emit({
      type: 'session.updated',
      session: newSessionRecord(created, codex, 1),
    })
    await chat.controller.select(id)
    type(chat, id, 'Next, the shipping form.')
    await reply()
    const snapshot = chat.controller.getSnapshot()
    expect(snapshot.history.map((item) => item.id)).toContain(created)
    expect(snapshot.sessions.map((item) => item.id)).not.toContain(created)
    expect(chat.draftOf(created)?.text).toBe('Check the postcode rules.')
    expect(files(chat, created)).toEqual(['kept-file'])
    expect(chat.draftOf(id)?.text).toBe('Next, the shipping form.')
  })
})
