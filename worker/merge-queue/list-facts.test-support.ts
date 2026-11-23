import { expect } from 'vitest'
import { readWorkspaceList } from '../../src/app/api/read-workspaces'
import { workspacesPath } from '../../src/shared/workspaces'
import { createApp } from '../application'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import type { AppDependencies } from '../env'
import type { QueueFixture } from './queue.test-support'

export function listReader(
  f: QueueFixture,
  fetch: AppDependencies['fetch'] = f.api.fetch,
) {
  let now = Date.now()
  const app = createApp({ fetch, now: () => now })
  return {
    advance(milliseconds: number) {
      now += milliseconds
    },
    async read(cookie = f.cookies.ownerCookie) {
      const tasks: Promise<unknown>[] = []
      const response = await app.fetch(
        new Request(`${f.env.APP_ORIGIN}${workspacesPath(OUTER_ORG)}`, {
          headers: { ...f.headers, Cookie: cookie },
        }),
        f.env,
        { waitUntil: (task) => tasks.push(task) },
      )
      expect(response.status).toBe(200)
      return {
        body: readWorkspaceList(await response.json()),
        refresh: Promise.all(tasks),
      }
    },
  }
}
