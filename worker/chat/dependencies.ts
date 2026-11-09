import type { AppEnv } from '../env'
import { runnerTokenAllowed } from '../data/workspace-token-access'
import { HttpError } from '../http'
import { randomToken } from '../security/crypto'
import {
  readConnectionAccess,
  scheduleConnectionCheck,
} from '../security/connection-access'
import { loginResolver } from './login-access'
import {
  readLoginMetadata,
  type SessionLoginMetadata,
} from './login-availability'
import { readAutomaticTitleWorkspace } from './queries'
import { titleModelBinding } from './title-model'
import { readRunnerProtocolVersion } from './runner-version-data'
import type { ChatDependencies } from './types'
import { filterRunnerOutput } from './runner-output'

/**
 * The default seams of `WorkspaceChat`. A feature owner replaces one with an
 * override. The login resolver always wraps the override, so that the
 * sender's access check runs first.
 */
export function chatDependencies(
  env: AppEnv,
  workspaceId: () => string | null,
  overrides: Partial<ChatDependencies> = {},
): ChatDependencies {
  return {
    readAutomaticTitleWorkspace: (id) =>
      readAutomaticTitleWorkspace(env.DB, id),
    runTitleModel: titleModelBinding(env),
    filterRunnerOutput: (transaction, workspace, input) =>
      filterRunnerOutput(env, transaction, workspace, input),
    now: Date.now,
    scheduleBrowserCheck: scheduleConnectionCheck,
    scheduleRunnerCheck: scheduleConnectionCheck,
    readRunnerAccess: (id, tokenHash) =>
      runnerTokenAllowed(env.DB, id, tokenHash),
    readRunnerProtocolVersion: (id) => readRunnerProtocolVersion(env.DB, id),
    readConnectionAccess: (tabs, now) =>
      readConnectionAccess(env.DB, tabs, now),
    randomId: randomToken,
    randomConnectionId: randomToken,
    readLoginMetadata: (targets) => {
      const id = workspaceId()
      return id === null
        ? Promise.resolve(new Map<string, SessionLoginMetadata>())
        : readLoginMetadata(env.DB, id, targets)
    },
    resolveAttachments: async (_userId, _workspaceId, ids) => {
      if (ids.length)
        throw new HttpError(
          503,
          'attachments_unavailable',
          'Attachments are not available. Try again.',
        )
      return { attachments: [], paths: [] }
    },
    receiveFileResult: async () => undefined,
    runnerAttached: () => undefined,
    runnerDetached: () => undefined,
    runnerEventStored: async () => undefined,
    runnerReady: async () => undefined,
    runnerHello: async () => undefined,
    runnerDisconnected: async () => undefined,
    turnDispatching: async () => true,
    turnDispatchFailed: async () => undefined,
    browserOpened: async () => undefined,
    browserClosed: async () => undefined,
    waitUntil: (promise) => {
      void promise.catch(() => undefined)
    },
    matchesObject: () => true,
    ...overrides,
    resolveLogin: loginResolver(env, workspaceId, overrides.resolveLogin),
  }
}
