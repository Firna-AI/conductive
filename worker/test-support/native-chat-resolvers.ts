import type { ChatDependencies } from '../chat/types'
import type { AppEnv } from '../env'
import { runnerTokenAllowed } from '../data/workspace-token-access'
import { readConnectionAccess } from '../security/connection-access'
import { readLoginMetadata } from '../chat/login-availability'
import { readAgentLogin } from '../chat/queries'
import { resolveMessageAttachments } from '../chat/attachment-claims'
import { prepareMessageAttachments } from '../chat/attachment-copy'
import { attachmentWorkspace } from '../chat/attachment-claim-data'
import { filterRunnerOutput } from '../chat/runner-output'

export type NativeChatCallbacks = Partial<
  Pick<
    ChatDependencies,
    | 'resolveAttachments'
    | 'prepareAttachments'
    | 'attachmentSandboxId'
    | 'readRunnerAccess'
    | 'readConnectionAccess'
    | 'readLoginMetadata'
    | 'resolveLogin'
    | 'filterRunnerOutput'
    | 'browserOpened'
    | 'browserClosed'
    | 'runTitleModel'
    | 'readAutomaticTitleWorkspace'
  >
>

export function nativeChatResolvers(
  env: AppEnv,
  callbacks: NativeChatCallbacks,
  now: () => number,
  workspaceId: () => string | undefined,
  connectionId: () => string,
) {
  return {
    ...(callbacks.runTitleModel
      ? {
          runTitleModel: (
            ...args: Parameters<NonNullable<ChatDependencies['runTitleModel']>>
          ) => callbacks.runTitleModel?.(...args) ?? Promise.resolve(undefined),
        }
      : {}),
    randomConnectionId: connectionId,
    resolveAttachments: (
      ...args: Parameters<ChatDependencies['resolveAttachments']>
    ) =>
      callbacks.resolveAttachments?.(...args) ??
      resolveMessageAttachments(env, ...args, now()),
    prepareAttachments: (
      ...args: Parameters<ChatDependencies['prepareAttachments']>
    ) =>
      callbacks.prepareAttachments?.(...args) ??
      prepareMessageAttachments(env, ...args),
    attachmentSandboxId: (
      ...args: Parameters<ChatDependencies['attachmentSandboxId']>
    ) =>
      callbacks.attachmentSandboxId?.(...args) ??
      attachmentWorkspace(env.DB, ...args).then(
        (workspace) => workspace?.sandboxId ?? null,
      ),
    readRunnerAccess: (
      ...args: Parameters<ChatDependencies['readRunnerAccess']>
    ) =>
      callbacks.readRunnerAccess?.(...args) ??
      runnerTokenAllowed(env.DB, ...args),
    readConnectionAccess: (
      ...args: Parameters<ChatDependencies['readConnectionAccess']>
    ) =>
      callbacks.readConnectionAccess?.(...args) ??
      readConnectionAccess(env.DB, ...args),
    readLoginMetadata: (
      ...args: Parameters<ChatDependencies['readLoginMetadata']>
    ) =>
      callbacks.readLoginMetadata?.(...args) ??
      readLoginMetadata(env.DB, workspaceId() ?? '', ...args),
    resolveLogin: (...args: Parameters<ChatDependencies['resolveLogin']>) =>
      callbacks.resolveLogin?.(...args) ??
      (args[0] === null
        ? Promise.resolve(null)
        : readAgentLogin(env, args[0], args[1])),
    filterRunnerOutput: (
      ...args: Parameters<ChatDependencies['filterRunnerOutput']>
    ) =>
      callbacks.filterRunnerOutput?.(...args) ??
      filterRunnerOutput(env, ...args),
    browserOpened: (...args: Parameters<ChatDependencies['browserOpened']>) =>
      callbacks.browserOpened?.(...args) ?? Promise.resolve(),
    browserClosed: (...args: Parameters<ChatDependencies['browserClosed']>) =>
      callbacks.browserClosed?.(...args) ?? Promise.resolve(),
  }
}
