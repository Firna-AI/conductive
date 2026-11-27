import type { WebSocket } from 'miniflare'
import { beforeAll, expect, it } from 'vitest'

import { workspacePaths } from '../../src/shared/workspaces'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  OuterFakeRunner,
  requestRunner,
} from '../chat/integration/runner-socket.test-support'
import { REPOSITORY_CHANGE_JOB_KEY } from '../lifecycle/repository-change-types'
import { featureFixture, featureState } from './fixture.test-support'

const OLD_FOLDER = '/home/user/code/hello-world'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/continue-entry.test-support.ts',
  )
})

it('admits a clone through the repository route when the connected runner can add a folder', async () => {
  const f = await featureFixture(bundle)
  const sockets: WebSocket[] = []
  try {
    const location = {
      repositoryId: OUTER_REPOSITORY,
      directory: OLD_FOLDER,
      variable: 'CONDUCTIVE_REPOSITORY_HELLO_WORLD_DIR',
    }
    await f.env.DB.batch([
      f.env.DB.prepare(
        "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (91, 'owner', 'User', 1)",
      ),
      f.env.DB.prepare(
        "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id, selected) VALUES ('unheld', ?, 78, 'owner/unheld', 'main', 91, 1)",
      ).bind(OUTER_ORG),
      f.env.DB.prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_clone' WHERE id = ?",
      ).bind(OUTER_WORKSPACE),
      f.env.DB.prepare(
        'UPDATE workspace_runtime SET repository_locations_json = ? WHERE workspace_id = ?',
      ).bind(JSON.stringify([location]), OUTER_WORKSPACE),
    ])
    const socket = (await requestRunner(f)).webSocket
    if (!socket) throw new Error('Missing clone runner socket.')
    sockets.push(socket)
    const runner = new OuterFakeRunner(socket, OUTER_WORKSPACE, {
      repositoryFolder: OLD_FOLDER,
      addsRepositoryFolder: true,
    })
    expect(record(await runner.inbox.next()).type).toBe('welcome')
    const clone = await f.request(
      workspacePaths.repository(OUTER_ORG, OUTER_WORKSPACE),
      {
        method: 'POST',
        headers: { Cookie: f.cookies.memberCookie },
        body: JSON.stringify({
          expectedRepositoryId: OUTER_REPOSITORY,
          expectedBranch: 'owner/workspace-one',
          repositoryId: 'unheld',
          allowWork: true,
        }),
      },
    )
    expect(clone.status).toBe(202)
    expect(
      featureState(await f.control('state')).get(REPOSITORY_CHANGE_JOB_KEY),
    ).toMatchObject({
      target: {
        repositoryId: 'unheld',
        clone: { variable: 'CONDUCTIVE_REPOSITORY_UNHELD_DIR' },
      },
    })
  } finally {
    await Promise.all([closeSockets(...sockets), f.dispose()])
  }
})
