import type { SkillsRepositoryLookupResponse } from '../../src/shared/org-settings'
import { findSkillFolders } from '../../src/shared/skill-folders'
import type { AppDependencies } from '../env'
import { flag, githubFailure, nodes, object, text } from '../github/parsers'
import {
  GITHUB_API_BODY_BYTES,
  githubRequest,
  withGitHubResponse,
} from '../github/transport'
import { readBoundedBody } from '../http/bounded-body'
import { reconnectRequired } from '../security/github-tokens'

async function githubObject(
  response: Response,
): Promise<Record<string, unknown>> {
  const body =
    response.body === null
      ? new Uint8Array(0)
      : await readBoundedBody(response.body, GITHUB_API_BODY_BYTES)
  const value: unknown = JSON.parse(new TextDecoder().decode(body))
  return object(value)
}

async function readGitHub(
  dependencies: AppDependencies,
  token: string,
  path: string,
  kind: 'repository' | 'tree',
): Promise<Record<string, unknown> | null> {
  return withGitHubResponse(
    dependencies.fetch,
    githubRequest(path, token),
    async (response) => {
      if (kind === 'tree' && response.status === 409) {
        const body = await githubObject(response)
        if (body.message === 'Git Repository is empty.')
          return { truncated: false, tree: [] }
        throw githubFailure()
      }
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined)
        if (response.status === 401) throw reconnectRequired()
        if (response.status === 404) return null
        throw githubFailure()
      }
      return githubObject(response)
    },
  )
}

/** The caller checks the repository name before it reaches these two routes. */
export async function lookupGitHubSkills(
  repository: string,
  token: string,
  dependencies: AppDependencies,
): Promise<SkillsRepositoryLookupResponse> {
  const result: SkillsRepositoryLookupResponse = {
    repository,
    skills: [],
    notice: null,
    clashes: [],
  }
  const record = await readGitHub(
    dependencies,
    token,
    `/repos/${repository}`,
    'repository',
  )
  if (!record) return { ...result, notice: 'not-found' }
  if (flag(record.private)) return { ...result, notice: 'private' }
  const branch = text(record.default_branch)
  if (!branch || branch === '.' || branch === '..') throw githubFailure()
  const tree = await readGitHub(
    dependencies,
    token,
    `/repos/${repository}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    'tree',
  )
  if (!tree) return { ...result, notice: 'not-found' }
  const paths: string[] = []
  for (const value of nodes(tree.tree)) {
    const entry = object(value)
    const path = text(entry.path)
    if (entry.type === 'blob') paths.push(path)
    else if (entry.type === 'tree') paths.push(`${path}/`)
  }
  const { skills, clashes } = findSkillFolders(
    paths,
    repository.slice(repository.indexOf('/') + 1),
  )
  return {
    repository,
    skills: skills.map((skill) => skill.name),
    notice: flag(tree.truncated)
      ? 'incomplete'
      : skills.length
        ? null
        : 'no-skills',
    clashes,
  }
}
