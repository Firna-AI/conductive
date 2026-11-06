import { Workspace } from '../workspace'
import { BoatClient } from '../sandbox/boat'
import { ProviderError } from '../sandbox/errors'
import { GitHubClient } from '../security/github'
import { refreshGitHubTokens } from '../security/github-refresh'
import { gitRequest } from './image-sources/git-http'
import { installationToken } from './image-sources/github-app'
import { HttpError } from '../http'
import type { LifecycleEnvironment } from './runtime'
import type { WorkspaceStartJob } from './start-types'
import { START_JOB_KEY } from './start-storage'
import { IDLE_MS } from './durable-types'

/** Test transport only. Every start and stop runs the actual Workspace implementation. */
export class WorkspaceRuntimeFixture extends Workspace {
  async tick(): Promise<void> {
    await this.alarm()
  }
  checkpoint(): Promise<WorkspaceStartJob | undefined> {
    return this.ctx.storage.get(START_JOB_KEY)
  }
  async becomeIdle(): Promise<void> {
    const state = await this.readLifecycle()
    if (!state) throw new Error('No workspace lifecycle')
    await this.ctx.storage.put('lifecycle:state', {
      ...state,
      lastActivityAt: Date.now() - IDLE_MS - 1,
    })
    await this.alarm()
  }
}

export default {
  async fetch(request: Request, env: LifecycleEnvironment): Promise<Response> {
    const path = new URL(request.url).pathname
    const events = path.match(
      /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/events$/,
    )
    if (events)
      return env.WORKSPACES.getByName(decodeURIComponent(events[1])).fetch(
        request,
      )
    const send = (request: Request) => fetch(request)
    try {
      switch (new URL(request.url).pathname) {
        case '/boat':
          await new BoatClient('boat-first', send, {
            id: 'team-one',
            type: 'org',
          }).get('bx_one')
          break
        case '/signin':
          await new GitHubClient(send).authorize(
            'private-code',
            'private-verifier',
            env,
          )
          break
        case '/refresh':
          await refreshGitHubTokens(env, 'private-refresh', {
            fetch: send,
            now: Date.now,
          })
          break
        case '/source':
          await gitRequest(
            send,
            'https://github.com/example/source.git/info/refs?service=git-upload-pack',
            'private-source-token',
          )
          break
        case '/installation': {
          const keys = await crypto.subtle.generateKey(
            {
              name: 'RSASSA-PKCS1-v1_5',
              modulusLength: 2048,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: 'SHA-256',
            },
            false,
            ['sign', 'verify'],
          )
          if (!('privateKey' in keys))
            throw new Error('RSA key pair unavailable')
          await installationToken(send, env.GITHUB_CLIENT_ID, keys.privateKey, {
            id: 'source',
            orgId: 'org',
            fullName: 'example/source',
            defaultBranch: 'main',
            githubRepositoryId: 1,
            installationId: 91,
          })
          break
        }
      }
      return Response.json({ result: 'unexpected_success' })
    } catch (error) {
      if (error instanceof ProviderError)
        return Response.json({ error: error.kind, status: error.status })
      if (error instanceof HttpError)
        return Response.json({ error: error.code, status: error.status })
      if (
        error instanceof Error &&
        error.message === 'GitHub source is not available'
      )
        return Response.json({ error: 'source_refused' })
      if (
        error instanceof Error &&
        error.message === 'Installation access is not available'
      )
        return Response.json({ error: 'installation_refused' })
      return Response.json({ error: 'unexpected_runtime_error' })
    }
  },
}
