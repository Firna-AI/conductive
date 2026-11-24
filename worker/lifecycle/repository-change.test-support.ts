import { onTestFinished } from 'vitest'

import type { User } from '../../src/shared/api'
import { MACHINE_PATHS, TOOL_TURN_HEADER } from '../../src/shared/agent-tools'
import type { ChangeRepositoryRequest } from '../../src/shared/workspaces'
import {
  createChatFixture,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from '../chat/harness.test-support'
import { readBranchWork } from '../github/branch-work'
import { createGitHubStatePort } from '../github/chat-store'
import { GitHubReader } from '../github/client'
import { HEAD_SHA } from '../github/fake-pull'
import { RepositoryGitHub } from '../github/fake-repository'
import type { GitHubWorkspace } from '../github/contracts'
import { refreshWorkspace } from '../github/refresh'
import { WorkspaceGitHubState } from '../github/workspace-state'
import { saveGitHubTokens } from '../security/github-tokens'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import type { DurableLifecycleState } from './durable-types'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import { LifecycleHost } from './lifecycle-host-test-support'
import { handleGitCredential } from './machine'
import { WorkspaceRepositoryChange } from './repository-change'
import {
  REPOSITORY_CHANGE_JOB_KEY,
  type RepositoryChangeJob,
  type RepositoryChangeOptions,
  type RunnerView,
} from './repository-change-types'

export const OLD_FOLDER = '/home/user/code/hello-world'
export const NEW_FOLDER = '/home/user/code/billing'

/** A workspace in `repo` whose sandbox also holds `billing`, and the job of a change. */
export async function repositoryChangeFixture(harness: TestHarness) {
  const chat = await createChatFixture(harness)
  const api = new RepositoryGitHub(harness.github)
  api.branches.set('refs/heads/octocat/test', HEAD_SHA)
  api.comparisons.set('refs/heads/main', new Map([[HEAD_SHA, 0]]))
  const boat = new LifecycleBoat()
  const host = new LifecycleHost(chat.env, boat)
  onTestFinished(() => host.close())
  boat.commandOutput = ''
  boat.synchronousOutput = '\0' + '0\n'
  boat.states.set('bx_change', 'ready')
  const work = new Map<string, string>()
  let inspectionBranch = 'main'
  boat.beforeCommand = async (command, detached) => {
    if (detached) return
    if (command.includes('symbolic-ref --quiet --short HEAD'))
      boat.synchronousOutput = `${inspectionBranch}\n`
    else if (command.includes('git status'))
      boat.synchronousOutput =
        [...work].find(([folder]) => command.includes(`cd '${folder}'`))?.[1] ??
        '\0' + '0\n'
    else boat.synchronousOutput = ''
  }
  const { DB: db } = chat.env
  await db.batch([
    db
      .prepare(
        "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (1, 'example', 'Organization', ?)",
      )
      .bind(TEST_TIME),
    db
      .prepare(
        'UPDATE repositories SET github_repository_id = ?, full_name = ?, installation_id = 1 WHERE id = ?',
      )
      .bind(api.repositoryId, api.fullName, 'repo'),
    db
      .prepare(
        "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES ('billing', ?, 77, 'example/billing', 'trunk', 1), ('unheld', ?, 78, 'example/unheld', 'main', 1)",
      )
      .bind(chat.org.id, chat.org.id),
    db
      .prepare(
        "UPDATE workspaces SET name = 'Kept name', state = 'ready', sandbox_id = 'bx_change' WHERE id = ?",
      )
      .bind(WORKSPACE_ID),
    db
      .prepare(
        `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id, repository_locations_json)
      VALUES (?, ?, ?, 'first-session', 'first-turn', 'claude', 'test-claude', 'high', 'first-message', ?)`,
      )
      .bind(
        WORKSPACE_ID,
        chat.org.id,
        chat.owner.id,
        JSON.stringify([
          {
            repositoryId: 'billing',
            directory: NEW_FOLDER,
            variable: 'CONDUCTIVE_REPOSITORY_BILLING_DIR',
          },
          {
            repositoryId: 'repo',
            directory: OLD_FOLDER,
            variable: 'CONDUCTIVE_REPOSITORY_HELLO_WORLD_DIR',
          },
        ]),
      ),
  ])
  await host.seed(chat.org.id, WORKSPACE_ID, 'bx_change')
  const user = async (id: string) => {
    const value = await db
      .prepare(
        'SELECT id, github_id AS githubId, github_login AS githubLogin, display_name AS displayName, avatar_url AS avatarUrl FROM users WHERE id = ?',
      )
      .bind(id)
      .first<User>()
    if (!value) throw new Error('Missing fixture user.')
    return value
  }
  const member = await user(chat.member.id)
  const owner = await user(chat.owner.id)
  for (const [id, accessToken] of [
    [member.id, 'member-change-token'],
    [owner.id, 'owner-change-token'],
  ])
    await saveGitHubTokens(
      chat.env,
      id,
      {
        accessToken,
        expiresAt: null,
        refreshToken: null,
        refreshExpiresAt: null,
      },
      TEST_TIME,
    )
  let next = 0
  let now = TEST_TIME
  const refreshed: GitHubWorkspace[] = []
  const resumed: string[] = []
  const state = new WorkspaceGitHubState(
    createGitHubStatePort(chat.chat, WORKSPACE_ID, async () => {}),
  )
  const reads = {
    now: () => TEST_TIME,
    fetch: api.fetch,
    token: async () => 'server-read-token',
  }
  const controls = {
    newBase: 'trunk',
    runner: { state: 'hello', canMove: true } as RunnerView,
    lifecycle: null as DurableLifecycleState | null,
    moves: 0,
  }
  const options: RepositoryChangeOptions = {
    env: chat.env,
    chat: chat.chat,
    storage: chat.storage,
    dependencies: {
      now: () => now,
      randomToken: () => `change-${++next}`,
      fetch: (request) =>
        new URL(request.url).hostname === 'api.github.com'
          ? api.fetch(request)
          : boat.fetch(request),
    },
    run: async (operation) => {
      const result = await chat.chat.runLifecycle(async () => {
        const result = await operation()
        await chat.chat.flushRunner()
        return result
      })
      await chat.drain()
      return result
    },
    schedule: async () => {},
    defaultBranch: async () => controls.newBase,
    oldBranchWork: async (binding, userId) =>
      readBranchWork(
        await refreshWorkspace(chat.env.DB, binding, { userId }, state, reads),
        (base, sha) =>
          new GitHubReader(reads, binding, 'server-read-token').aheadBy(
            base,
            sha,
          ),
      ),
    scheduleRefresh: async (binding) => {
      refreshed.push(binding)
    },
    resume: async (_org, id) => {
      resumed.push(id)
      await db
        .prepare("UPDATE workspaces SET state = 'ready' WHERE id = ?")
        .bind(id)
        .run()
    },
    lifecycle: async () => controls.lifecycle,
    runner: async () => controls.runner,
    moveRunner: async () => {
      controls.moves++
      await chat.chat.runner.checkRepository()
    },
    matches: (id) => id === WORKSPACE_ID,
    assertActive: async () => {},
    activity: async () => {},
  }
  let coordinator = new WorkspaceRepositoryChange(options)
  const start = (
    request: Partial<ChangeRepositoryRequest> = {},
    sender = member,
  ) =>
    coordinator.start(
      chat.org.id,
      WORKSPACE_ID,
      sender,
      {
        expectedRepositoryId: 'repo',
        expectedBranch: 'octocat/test',
        repositoryId: 'billing',
        ...request,
      },
      TEST_ORIGIN,
    )
  const active = () =>
    chat.storage.get<RepositoryChangeJob | null>(REPOSITORY_CHANGE_JOB_KEY)
  const advanceTo = async (phase: RepositoryChangeJob['phase']) => {
    for (let step = 0; step < 20; step++) {
      const current = await active()
      if (current?.phase === phase) return current
      if (!current) throw new Error(`The change ended before ${phase}.`)
      await coordinator.advance()
    }
    throw new Error(`The change did not reach ${phase}.`)
  }
  const finish = async () => {
    for (let step = 0; step < 20 && (await active()); step++)
      await coordinator.advance()
    if (await active()) throw new Error('The change did not end.')
  }
  const credential = (id: string) =>
    handleGitCredential(
      new Request(`${chat.env.MACHINE_ORIGIN}${MACHINE_PATHS.gitCredential}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WORKSPACE_TOKEN}`,
          [TOOL_TURN_HEADER]: id,
        },
      }),
      {
        env: chat.env,
        dependencies: options.dependencies,
        workspace: () => ({
          credentialSender: async (id) =>
            (await coordinator.credentialSender(id)) ?? null,
        }),
      },
    )
  return {
    ...chat,
    ownerUser: owner,
    memberUser: member,
    api,
    boat,
    host,
    controls,
    work,
    options,
    refreshed,
    resumed,
    start,
    active,
    advanceTo,
    finish,
    credential,
    get coordinator() {
      return coordinator
    },
    reconstruct: () => {
      coordinator = new WorkspaceRepositoryChange(options)
    },
    inspectBranch: (branch: string) => {
      inspectionBranch = branch
    },
    later: (milliseconds: number) => {
      now += milliseconds
    },
    detached: () => boat.commandRequests.filter(({ detached }) => detached),
    result: (id: string, sender = member) =>
      coordinator.result(chat.org.id, WORKSPACE_ID, sender.id, id, TEST_ORIGIN),
  }
}
