import type { AppEnv } from '../env'
import type { RunnerProtocolVersion } from '../../src/shared/runner'
import { commitAuthor } from '../../src/shared/commit-author'
import { readUser } from '../data/users'
import { runnerTokenAllowed } from '../data/workspace-token-access'
import { randomToken } from '../security/crypto'
import { readConnectionAccess } from '../security/connection-access'
import { loginResolver } from './login-access'
import {
  readLoginMetadata,
  type SessionLoginMetadata,
} from './login-availability'
import { readAutomaticTitleWorkspace } from './queries'
import { titleModelBinding } from './title-model'
import { readRunnerProtocolVersion } from './runner-version-data'
import type { ChatDependencies } from './types'
import { resolveMessageAttachments } from './attachment-claims'
import { prepareMessageAttachments } from './attachment-copy'
import { attachmentWorkspace } from './attachment-claim-data'
import { resolveAttachmentPaths } from './attachment-paths'
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
  protocolVersion: () => RunnerProtocolVersion | null = () => null,
): ChatDependencies {
  return {
    readCommitAuthor: async (userId) => {
      const user = await readUser(env.DB, userId)
      return user ? commitAuthor(user) : null
    },
    readAutomaticTitleWorkspace: (id) =>
      readAutomaticTitleWorkspace(env.DB, id),
    runTitleModel: titleModelBinding(env),
    filterRunnerOutput: (transaction, workspace, input) =>
      filterRunnerOutput(env, transaction, workspace, input),
    now: Date.now,
    readRunnerAccess: (id, tokenHash) =>
      runnerTokenAllowed(env.DB, id, tokenHash),
    readRunnerProtocolVersion: (id) => readRunnerProtocolVersion(env.DB, id),
    readConnectionAccess: (tabs, now) =>
      readConnectionAccess(env.DB, tabs, now),
    randomId: randomToken,
    randomConnectionId: randomToken,
    currentRunnerProtocolVersion: protocolVersion,
    refusedEndpointDomains: () =>
      env.PREVIEW_DOMAIN ? [env.PREVIEW_DOMAIN] : [],
    readLoginMetadata: (targets, version) => {
      const id = workspaceId()
      return id === null
        ? Promise.resolve(new Map<string, SessionLoginMetadata>())
        : readLoginMetadata(env, id, targets, version)
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
    prepareAttachments: (id, userId, messageId, attachments, sandboxId) =>
      prepareMessageAttachments(
        env,
        id,
        userId,
        messageId,
        attachments,
        sandboxId,
      ),
    attachmentSandboxId: async (id, userId) =>
      (await attachmentWorkspace(env.DB, id, userId))?.sandboxId ?? null,
    resolveAttachmentPaths: (id, userId, attachments) =>
      resolveAttachmentPaths(env, id, userId, attachments),
    receiveFileResult: async () => undefined,
    runnerAttached: () => undefined,
    runnerDetached: () => undefined,
    runnerEventStored: async () => undefined,
    runnerReady: async () => undefined,
    runnerHello: async () => undefined,
    runnerDisconnected: async () => undefined,
    turnDispatching: async () => true,
    turnDispatchFailed: async () => undefined,
    turnEnded: async () => undefined,
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
