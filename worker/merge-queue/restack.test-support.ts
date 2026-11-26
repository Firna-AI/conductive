import { expect } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { readNewestStoredEvents } from '../../src/chat/api/read-workspace'
import { readSessions } from '../../src/chat/api/read-responses'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { recordedPullRequest, recordedPush } from '../github/recorded-webhooks'
import { mergeFixture } from './merge.test-support'
import { queueWebhook } from './queue.test-support'

export async function restackFixture(
  bundle: string,
  mode: 'single' | 'stack' = 'single',
) {
  const f = await mergeFixture(bundle, mode)
  f.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
  const post = (path: string, value: unknown) =>
    f.request(path, {
      method: 'POST',
      body: JSON.stringify(value),
    })
  const workspaceSessions = async (id: string) =>
    readSessions(await (await f.request(sessionsPath(OUTER_ORG, id))).json())
      .sessions
  const webhook = async (event: string, delivery: string, payload: unknown) => {
    expect((await queueWebhook(f, event, delivery, payload)).status).toBe(204)
  }
  return {
    ...f,
    steps: () =>
      f.api.requests.filter((r) => {
        const path = new URL(r.url).pathname
        return (
          r.method === 'PATCH' ||
          (r.method === 'POST' && path.includes('/stacks'))
        )
      }),
    wake: async () => {
      requireFeatureResult(await f.queue.wakeMergeQueue(f.scope))
    },
    base: (workspaceId: string) =>
      f.db
        .prepare('SELECT base_branch FROM workspaces WHERE id = ?')
        .bind(workspaceId)
        .first<string>('base_branch'),
    edit: async (
      delivery: string,
      number: number,
      from: string,
      to: string,
    ) => {
      const pull = f.api.pulls[number]
      const payload = recordedPullRequest.pull_request
      await webhook('pull_request', delivery, {
        ...recordedPullRequest,
        action: 'edited',
        number,
        pull_request: {
          ...payload,
          number,
          head: {
            ...payload.head,
            ref: pull.headRefName,
            sha: pull.headRefOid,
          },
          base: {
            ...payload.base,
            ref: to,
            sha: f.api.branches.get(`refs/heads/${to}`),
          },
        },
        changes: {
          base: {
            ref: { from },
            sha: { from: f.api.branches.get(`refs/heads/${from}`) },
          },
        },
      })
    },
    push: (delivery: string, branch: string, before: string, after: string) =>
      webhook('push', delivery, {
        ...recordedPush,
        ref: `refs/heads/${branch}`,
        before,
        after,
      }),
    status: (delivery: string, number: number) =>
      webhook('status', delivery, {
        repository: recordedPush.repository,
        installation: recordedPush.installation,
        sha: f.api.pulls[number].headRefOid,
        branches: [{ name: f.api.pulls[number].headRefName }],
      }),
    ready: async (id: string) => {
      await f.db
        .prepare("UPDATE workspaces SET state = 'ready' WHERE id = ?")
        .bind(id)
        .run()
    },
    /** The messages of each session of the workspace, oldest session first. */
    messages: async (id: string) => {
      const sessions = (await workspaceSessions(id)).toSorted(
        (a, b) => a.createdAt - b.createdAt,
      )
      const pages = await Promise.all(
        sessions.map(async ({ id: sessionId }) => {
          const response = await f.request(
            chatHistoryPath(OUTER_ORG, id, sessionId),
          )
          expect(response.status).toBe(200)
          return readNewestStoredEvents(await response.json()).envelopes
        }),
      )
      return pages
        .flat()
        .flatMap(({ event }) =>
          event?.type === 'message.accepted' ? [event.message] : [],
        )
    },
    /** Stop the one running restack turn of the workspace. */
    endFix: async (id: string) => {
      const running = (await workspaceSessions(id)).filter(
        ({ activeTurnId }) => activeTurnId !== null,
      )
      const [session] = running
      if (running.length !== 1 || !session?.activeTurnId)
        throw new Error('The queue did not send one fix turn.')
      expect(
        (
          await post(sessionPaths.interrupt(OUTER_ORG, id, session.id), {
            turnId: session.activeTurnId,
          })
        ).status,
      ).toBe(200)
      await f.actor(id).advanceStartAlarm()
    },
  }
}
