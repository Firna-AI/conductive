import type { WorkspaceChat } from '../chat/backend'
import { errorResponse, HttpError } from '../http'
import { createGitHubStatePort } from './chat-store'
import type { GitHubStatePort } from './contracts'
import { activeWorkspace } from './data'
import {
  SQLITE_WORKSPACE_ID,
  sqliteSnapshot,
} from './sqlite-fixtures.test-support'
import { WorkspaceGitHubState } from './workspace-state'

function barrier() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

async function prepareAccess(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('member', 11, 'member', 1, 1)",
    ),
    db.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('org', 'member', 'member', 1)",
    ),
    db.prepare(
      "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (10, 'owner', 'User', 1)",
    ),
    db.prepare(
      "UPDATE repositories SET installation_id = 10 WHERE id = 'repo'",
    ),
  ])
}

async function removeMember(db: D1Database): Promise<void> {
  await db
    .prepare(
      "DELETE FROM org_members WHERE org_id = 'org' AND user_id = 'member'",
    )
    .run()
}

/** Hold the actual chat queue only after the receipt and outside access checks. */
export async function queuedAccessRace(
  chat: WorkspaceChat,
  db: D1Database,
  replay: boolean,
): Promise<Response> {
  await prepareAccess(db)
  const entered = barrier()
  const release = barrier()
  const queued = barrier()
  const trace: string[] = []
  let hold: Promise<void> | undefined
  let checks = 0
  let reads = 0
  const authorize = async () => {
    const workspace = await activeWorkspace(
      db,
      SQLITE_WORKSPACE_ID,
      'org',
      'member',
    )
    if (!workspace)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    checks++
    if (checks !== 2) return
    trace.push('outside-access-passed')
    hold = chat.store.run(async () => {
      trace.push('chat-queue-held')
      entered.resolve()
      await release.promise
      trace.push('chat-queue-released')
    })
    await entered.promise
  }
  const base = createGitHubStatePort(
    chat,
    SQLITE_WORKSPACE_ID,
    async () => undefined,
  )
  const port: GitHubStatePort = {
    ...base,
    run: (check, work) => {
      const result = base.run(check, work)
      trace.push('github-operation-queued')
      queued.resolve()
      return result
    },
  }
  const state = new WorkspaceGitHubState(port)
  const pending = state
    .refresh(
      async () => {
        reads++
        const snapshot = sqliteSnapshot()
        return {
          ...snapshot,
          banner: {
            ...snapshot.banner,
            state: 'none',
            pullRequest: null,
          },
        }
      },
      authorize,
      { deliveryId: replay ? 'baseline' : 'pending' },
    )
    .then(
      (snapshot) => Response.json({ snapshot }),
      (error: unknown) => errorResponse(error),
    )
  try {
    await queued.promise
    await removeMember(db)
    trace.push('membership-removed')
  } finally {
    release.resolve()
  }
  await hold
  const response = await pending
  const body: unknown = await response.json()
  return Response.json({
    result: { status: response.status, body },
    trace,
    reads,
    allowedAfterRemoval: await activeWorkspace(
      db,
      SQLITE_WORKSPACE_ID,
      'org',
      'member',
    ),
    history: await chat.readWorkspace(SQLITE_WORKSPACE_ID, (view) =>
      view.history(0),
    ),
  })
}
