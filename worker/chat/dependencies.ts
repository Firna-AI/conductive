import type { AppEnv } from '../env'
import { runnerTokenAllowed } from '../data/workspace-token-access'
import { randomToken } from '../security/crypto'
import {
  readConnectionAccess,
  scheduleConnectionCheck,
} from '../security/connection-access'
import { loginResolver } from './login-access'
import { readLoginAvailability } from './login-availability'
import { firstStartIncomplete } from './queries'
import type { ChatDependencies } from './types'
import { resolveMessageAttachments } from './attachment-claims'
import { prepareMessageAttachments } from './attachment-copy'
import { attachmentWorkspace } from './attachment-claim-data'

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
    scheduleRunnerCheck: scheduleConnectionCheck,
    readRunnerAccess: (id, tokenHash) =>
      runnerTokenAllowed(env.DB, id, tokenHash),
    readConnectionAccess: (tabs, now) =>
      readConnectionAccess(env.DB, tabs, now),
    firstStartIncomplete: (id) => firstStartIncomplete(env.DB, id),
    randomId: randomToken,
    randomConnectionId: randomToken,
    readLoginAvailability: (targets) => {
      const id = workspaceId()
      return id === null
        ? Promise.resolve(new Set<string>())
        : readLoginAvailability(env.DB, id, targets)
    },
    resolveAttachments: (userId, id, ids, messageId, usedIds) =>
      resolveMessageAttachments(
        env,
        userId,
        id,
        ids,
        messageId,
        usedIds,
        (overrides.now ?? Date.now)(),
      ),
    prepareAttachments: (id, userId, messageId, attachments, copiedSandboxId) =>
      prepareMessageAttachments(
        env,
        id,
        userId,
        messageId,
        attachments,
        copiedSandboxId,
      ),
    attachmentSandboxId: async (id, userId) =>
      (await attachmentWorkspace(env.DB, id, userId))?.sandboxId ?? null,
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
