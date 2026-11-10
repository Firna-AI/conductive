import { afterEach, beforeAll, expect, it } from 'vitest'

import { routes } from '../../src/app/router'
import { readStreamMessage } from '../../src/chat/api/read-workspace'
import { workspaceEventsPath } from '../../src/shared/events'
import { workspacePath } from '../../src/shared/workspaces'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { record } from '../chat/inputs'
import { CHAT_META, chatEventKey } from '../chat/storage-keys'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { LIFECYCLE_STATE_KEY } from '../lifecycle/durable-types'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it.each([null, 'https://app.conductive.test'])(
  'presents old replay and later lifecycle events for each local connection with app origin %s',
  async (appOriginBinding) => {
    const active = (fixture = await featureFixture(bundle, {
      appOriginBinding,
    }))
    const path = workspacePath(OUTER_ORG, OUTER_WORKSPACE)
    const detailResponse = await active.runtime.dispatchFetch(
      `http://127.0.0.1:5173${path}`,
      {
        headers: {
          Cookie: active.cookies.ownerCookie,
          Origin: 'http://127.0.0.1:5173',
        },
      },
    )
    expect(detailResponse.status).toBe(200)
    const detail = record(await detailResponse.json())
    const legacy: Record<string, unknown> = {
      ...record(detail.workspace),
      name: 'Saved name',
      state: 'stopped',
    }
    delete legacy.number
    delete legacy.link
    const occurredAt = 1_800_000_000_000
    await active.actor().seedFeatureState({
      [CHAT_META]: {
        workspaceId: OUTER_WORKSPACE,
        through: 1,
        commandThrough: 0,
      },
      [chatEventKey(1)]: {
        workspaceId: OUTER_WORKSPACE,
        eventNumber: 1,
        occurredAt,
        event: { type: 'workspace.updated', workspace: legacy },
      },
      [LIFECYCLE_STATE_KEY]: {
        workspaceId: OUTER_WORKSPACE,
        orgId: OUTER_ORG,
        state: 'ready',
        start: null,
        pendingFirstMessage: null,
        lastActivityAt: occurredAt,
        runningSessions: [],
        runnerConnected: false,
        stoppedAt: null,
        nextDiskKeepaliveAt: null,
        error: null,
      },
    })
    const tabs = await Promise.all(
      ['http://127.0.0.1:5173', 'http://localhost:5174'].map(async (origin) => {
        const response = await active.runtime.dispatchFetch(
          `${origin}${workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE)}`,
          {
            headers: {
              Cookie: active.cookies.ownerCookie,
              Origin: origin,
              Upgrade: 'websocket',
            },
          },
        )
        expect(response.status).toBe(101)
        const socket = response.webSocket
        if (!socket) throw new Error('The browser socket is missing.')
        const inbox = new SocketInbox(socket)
        socket.accept()
        return { origin, socket, inbox }
      }),
    )
    try {
      for (const { origin, inbox } of tabs) {
        const replay = readStreamMessage(await inbox.next())
        expect(replay).toMatchObject({
          type: 'history',
          history: {
            envelopes: [
              {
                eventNumber: 1,
                occurredAt,
                event: {
                  type: 'workspace.updated',
                  workspace: {
                    name: 'Saved name',
                    state: 'stopped',
                    number: 1,
                    link: `${origin}${routes.workspace(OUTER_ORG, OUTER_WORKSPACE)}`,
                  },
                },
              },
            ],
          },
        })
        const response = await active.runtime.dispatchFetch(
          `${origin}${path}`,
          {
            headers: { Cookie: active.cookies.ownerCookie, Origin: origin },
          },
        )
        expect(await response.json()).toMatchObject({
          workspace: {
            number: 1,
            link: `${origin}${routes.workspace(OUTER_ORG, OUTER_WORKSPACE)}`,
          },
        })
      }
      await active.actor().lifecycleFailed({
        code: 'start_failed',
        message: 'The start failed.',
        log: null,
      })
      for (const { origin, inbox } of tabs) {
        expect(readStreamMessage(await inbox.next())).toMatchObject({
          type: 'event',
          envelope: {
            eventNumber: 2,
            event: {
              type: 'workspace.updated',
              workspace: {
                state: 'error',
                number: 1,
                link: `${origin}${routes.workspace(OUTER_ORG, OUTER_WORKSPACE)}`,
              },
            },
          },
        })
      }
    } finally {
      await closeSockets(...tabs.map(({ socket }) => socket))
    }
  },
)
