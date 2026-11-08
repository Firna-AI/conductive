import { Workspace } from '../workspace'
import { sandboxProvider } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { GitHubClient } from '../security/github'
import { refreshGitHubTokens } from '../security/github-refresh'
import { installationToken } from './image-sources/github-app'
import { HttpError } from '../http'
import type { LifecycleEnvironment } from './runtime'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import { START_JOB_KEY } from './start-storage'
import { IDLE_MS } from './durable-types'
import type { FirstWorkspaceMessage } from './workspace-runtime'
import type { UserMessage } from '../../src/shared/messages'
import { holdMachineCheckpoint } from './runtime-checkpoint-test-support'
import type { ImageCoordinatorState } from './image-timers'
import { ManualChatClock } from '../chat/chat-clock.test-support'
import { CONNECTION_CHECK_MS } from '../security/connection-access'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { authenticateWorkspaceToken } from './tokens'

/** Test transport only. Every start and stop runs the actual Workspace implementation. */
export class WorkspaceRuntimeFixture extends Workspace {
  private heldMachine: ReturnType<typeof holdMachineCheckpoint> | undefined
  private readonly runnerClock: ManualChatClock

  constructor(context: DurableObjectState, env: LifecycleEnvironment) {
    const clock = new ManualChatClock(Date.now())
    super(context, env, Date.now, {
      scheduleRunnerCheck: clock.schedule,
      resolveAttachments: async (_userId, _workspaceId, ids) => ({
        attachments: ids.map((id) => ({
          id,
          name: `${id}.txt`,
          kind: 'file',
          mediaType: 'text/plain',
          sizeBytes: 7,
        })),
        paths: ids.map((id) => ({
          attachmentId: id,
          path: `/attachments/${id}.txt`,
        })),
      }),
    })
    this.runnerClock = clock
  }

  tickRunnerAccess(): Promise<void> {
    return this.runnerClock.advance(CONNECTION_CHECK_MS)
  }
  holdMachineCheckpoint(): void {
    this.heldMachine = holdMachineCheckpoint(this.ctx.storage)
  }
  async machineCheckpointReached(): Promise<void> {
    if (!this.heldMachine) throw new Error('No held machine checkpoint')
    await this.heldMachine.entered
  }
  async acceptFirstFixtureMessage(
    first: FirstWorkspaceMessage,
  ): Promise<UserMessage> {
    return this.acceptLifecycleFirstMessage(first)
  }
  async tick(): Promise<void> {
    await this.alarm()
  }
  alarmAt(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }
  imageSchedule(): Promise<ImageCoordinatorState | undefined> {
    return this.ctx.storage.get('org-image:coordinator')
  }
  checkpoint(): Promise<StoredWorkspaceStartJob | undefined> {
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
    if (path === MACHINE_PATHS.runner) {
      const bearer = request.headers
        .get('Authorization')
        ?.match(/^Bearer (.+)$/i)?.[1]
      const identity = await authenticateWorkspaceToken(env, bearer ?? '')
      return env.WORKSPACES.getByName(identity.workspaceId).fetch(request)
    }
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
          await sandboxProvider(env, send).get('bx_one')
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
