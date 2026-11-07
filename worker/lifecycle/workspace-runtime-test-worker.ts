import { Workspace } from '../workspace'
import { BoatClient } from '../sandbox/boat'
import { ProviderError } from '../sandbox/errors'
import { GitHubClient } from '../security/github'
import { refreshGitHubTokens } from '../security/github-refresh'
import { installationToken } from './image-sources/github-app'
import { HttpError } from '../http'
import type { LifecycleEnvironment } from './runtime'
import type { WorkspaceStartJob } from './start-types'
import { START_JOB_KEY } from './start-storage'
import { IDLE_MS } from './durable-types'
import { ChatStore } from '../chat/store'
import type { FirstWorkspaceMessage } from './workspace-runtime'
import type { UserMessage } from '../../src/shared/messages'

/** Test transport only. Every start and stop runs the actual Workspace implementation. */
export class WorkspaceRuntimeFixture extends Workspace {
  async acceptFirstFixtureMessage(
    first: FirstWorkspaceMessage,
  ): Promise<UserMessage> {
    const store = new ChatStore(this.ctx.storage, Date.now)
    return store.run(() =>
      store.change(
        first.workspaceId,
        async (transaction) => {
          const stored = await transaction.message(first.request.id)
          if (stored) return stored
          const message: UserMessage = {
            id: first.request.id,
            sessionId: first.sessionId,
            sender: first.sender,
            text: first.request.text,
            attachments: first.request.attachmentIds.map((id) => ({
              id,
              name: `${id}.txt`,
              kind: 'file',
              mediaType: 'text/plain',
              sizeBytes: 7,
            })),
            choice: first.request.choice,
            createdAt: Date.now(),
            state: 'queued',
          }
          await transaction.saveSession({
            id: first.sessionId,
            workspaceId: first.workspaceId,
            title: 'Session',
            choice: message.choice,
            createdAt: message.createdAt,
            closedAt: null,
            activeTurnId: null,
          })
          await transaction.saveMessage(message)
          await transaction.emit({ type: 'message.accepted', message })
          return message
        },
        () => {},
      ),
    )
  }
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
        error.message === 'Installation access is not available'
      )
        return Response.json({ error: 'installation_refused' })
      return Response.json({ error: 'unexpected_runtime_error' })
    }
  },
}
