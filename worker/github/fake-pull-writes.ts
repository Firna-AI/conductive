import { isRecord } from '../http'
import { restPull } from './fake-pull'
import type { RepositoryGitHub } from './fake-repository'

export function repositoryToken(request: Request): string {
  return (request.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
}

export function canWritePulls(
  api: RepositoryGitHub,
  request: Request,
): boolean {
  const permission = api.merges.capabilities(
    repositoryToken(request),
  ).viewerPermission
  return ['WRITE', 'MAINTAIN', 'ADMIN'].includes(permission ?? '')
}

export async function changeFakePullBase(
  api: RepositoryGitHub,
  request: Request,
  number: number,
): Promise<Response> {
  const pull = api.pulls[number]
  if (!pull)
    return Response.json({ message: 'Missing pull request.' }, { status: 404 })
  if (!canWritePulls(api, request))
    return Response.json(
      { message: 'The token cannot edit this pull request.' },
      { status: 403 },
    )
  const input: unknown = await request.json()
  if (
    !isRecord(input) ||
    typeof input.base !== 'string' ||
    !api.branches.has(`refs/heads/${input.base}`)
  )
    return Response.json(
      { message: 'The base branch is missing.' },
      { status: 422 },
    )
  pull.baseRefName = input.base
  return Response.json(restPull(pull, api))
}

function rebaseError(type: string) {
  return Response.json({
    data: { updatePullRequestBranch: null },
    errors: [{ type, message: 'GitHub detail that must stay on the server.' }],
  })
}

export function rebaseFakePull(
  api: RepositoryGitHub,
  request: Request,
  input: unknown,
): Response {
  if (!isRecord(input) || input.updateMethod !== 'REBASE')
    return rebaseError('UNPROCESSABLE')
  const pull = Object.values(api.pulls).find(
    (pull) => input.pullRequestId === `PR_${pull.number}`,
  )
  if (!pull || api.deniedTokens.has(repositoryToken(request)))
    return rebaseError('NOT_FOUND')
  if (!canWritePulls(api, request)) return rebaseError('FORBIDDEN')
  if (
    pull.state !== 'OPEN' ||
    input.expectedHeadOid !== pull.headRefOid ||
    pull.mergeable === 'CONFLICTING'
  )
    return rebaseError('UNPROCESSABLE')
  pull.headRefOid = `rebased-${pull.headRefOid}`
  api.branches.set(`refs/heads/${pull.headRefName}`, pull.headRefOid)
  return Response.json({
    data: {
      updatePullRequestBranch: { pullRequest: { id: `PR_${pull.number}` } },
    },
  })
}
