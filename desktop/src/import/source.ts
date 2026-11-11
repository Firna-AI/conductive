import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { SourceSession, SourceWorkspace } from './types.ts'
import type { ImportLocations } from './locations.ts'
import type { ImportLocationsInput } from './types.ts'

export const conductorDatabasePath = ({ home }: ImportLocationsInput) =>
  join(home, 'Library/Application Support/com.conductor.app/conductor.db')

export const sourceExists = (locations: ImportLocationsInput) =>
  existsSync(conductorDatabasePath(locations))

const columns = {
  workspaces: [
    'local_id',
    'workspace_name',
    'directory_name',
    'branch',
    'state',
    'pr_title',
    'workspace_path',
    'repository_id',
  ],
  repos: ['id', 'remote_url', 'name', 'default_branch', 'root_path'],
  sessions: [
    'id',
    'workspace_id',
    'claude_session_id',
    'agent_type',
    'title',
    'model',
  ],
} as const
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length
    ? value
    : typeof value === 'number'
      ? String(value)
      : null

function githubRepository(remote: string | null): string | null {
  if (!remote) return null
  const match =
    /^(?:https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([^/?#\s]+)\/([^/?#\s]+?)(?:\.git)?\/?$/i.exec(
      remote,
    )
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null
}

/** Only the three metadata tables have a read path. WAL stays in place. */
export function readSource(locations: ImportLocations): SourceWorkspace[] {
  const db = new DatabaseSync(conductorDatabasePath(locations), {
    readOnly: true,
  })
  try {
    db.exec('BEGIN')
    let sessionCountKnown = false
    const read = (table: keyof typeof columns) => {
      const present = new Set(
        db
          .prepare(`PRAGMA table_info(${table})`)
          .all()
          .map((row) => row.name),
      )
      const selected = columns[table].filter((column) => present.has(column))
      if (table === 'sessions')
        sessionCountKnown = present.has('workspace_id') && present.has('id')
      return selected.length
        ? db.prepare(`SELECT ${selected.join(',')} FROM ${table}`).all()
        : []
    }
    const repositories = read('repos')
    const sessions = read('sessions')
    const result: SourceWorkspace[] = []
    for (const workspace of read('workspaces')) {
      const id = text(workspace.local_id)
      if (!id || workspace.state === 'archived') continue
      const repositoryId = text(workspace.repository_id)
      const repository =
        repositoryId === null
          ? undefined
          : repositories.find((repo) => text(repo.id) === repositoryId)
      const nativeSessions: SourceSession[] = sessions
        .filter((session) => text(session.workspace_id) === id)
        .flatMap<SourceSession>((session) => {
          const sessionId = text(session.id)
          if (!sessionId) return []
          const agent = text(session.agent_type)
          return [
            {
              id: sessionId,
              title: text(session.title),
              agent: agent === 'claude' || agent === 'codex' ? agent : null,
              model: text(session.model),
              nativeId: text(session.claude_session_id),
            },
          ]
        })
        .sort((left, right) =>
          left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
        )
      const directory = text(workspace.directory_name)
      const repoName = repository && text(repository.name)
      result.push({
        row: {
          localWorkspaceId: id,
          name:
            text(workspace.workspace_name) ??
            text(workspace.pr_title) ??
            text(workspace.branch) ??
            directory ??
            id,
          repository: githubRepository(
            repository ? text(repository.remote_url) : null,
          ),
          branch: text(workspace.branch),
          sessionCount: sessionCountKnown ? nativeSessions.length : null,
          uploadBytes: null,
        },
        path:
          text(workspace.workspace_path) ??
          (repoName && directory
            ? join(locations.home, 'conductor/workspaces', repoName, directory)
            : null),
        sessions: nativeSessions,
      })
    }
    db.exec('COMMIT')
    return result.sort((left, right) =>
      left.row.localWorkspaceId < right.row.localWorkspaceId
        ? -1
        : left.row.localWorkspaceId > right.row.localWorkspaceId
          ? 1
          : 0,
    )
  } finally {
    db.close()
  }
}
