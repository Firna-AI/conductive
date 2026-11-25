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
  if (api.refusedBaseWrites.has(number))
    return Response.json(
      { message: 'GitHub refused the base write.' },
      { status: 422 },
    )
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
