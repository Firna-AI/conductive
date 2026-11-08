import type { GitHubRepository } from '../../src/shared/account'
import { items, nested, record } from '../../src/app/api/parse'
import { readEnvelope } from '../../src/app/api/read-events'
import { workspaceEventsPath } from '../../src/shared/events'
import { saveGitHubTokens } from '../security/github-tokens'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import type { OuterRuntime } from '../chat/integration/outer-runtime.test-support'

export const CATALOG_REPOSITORY: GitHubRepository = {
  githubId: 202,
  fullName: 'owner/another-repository',
  description: 'Another project',
  defaultBranch: 'trunk',
  installationId: 91,
}

export async function lastShellWorkspaceEvent(
  fixture: OuterRuntime,
  orgId: string,
  workspaceId: string,
) {
  const response = await fixture.request(
    workspaceEventsPath(orgId, workspaceId),
    {
      headers: { Upgrade: 'websocket' },
    },
  )
  const socket = response.webSocket
  if (!socket)
    throw new Error(`The workspace event socket returned ${response.status}.`)
  const inbox = new SocketInbox(socket)
  socket.accept()
  try {
    const history = nested(record(await inbox.next()), 'history', record)
    return items(history, 'events', readEnvelope).at(-1)?.event
  } finally {
    await closeSockets(socket)
  }
}

export async function shellGitHubCatalog(fixture: OuterRuntime) {
  const requests: Request[] = []
  let available = true
  const original = fixture.github.fetch
  fixture.github.fetch = async (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/user/installations') {
      requests.push(request.clone())
      return Response.json({
        total_count: 2,
        installations: [
          {
            id: 91,
            account: { login: 'owner', type: 'User' },
            html_url: 'https://github.com/settings/installations/91',
            app_slug: 'conductive',
            suspended_at: null,
          },
          {
            id: 92,
            account: { login: 'suspended-org', type: 'Organization' },
            html_url:
              'https://github.com/organizations/suspended-org/settings/installations/92',
            app_slug: 'conductive',
            suspended_at: '2026-11-08T00:00:00Z',
          },
        ],
      })
    }
    if (url.pathname === '/user/installations/91/repositories') {
      requests.push(request.clone())
      const repository = (value: GitHubRepository) => ({
        id: value.githubId,
        full_name: value.fullName,
        description: value.description,
        default_branch: value.defaultBranch,
      })
      const page = Number(url.searchParams.get('page'))
      return Response.json({
        total_count: available ? 2 : 1,
        repositories:
          page === 1
            ? [
                repository({
                  ...CATALOG_REPOSITORY,
                  githubId: 101,
                  fullName: 'owner/repository',
                  description: '',
                  defaultBranch: 'main',
                }),
              ]
            : available
              ? [repository(CATALOG_REPOSITORY)]
              : [],
      })
    }
    return original(request)
  }
  await saveGitHubTokens(
    fixture.env,
    'owner',
    {
      accessToken: 'shell-github-user-token',
      refreshToken: null,
      expiresAt: null,
      refreshExpiresAt: null,
    },
    Date.now(),
  )
  return {
    requests,
    removeCandidate: () => {
      available = false
    },
  }
}
