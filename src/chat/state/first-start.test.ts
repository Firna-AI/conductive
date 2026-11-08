import { describe, expect, it } from 'vitest'
import { sessionPaths } from '../../shared/sessions'
import {
  workspacePath,
  type WorkspaceResponse,
  type WorkspaceStart,
  type WorkspaceState,
} from '../../shared/workspaces'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { record, text } from '../api/json'
import { chatFor } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const first = FAKE_IDS.session
const second = 'debounce'
const messagesOf = (sessionId: string) =>
  sessionPaths.messages(org, ws, sessionId)

const workspaceIn = (state: WorkspaceState) => ({
  ...workspaceFixtures().detail.workspace,
  state,
})

/** The start that created the workspace. Its record stays after it. */
const create: WorkspaceStart = {
  kind: 'create',
  startedAt: FAKE_TIME,
  steps: [],
}

/**
 * A chat whose load reads this workspace record and start, before the
 * events that the test sends.
 */
function chatWith(
  detail: Omit<WorkspaceResponse, 'error'>,
  conversation: RecordedChatScenario,
) {
  const chat = chatFor({ conversation })
  chat.server.json('GET', workspacePath(org, ws), {
    ...detail,
    error: null,
    eventNumber: 0,
  })
  return chat
}

const sentTexts = async (chat: ReturnType<typeof chatFor>, id: string) =>
  (await chat.bodies('POST', messagesOf(id))).map((body) =>
    text(record(body).text),
  )

describe('messages during the first start of a new workspace', () => {
  it('keeps the draft of each session and sends none, also when the start succeeds, until the user sends one', async () => {
    // Just after the create, the record of the start has not come yet.
    const chat = chatWith(
      { workspace: workspaceIn('starting'), start: null },
      'queued',
    )
    await chat.controller.start()
    chat.controller.setDraft(first, 'Keep a saved cart for 30 days.')
    chat.controller.setDraft(second, 'Add an index on the user ID.')
    await chat.controller.send(first)
    chat.emit({ type: 'start.updated', start: create })
    // A first start can stop before it succeeds, so a stop is no success.
    chat.emit({ type: 'workspace.updated', workspace: workspaceIn('stopped') })
    chat.emit({ type: 'workspace.updated', workspace: workspaceIn('starting') })
    await chat.controller.send(second)
    expect(chat.requests('POST', messagesOf(first))).toHaveLength(0)
    expect(chat.requests('POST', messagesOf(second))).toHaveLength(0)

    chat.emit({ type: 'workspace.updated', workspace: workspaceIn('ready') })
    expect(chat.draftOf(first)?.text).toBe('Keep a saved cart for 30 days.')
    expect(chat.draftOf(second)?.text).toBe('Add an index on the user ID.')
    await chat.controller.send(second)
    expect(await sentTexts(chat, second)).toEqual([
      'Add an index on the user ID.',
    ])
    expect(chat.requests('POST', messagesOf(first))).toHaveLength(0)
    expect(chat.draftOf(first)?.text).toBe('Keep a saved cart for 30 days.')
  })

  it('sends during a resume, also when the workspace record comes before the record of the resume', async () => {
    // The tab saw the ready workspace, so its first start succeeded.
    const chat = chatWith(
      { workspace: workspaceIn('ready'), start: create },
      'history',
    )
    await chat.controller.start()
    chat.emit({ type: 'workspace.updated', workspace: workspaceIn('stopped') })
    // The record of the first start stays until the next event replaces it.
    chat.emit({ type: 'workspace.updated', workspace: workspaceIn('starting') })
    chat.controller.setDraft(first, 'Run the unit tests again.')
    await chat.controller.send(first)
    expect(await sentTexts(chat, first)).toEqual(['Run the unit tests again.'])
  })

  it('keeps the text, the file, and the ID of a message that the Worker refuses during the first start', async () => {
    const refusal = {
      error: {
        code: 'workspace_starting',
        message:
          'Wait for the workspace to start before sending another message.',
      },
    }
    let sends = 0
    // The tab shows a ready workspace, but the first start has not
    // succeeded on the Worker yet.
    const chat = chatFor({
      conversation: 'queued',
      answer: async (request) => {
        if (request.method !== 'POST' || !request.url.endsWith('/messages')) {
          return null
        }
        sends += 1
        return sends === 1 ? Response.json(refusal, { status: 409 }) : null
      },
    })
    await chat.controller.start()
    chat.controller.setDraft(first, 'Keep a saved cart for 30 days.')
    await chat.controller.attachFiles(first, [
      new File(['png'], 'cart.png', { type: 'image/png' }),
    ])
    await chat.controller.send(first)
    expect(chat.draftOf(first)).toMatchObject({
      text: 'Keep a saved cart for 30 days.',
      files: [{ state: 'ready', attachment: { id: 'attachment-1' } }],
      sending: false,
    })
    expect(chat.controller.getSnapshot().notice).toEqual({
      sessionId: first,
      title: "Your message didn't send",
      message:
        'Wait for the workspace to start before sending another message.',
    })

    await chat.controller.send(first)
    const bodies = await chat.bodies('POST', messagesOf(first))
    expect(bodies.map((body) => text(record(body).id))).toEqual([
      'client-1',
      'client-1',
    ])
    expect(chat.draftOf(first)?.text).toBe('')
  })
})
