import { describe, expect, it } from 'vitest'
import { attachmentPath } from '../../shared/attachment-paths'
import { pickChatFiles } from './draft-files.test-support'
import { mentionText } from '../../shared/mention-text'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { record, text } from '../api/json'
import {
  LINKED,
  loginGone,
  memberChat,
  pendingIn,
  withSessions,
} from './linked-kit'
import { chatFor } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const first = FAKE_IDS.session
const other = 'debounce'
const prompt =
  'Commit the changes that are not committed, with a clear message, and push this branch.'
const sendPath = (sessionId: string) =>
  sessionPaths.messages(org, ws, sessionId)

/** Refuses each send whose text `refuses` names, as a failing Worker does. */
function refusing(refuses: (words: string) => boolean) {
  return async (request: Request): Promise<Response | null> => {
    if (request.method !== 'POST' || !request.url.endsWith('/messages')) {
      return null
    }
    const body = record(await request.clone().json())
    if (!refuses(text(body.text))) return null
    const error = { code: 'unavailable', message: 'The Worker did not answer.' }
    return Response.json({ error }, { status: 503 })
  }
}

describe('a fixed prompt of the member', () => {
  it('goes to the session of the chat with its model and no files, and leaves the draft, its files, and its failed send as they were', async () => {
    const chat = chatFor({ answer: refusing((words) => words !== prompt) })
    await chat.controller.start()
    chat.controller.setDraft(first, 'Half a thought')
    await pickChatFiles(chat, first, [new File(['x'], 'note.txt')])
    await chat.controller.send(first)
    const draft = chat.draftOf(first)

    const outcome = await chat.controller.sendPrompt(prompt)

    const session = chat.controller
      .getSnapshot()
      .sessions.find((item) => item.id === first)
    expect({
      outcome,
      bodies: await chat.bodies('POST', sendPath(first)),
      draft: chat.draftOf(first),
    }).toEqual({
      outcome: 'sent',
      bodies: [
        {
          id: 'client-1',
          text: `Half a thought ${mentionText(await attachmentPath({ id: 'attachment-1', name: 'postcode-overlap.png' }), false)} `,
          attachmentIds: ['attachment-1'],
          choice: session?.choice,
        },
        {
          id: 'client-2',
          text: prompt,
          attachmentIds: [],
          choice: session?.choice,
        },
      ],
      draft,
    })
    expect(draft?.sendId).toBe('client-1')
  })

  it('sends during a turn, so the Worker joins it to the turn', async () => {
    const chat = chatFor({ conversation: 'running' })
    await chat.controller.start()
    expect(
      chat.controller.getSnapshot().sessions[0]?.activeTurnId,
    ).not.toBeNull()

    const outcome = await chat.controller.sendPrompt(prompt)

    const texts = (await chat.bodies('POST', sendPath(first))).map(
      (body) => record(body).text,
    )
    expect({ outcome, texts }).toEqual({ outcome: 'sent', texts: [prompt] })
  })

  it('puts the kept place of its session at the bottom, so the prompt shows when the chat shows again after a file tab', async () => {
    const chat = chatFor()
    await chat.controller.start()
    chat.controller.places.set(first, { kind: 'row', row: 'item:x', offset: 0 })

    expect(await chat.controller.sendPrompt(prompt)).toBe('sent')
    expect(chat.controller.places.get(first)).toEqual({ kind: 'bottom' })
  })

  it('sends nothing for a session whose own login is missing, so the composer names it', async () => {
    const chat = chatFor()
    withSessions(chat.server, loginGone)
    await chat.controller.start()

    const outcome = await chat.controller.sendPrompt(prompt)

    expect({
      outcome,
      sends: chat.requests('POST', sendPath(first)).length,
    }).toEqual({ outcome: 'blocked', sends: 0 })
  })

  it('shows in the linked session that the reply names, and the typed draft stays in its own session', async () => {
    const chat = memberChat()
    await chat.controller.start()
    chat.controller.setDraft(first, 'Typed during the review')

    const outcome = await chat.controller.sendPrompt(prompt)

    expect({
      outcome,
      linked: pendingIn(chat, LINKED),
      draft: chat.draftOf(first)?.text,
      shown: chat.controller.getSnapshot().activeSessionId,
    }).toEqual({
      outcome: 'sent',
      linked: [prompt],
      draft: 'Typed during the review',
      shown: first,
    })
  })

  it('keeps the client ID of a failed prompt for a second try in its session, and sends a new message in another session', async () => {
    let failing = true
    const chat = chatFor({ answer: refusing(() => failing) })
    await chat.controller.start()
    const failed = await chat.controller.sendPrompt(prompt)
    failing = false

    await chat.controller.select(other)
    await chat.controller.sendPrompt(prompt)
    await chat.controller.select(first)
    await chat.controller.sendPrompt(prompt)

    const ids = async (sessionId: string) =>
      (await chat.bodies('POST', sendPath(sessionId))).map(
        (body) => record(body).id,
      )
    expect({
      failed,
      notice: chat.controller.getSnapshot().notice?.title,
      first: await ids(first),
      other: await ids(other),
    }).toEqual({
      failed: 'failed',
      notice: "Your message didn't send",
      first: ['client-1', 'client-1'],
      other: ['client-2'],
    })
  })
})
