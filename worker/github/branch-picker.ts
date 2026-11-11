import type {
  WorkspaceBranchOption,
  WorkspaceBranchesResponse,
} from '../../src/shared/workspace-branches'
import type { HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import {
  githubFailure,
  githubUrl,
  integer,
  nextPage,
  nodes,
  object,
  text,
} from './parsers'
import { graphql } from './transport'
import {
  BRANCH_PICKER_QUERY,
  BRANCH_PULLS_QUERY,
} from './branch-picker-queries'

type Cursor = string | null | false
interface PickerCursor {
  branches: Cursor
  pulls: Cursor
}
interface RepositoryIdentity {
  repositoryId: number
  fullName: string
  defaultBranch: string
}

function isCursor(value: unknown): value is Cursor {
  return value === false || value === null || typeof value === 'string'
}

function readCursor(value: string | null): PickerCursor {
  if (value === null) return { branches: null, pulls: null }
  try {
    const parsed: unknown = JSON.parse(atob(value))
    if (isRecord(parsed) && isCursor(parsed.branches) && isCursor(parsed.pulls))
      return { branches: parsed.branches, pulls: parsed.pulls }
  } catch {
    /* The cursor is an opaque value returned by this endpoint. */
  }
  throw new HttpError(400, 'invalid_input', 'Load the branch list again.')
}

export async function workspaceBranchPage(
  repository: RepositoryIdentity,
  input: { query: string; cursor: string | null },
  dependencies: { fetch: HttpFetch; token: string },
): Promise<WorkspaceBranchesResponse> {
  const cursor = readCursor(input.cursor)
  const [owner, name] = repository.fullName.split('/')
  const variables = { owner, name }
  const read = async (query: string, values: Record<string, unknown>) => {
    const result = object(
      (
        await graphql(dependencies.fetch, dependencies.token, query, {
          ...variables,
          ...values,
        })
      ).repository,
    )
    if (integer(result.databaseId) !== repository.repositoryId)
      throw githubFailure()
    return result
  }
  const query = input.query.trim().toLowerCase()
  const result = await read(BRANCH_PICKER_QUERY, {
    branchesAfter: cursor.branches || null,
    pullsAfter: cursor.pulls || null,
    withBranches: cursor.branches !== false,
    withPulls: cursor.pulls !== false,
    query: query || null,
  })
  const defaultBranch =
    result.defaultBranchRef === null
      ? repository.defaultBranch
      : text(object(result.defaultBranchRef).name)
  const rows: WorkspaceBranchOption[] = []
  if (cursor.pulls !== false) {
    const connection = object(result.pullRequests)
    for (const value of nodes(connection.nodes)) {
      const pull = object(value)
      const headRepositoryId =
        pull.headRepository === null
          ? null
          : integer(object(pull.headRepository).databaseId)
      const available = headRepositoryId === repository.repositoryId
      const branch = text(pull.headRefName)
      const title = text(pull.title)
      const number = integer(pull.number)
      const url = githubUrl(pull.url)
      if (!url) throw githubFailure()
      if (available && branch === defaultBranch) continue
      if (
        query &&
        !title.toLowerCase().includes(query) &&
        !`#${number}`.includes(query) &&
        !(available && branch.toLowerCase().includes(query))
      )
        continue
      rows.push({
        type: 'pull-request',
        number,
        title,
        url,
        branch,
        headRepositoryId,
        availability: available ? 'available' : 'another-repository',
      })
    }
    cursor.pulls = nextPage(connection.pageInfo, cursor.pulls || null) ?? false
  }
  if (cursor.branches !== false && result.refs !== null) {
    const connection = object(result.refs)
    for (const value of nodes(connection.nodes)) {
      const ref = object(value)
      const branch = text(ref.name)
      if (branch === defaultBranch || !branch.toLowerCase().includes(query))
        continue
      let pulls = object(ref.associatedPullRequests)
      let after: string | null = null
      let hasPull: boolean
      do {
        hasPull = nodes(pulls.nodes).some(
          (pull) =>
            integer(object(object(pull).repository).databaseId) ===
            repository.repositoryId,
        )
        after = nextPage(pulls.pageInfo, after)
        if (hasPull || !after) break
        const more = await read(BRANCH_PULLS_QUERY, {
          ref: `refs/heads/${branch}`,
          after,
        })
        if (more.ref === null) break
        pulls = object(object(more.ref).associatedPullRequests)
      } while (after)
      if (!hasPull) rows.push({ type: 'branch', name: branch })
    }
    cursor.branches =
      nextPage(connection.pageInfo, cursor.branches || null) ?? false
  } else cursor.branches = false
  return {
    rows,
    nextCursor:
      cursor.branches === false && cursor.pulls === false
        ? null
        : btoa(JSON.stringify(cursor)),
  }
}
