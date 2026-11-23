import { expect } from 'vitest'

import { readSessionResponse } from '../../src/chat/api/read-responses'
import { readNewestStoredEvents } from '../../src/chat/api/read-workspace'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { CLAUDE } from '../chat/harness.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { readMergeWorkspace } from '../github/merge-access'
import { queueId } from './contracts'
import type { QueueRestack } from './fix-contracts'
import { queueFixture } from './queue.test-support'
import { queueBarState } from './read'

const restack = {
  id: 'fix-this-restack',
  base: 'main',
  basePullNumber: null,
  baseHead: '896a470385279ec0a99c30b956e1b90a64569b45',
  oldBase: 'b8ba8d107d6359017c2537c03d7a2ec48c94d1d9',
}

export async function fixFixture(bundle: string) {
  const f = await queueFixture(bundle)
  try {
    expect(
      (
        await f.change('POST', OUTER_WORKSPACE, {
          cookie: f.cookies.memberCookie,
        })
      ).status,
    ).toBe(204)
    await f.db
      .prepare("UPDATE workspaces SET state = 'ready' WHERE id = ?")
      .bind(OUTER_WORKSPACE)
      .run()
    const queue = f.actor(queueId(f.scope))
    const start = async (input: Partial<QueueRestack> = {}) =>
      requireFeatureResult(
        await queue.requestMergeQueueFix(f.scope, OUTER_WORKSPACE, {
          ...restack,
          ...input,
        }),
      )
    const post = (path: string, body: unknown) =>
      f.request(path, { method: 'POST', body: JSON.stringify(body) })
    const session = async (choice = CLAUDE) => {
      const response = await post(sessionsPath(OUTER_ORG, OUTER_WORKSPACE), {
        choice,
      })
      expect(response.status).toBe(201)
      return readSessionResponse(await response.json()).session
    }
    return {
      ...f,
      queue,
      start,
      post,
      session,
      stop: (sessionId: string, turnId: string) =>
        post(sessionPaths.interrupt(OUTER_ORG, OUTER_WORKSPACE, sessionId), {
          turnId,
        }),
      messages: async (sessionId: string) => {
        const response = await f.request(
          chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
        )
        expect(response.status).toBe(200)
        const page = readNewestStoredEvents(await response.json())
        return page.envelopes.flatMap(({ event }) =>
          event?.type === 'message.accepted' ? [event.message] : [],
        )
      },
      bar: async () =>
        queueBarState(
          f.db,
          await readMergeWorkspace(f.db, OUTER_ORG, OUTER_WORKSPACE, 'owner'),
        ),
    }
  } catch (error) {
    await f.dispose()
    throw error
  }
}
