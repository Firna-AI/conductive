import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { randomToken } from '../security/crypto'
import {
  readConnectionAccess,
  scheduleConnectionCheck,
} from '../security/connection-access'
import { loginResolver } from './login-access'
import { readLoginAvailability } from './login-availability'
import type { ChatDependencies } from './types'

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
    now: Date.now,
    scheduleBrowserCheck: scheduleConnectionCheck,
    readConnectionAccess: (tabs, now) =>
      readConnectionAccess(env.DB, tabs, now),
    randomId: randomToken,
    readLoginAvailability: (targets) => {
      const id = workspaceId()
      return id === null
        ? Promise.resolve(new Set<string>())
        : readLoginAvailability(env.DB, id, targets)
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
    runnerEventStored: async () => undefined,
    runnerReady: async () => undefined,
    matchesObject: () => true,
    ...overrides,
    resolveLogin: loginResolver(env, workspaceId, overrides.resolveLogin),
  }
}
