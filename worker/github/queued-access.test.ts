import { expect, it } from 'vitest'

import { record } from '../chat/inputs'
import {
  SQLITE_TIME,
  SQLITE_WORKSPACE_ID,
  sqliteSnapshot,
} from './sqlite-fixtures.test-support'
import {
  createGitHubSQLiteHarness,
  liveEvents,
} from './sqlite-harness.test-support'

it.each(['commit', 'replay'] as const)(
  'denies a queued GitHub %s after D1 membership removal without a storage or publication change',
  async (operation) => {
    const harness = await createGitHubSQLiteHarness()
    try {
      expect((await harness.request('/observe')).status).toBe(204)
      expect((await harness.request('/refresh?delivery=baseline')).status).toBe(
        200,
      )
      const before = await harness.inspect()
      const response = await harness.request(
        `/access-race?operation=${operation}`,
      )
      const body: unknown = await response.json()
      expect(response.status, JSON.stringify(body)).toBe(200)
      const outcome = record(body)
      expect(outcome.trace).toEqual([
        'outside-access-passed',
        'chat-queue-held',
        'github-operation-queued',
        'membership-removed',
        'chat-queue-released',
      ])
      expect(outcome.allowedAfterRemoval).toBeNull()
      expect(outcome.result).toEqual({
        status: 404,
        body: {
          error: {
            code: 'workspace_not_found',
            message: 'The workspace is not available.',
          },
        },
      })
      const after = await harness.inspect()
      expect(after.records).toEqual(before.records)
      expect(after.staged).toEqual(before.staged)
      expect(liveEvents(after)).toEqual(liveEvents(before))
      expect(outcome.reads).toBe(operation === 'commit' ? 1 : 0)
      const snapshot = sqliteSnapshot()
      expect(outcome.history).toEqual({
        throughEventNumber: 1,
        events: [
          {
            workspaceId: SQLITE_WORKSPACE_ID,
            eventNumber: 1,
            occurredAt: SQLITE_TIME,
            event: {
              type: 'github.updated',
              banner: snapshot.banner,
              checks: snapshot.checks,
            },
          },
        ],
      })
    } finally {
      await harness.dispose()
    }
  },
)
