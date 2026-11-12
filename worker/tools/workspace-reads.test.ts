import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentWorkspacePath } from '../../src/shared/agent-workspaces'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import {
  outerWorkerBundle,
  OUTER_MACHINE_ORIGIN,
} from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
  OUTER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import { record } from '../chat/inputs'
import { workspaceLink } from '../data/workspace-link'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

function get(active: AgentWriteFixture, workspaceId?: string) {
  return active.runtime.dispatchFetch(
    `${OUTER_MACHINE_ORIGIN}${agentWorkspacePath(workspaceId)}`,
    {
      headers: { Authorization: `Bearer ${OUTER_TOKEN}` },
    },
  )
}

it('reads archived workspace facts with only its token and excludes another org', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await active.env.DB.prepare(
    "UPDATE workspaces SET base_branch = 'release', updated_at = 17, archived_at = 12, state = 'archived', sandbox_id = 'kept-disk' WHERE id = ?",
  )
    .bind(OTHER_WORKSPACE)
    .run()
  const response = await get(active, OTHER_WORKSPACE)
  expect(response.status).toBe(200)
  expect(record(await response.json()).workspace).toEqual({
    id: OTHER_WORKSPACE,
    number: 2,
    link: workspaceLink(active.env.APP_ORIGIN, 'chat-org', OTHER_WORKSPACE),
    name: OTHER_WORKSPACE,
    branch: 'owner/workspace-two',
    state: 'archived',
    owner: { id: 'owner', githubLogin: 'owner', displayName: null },
    repository: {
      id: 'chat-repository',
      fullName: 'owner/repository',
      defaultBranch: 'main',
    },
    baseBranch: 'release',
    section: { id: 'chat-section', name: 'General' },
    createdAt: 1,
    lastActivityAt: 17,
    archivedAt: 12,
    restoreUntil: 12 + WORKSPACE_RESTORE_MS,
  })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES ('foreign-section', 'other-org', 'General', 0, 1, 1)",
    ),
    active.env.DB.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('foreign-repo', 'other-org', 999, 'private/repo', 'main')",
    ),
    active.env.DB.prepare(
      "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at) VALUES ('foreign-workspace', 'other-org', 'foreign-repo', 'outsider', 'foreign-section', 'Private', 'private/branch', 'ready', 1, 1)",
    ),
  ])
  for (const id of ['foreign-workspace', 'unknown']) {
    const denied = await get(active, id)
    expect(denied.status).toBe(404)
    expect(await denied.json()).toMatchObject({
      error: { code: 'workspace_not_found' },
    })
  }
  const current = await get(active)
  expect(current.status).toBe(200)
  expect(record(record(await current.json()).workspace).id).toBe(
    OUTER_WORKSPACE,
  )
})
