import {
  chatHistoryPath,
  type WorkspaceEventEnvelope,
} from '../../shared/events'
import { sessionsPath } from '../../shared/sessions'
import {
  workspaceViewPath,
  type WorkspaceView,
} from '../../shared/workspace-view'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { StreamListener } from '../stream/workspace-stream'
import { tabChat } from './tab-order-test-kit'
import { newSessionRecord } from './test-kit'

export const org = FAKE_IDS.org
export const ws = FAKE_IDS.workspace
export const first = newSessionRecord(FAKE_IDS.session, {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
  fast: false,
})
export const second = newSessionRecord('debounce', first.choice)
export const viewPath = workspaceViewPath(org, ws)
export const saved: WorkspaceView = {
  tabs: [
    { kind: 'session', sessionId: first.id },
    { kind: 'session', sessionId: second.id },
  ],
  activeTab: { kind: 'session', sessionId: first.id },
  fileList: 'changes',
  temporaryTab: null,
  tool: 'terminal',
}

export function envelope(
  eventNumber: number,
  closedAt: number | null,
  session = first,
): WorkspaceEventEnvelope {
  return {
    workspaceId: ws,
    eventNumber,
    occurredAt: FAKE_TIME,
    event: { type: 'session.updated', session: { ...session, closedAt } },
  }
}

export function replayMessage(
  eventNumber: number,
  text: string,
  session = first,
): WorkspaceEventEnvelope {
  return {
    workspaceId: ws,
    eventNumber,
    occurredAt: FAKE_TIME + eventNumber,
    event: {
      type: 'message.accepted',
      message: {
        ...workspaceFixtures().message,
        id: `message-${eventNumber}`,
        sessionId: session.id,
        text,
      },
    },
  }
}

export function replayChat(options: Parameters<typeof tabChat>[1] = {}) {
  const listeners: StreamListener[] = []
  const chat = tabChat(saved.tabs, {
    ...options,
    conversation: 'history',
    subscribe: (_target, _after, listener) => {
      listeners.push(listener)
      return () => {}
    },
  })
  chat.server.json('GET', sessionsPath(org, ws), {
    eventNumber: 30,
    sessions: [first, second],
    history: [],
  })
  for (const session of [first, second]) {
    chat.server.json('GET', chatHistoryPath(org, ws, session.id), {
      events: [],
      throughEventNumber: 30,
    })
  }
  const navigation = () => {
    const snapshot = chat.controller.getSnapshot()
    return {
      open: snapshot.sessions.map((session) => session.id),
      active: snapshot.activeSessionId,
      view: snapshot.view,
    }
  }
  const page = (
    events: readonly WorkspaceEventEnvelope[],
    nextAfterEventNumber?: number,
  ) =>
    listeners.at(-1)?.message({
      type: 'history',
      history: {
        events,
        throughEventNumber: 40,
        ...(nextAfterEventNumber === undefined
          ? {}
          : { hasMore: true, nextAfterEventNumber }),
      },
    })
  return { ...chat, listeners, navigation, page }
}
