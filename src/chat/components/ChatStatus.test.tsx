import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/agents'
import { chatHistoryPath } from '../../shared/events'
import type { FakeApiServer } from '../../test-support/fake-api'
import { sessionsPath } from '../../shared/sessions'
import { workspacePaths, type Workspace } from '../../shared/workspaces'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { recordedChatEvents } from '../../test-support/recorded-chat'
import { renderChat } from './render-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const opus: AgentChoice = { agent: 'claude', model: 'Opus 5.5', effort: 'high' }
const history = chatHistoryPath(org, ws, 'debounce')
const failure = {
  error: { code: 'internal_error', message: 'The server is busy.' },
}
const failing = (server: FakeApiServer) =>
  server.json('GET', history, failure, 500)
const isResume = (request: Request) =>
  request.method === 'POST' && request.url.endsWith('/resume')
const tryAgain = (text: string) => text.split('Try again').length - 1

function required(workspace: Workspace | null): Workspace {
  if (!workspace) throw new Error('The workspace did not load.')
  return workspace
}

/**
 * The reply of a Resume that started the sandbox. It holds the state of the
 * fake's recorded events, so each event that a test sends is newer.
 */
function startingReply(workspace: Workspace) {
  const step = {
    id: 'restore',
    label: 'Resuming with your files as you left them',
    state: 'running',
    startedAt: FAKE_TIME,
    completedAt: null,
  }
  return {
    workspace: { ...workspace, state: 'starting' },
    start: { kind: 'resume', startedAt: FAKE_TIME, steps: [step] },
    error: null,
    eventNumber: 0,
  }
}

describe('the workspace record after Resume', () => {
  it('shows a Resume reply that no newer event replaced, and keeps a newer error from the stream with Try again', async () => {
    const early = await renderChat({
      workspaceState: 'stopped',
      hold: isResume,
    })
    const stopped = required(early.chat.controller.getSnapshot().workspace)
    early.chat.server.json(
      'POST',
      workspacePaths.resume(org, ws),
      startingReply(stopped),
    )
    const started = early.chat.controller.resume()
    early.chat.held.splice(0, 1)[0]()
    await started
    expect(early.text()).toContain(
      'Resuming the sandbox › Resuming with your files as you left them',
    )
    const late = await renderChat({ workspaceState: 'stopped', hold: isResume })
    late.chat.server.json(
      'POST',
      workspacePaths.resume(org, ws),
      startingReply(stopped),
    )
    const resuming = late.chat.controller.resume()
    late.chat.emit({
      type: 'workspace.updated',
      workspace: { ...stopped, state: 'error' },
    })
    late.chat.held.splice(0, 1)[0]()
    await resuming
    expect(late.chat.controller.getSnapshot()).toMatchObject({
      resuming: false,
      workspace: { state: 'error' },
    })
    expect(late.text()).toContain(
      "The sandbox couldn't start Your files and chat are saved. Try again",
    )
    expect(late.text()).not.toContain('Resuming the sandbox')
  })
})

describe('the load status of the chat', () => {
  it('names a reply that it cannot read with the retry message and Try again', async () => {
    const { text } = await renderChat({
      setup: (server) =>
        server.json('GET', sessionsPath(org, ws), { sessions: 'none' }),
    })
    expect(text()).toContain(
      "The chat didn't load The request failed. Try again. Try again",
    )
  })
})

describe('the history status of a session', () => {
  it('shows that the earlier messages did not load beside live text, and Try again adds them once', async () => {
    const { chat, text } = await renderChat({
      conversation: 'history',
      setup: failing,
    })
    const message = {
      id: 'live',
      sessionId: 'debounce',
      sender: {
        id: 'ana',
        githubLogin: 'ana',
        displayName: 'Ana',
        avatarUrl: null,
      },
      text: 'Check the postcode rules too.',
      attachments: [],
      choice: opus,
      createdAt: FAKE_TIME,
      state: 'sent' as const,
    }
    const live = {
      workspaceId: ws,
      eventNumber: chat.server.events.history().throughEventNumber + 1,
      occurredAt: FAKE_TIME,
      event: { type: 'message.accepted' as const, message },
    }
    chat.server.events.emit(live)
    await chat.controller.select('debounce')
    expect(text()).toContain('Check the postcode rules too.')
    expect(text()).toContain("Earlier messages didn't load Try again")
    chat.server.json('GET', history, {
      events: [...recordedChatEvents('history', ws, 'debounce'), live],
      throughEventNumber: live.eventNumber,
    })
    await chat.controller.loadHistory('debounce')
    expect(text()).toContain('The checkout form now suggests addresses.')
    expect(text().split('Check the postcode rules too.')).toHaveLength(2)
    expect(text()).not.toContain("didn't load")
  })

  it('names a failed history load with one Try again, whatever else the chat shows', async () => {
    const empty = await renderChat({ conversation: 'history', setup: failing })
    await empty.chat.controller.select('debounce')
    expect(empty.text()).toContain("This session didn't load Try again")
    expect(tryAgain(empty.text())).toBe(1)
    empty.chat.controller.setDraft('debounce', 'Run the postcode check again.')
    await empty.chat.controller.send('debounce')
    expect(empty.text()).toContain("Earlier messages didn't load Try again")
    expect(tryAgain(empty.text())).toBe(1)
    const running = await renderChat({
      conversation: 'history',
      setup: failing,
    })
    running.chat.emit({
      sessionId: 'debounce',
      turnId: 'turn-7',
      type: 'turn.started',
      senderId: 'ana',
      choice: opus,
      startedAt: FAKE_TIME,
      messageIds: [],
    })
    await running.chat.controller.select('debounce')
    expect(running.text()).toContain('Working')
    expect(running.text()).toContain("Earlier messages didn't load Try again")
    const starting = await renderChat({
      workspaceState: 'starting',
      conversation: 'history',
      setup: failing,
    })
    await starting.chat.controller.select('debounce')
    expect(starting.text()).toContain('Resuming the sandbox')
    expect(starting.text()).toContain("Earlier messages didn't load Try again")
  })
})
