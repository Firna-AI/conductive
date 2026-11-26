import { afterEach, beforeAll, beforeEach } from 'vitest'

import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import { saveGitHubTokens } from '../security/github-tokens'

export const SKILLS_LOOKUP_PATH = orgSettingsPaths.skills(OUTER_ORG)
export const SKILLS_SETTINGS_PATH = orgSettingsPaths.settings(OUTER_ORG)
export const SKILLS_GITHUB_REPO = '/repos/owner/skills'
export const SKILLS_GITHUB_TREE = `${SKILLS_GITHUB_REPO}/git/trees/release%2Fskills?recursive=1`

export function setupSkillsLookupTests() {
  let bundle: string
  let fixture: OuterRuntime
  beforeAll(async () => {
    bundle = await outerWorkerBundle()
  })
  beforeEach(async () => {
    fixture = await createOuterRuntime(bundle)
    await fixture.env.DB.prepare(
      'UPDATE settings SET skills_repository = ? WHERE org_id = ?',
    )
      .bind('owner/skills', OUTER_ORG)
      .run()
    for (const user of ['owner', 'member']) {
      await saveGitHubTokens(
        fixture.env,
        user,
        {
          accessToken: `skills-token-${user}`,
          refreshToken: null,
          expiresAt: null,
          refreshExpiresAt: null,
        },
        Date.now(),
      )
    }
  })
  afterEach(async () => {
    await fixture?.dispose()
  })
  return () => fixture
}

export function fakeSkillsGitHub(
  fixture: OuterRuntime,
  options: {
    paths?: readonly string[]
    truncated?: boolean
    private?: boolean
    recordStatus?: number
    treeStatus?: number
    treeMessage?: string
    record?: unknown
    tree?: unknown
  } = {},
) {
  const fallback = fixture.github.fetch
  fixture.github.fetch = async (request) => {
    const url = new URL(request.url)
    if (url.origin !== 'https://api.github.com') return fallback(request)
    const route = `${url.pathname}${url.search}`
    if (route !== SKILLS_GITHUB_REPO && route !== SKILLS_GITHUB_TREE)
      return fallback(request)
    fixture.github.requests.push(request.clone())
    if (route === SKILLS_GITHUB_REPO) {
      return Response.json(
        options.record ?? {
          private: options.private ?? false,
          default_branch: 'release/skills',
        },
        {
          status: options.recordStatus ?? 200,
          headers:
            options.recordStatus === 301
              ? { Location: 'https://api.github.com/users/redirected' }
              : undefined,
        },
      )
    }
    return Response.json(
      options.tree ??
        (options.treeMessage === undefined
          ? {
              truncated: options.truncated ?? false,
              tree: (options.paths ?? ['skills/example/SKILL.md']).map(
                (path) => ({
                  path: path.endsWith('/') ? path.slice(0, -1) : path,
                  type: path.endsWith('/') ? 'tree' : 'blob',
                }),
              ),
            }
          : { message: options.treeMessage }),
      { status: options.treeStatus ?? 200 },
    )
  }
}
