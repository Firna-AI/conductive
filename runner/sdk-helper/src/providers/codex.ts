import {
  WORKSPACE_TOOLS_MCP,
  TOOL_ENV,
} from '../../../../src/shared/agent-tools'

import { object, string } from '../parse'
import { codexBinary } from './binaries'
import { codexInput } from './codex-input'
import { writeCodexCredentials } from './codex-credentials'
import { codexNotification } from './codex-events'
import { codexStdioServer } from './codex-mcp'
import { checkCodexGateway, codexSettings } from './codex-settings'
import { prepareCodexSkills } from './codex-skills'
import { openCodexThread } from './codex-thread'
import { readComputerServer } from './computer-mcp'
import { prepareProviderHome } from './environment'
import { failureCause } from './failure'
import { ProviderLifetime } from './lifetime'
import { InputReceipts } from './input-receipts'
import { startProcess, type StartProcess } from './process'
import { JsonRpc } from './rpc'
import { noSkills, withOrgSkillPaths, type SkillSource } from './skill-input'
import type { ProviderFactory } from './types'

/**
 * Codex runs each subagent in its own thread, and the App Server sends the
 * notifications of every thread. Only the conversation thread belongs to
 * this session. So a subagent's turn never replaces the active turn, ends
 * the session's turn, or adds an answer to the chat.
 */
function otherThread(params: unknown, threadId: string | null): boolean {
  return (
    threadId !== null &&
    typeof params === 'object' &&
    params !== null &&
    'threadId' in params &&
    typeof params.threadId === 'string' &&
    params.threadId !== threadId
  )
}

/** `skills` gives the current Codex list at each send, also during a turn. */
export function createCodexFactory(
  start: StartProcess = startProcess,
  credentials = writeCodexCredentials,
  skills: SkillSource = noSkills,
): ProviderFactory {
  return async (options) => {
    options.signal?.throwIfAborted()
    const lifetime = options.lifetime ?? new ProviderLifetime()
    await prepareProviderHome(options.home)
    options.signal?.throwIfAborted()
    const computer = await readComputerServer(options.warn)
    options.signal?.throwIfAborted()
    const preparation =
      options.credential.type === 'gateway' &&
      options.credential.agent === 'codex' &&
      options.credential.kind === 'token'
        ? credentials(
            options.home,
            options.sessionId,
            options.credential.token,
            options.credential.account,
          )
        : Promise.resolve(null)
    lifetime.registerCleanup(() =>
      preparation.then(
        (value) => value?.remove(),
        () => {},
      ),
    )
    const settings = codexSettings(options)
    try {
      const credential = await preparation
      if (credential) settings.env.CODEX_HOME = credential.directory
      options.signal?.throwIfAborted()
    } catch (error) {
      await lifetime.close()
      throw error
    }
    const orgSkills = await prepareCodexSkills(options, lifetime)
    const inputs = withOrgSkillPaths(skills, options.home, orgSkills.inputs)
    let threadId: string | null = null
    let activeTurn: string | null = null
    let userIds: string[] = []
    const receipts = new InputReceipts(options.event, 'input')
    let choice = options.choice
    let activeChoice = choice
    let closed = false
    let rpc: JsonRpc
    try {
      options.signal?.throwIfAborted()
      const args = [
        codexBinary(),
        'app-server',
        ...orgSkills.args,
        ...Object.entries(settings.config).flatMap(([key, value]) => [
          '-c',
          `${key}=${JSON.stringify(value)}`,
        ]),
        ...codexStdioServer('conductive', WORKSPACE_TOOLS_MCP),
        '-c',
        `mcp_servers.conductive.env_vars=${JSON.stringify(Object.values(TOOL_ENV))}`,
        ...(computer ? codexStdioServer('computer', computer) : []),
      ]
      rpc = new JsonRpc(
        start({
          command: process.execPath,
          args,
          cwd: options.cwd,
          env: settings.env,
          signal: options.signal,
          lifetime,
        }),
        (method, params) => {
          if (otherThread(params, threadId)) return
          if (method === 'turn/started')
            activeTurn = string(object(object(params).turn).id)
          if (method === 'item/completed') {
            const item = object(object(params).item)
            if (
              item.type === 'userMessage' &&
              typeof item.clientId === 'string'
            )
              receipts.read([item.clientId])
          }
          codexNotification(method, params, userIds, receipts.emit)
          if (method === 'turn/completed') activeTurn = null
        },
        () => {
          void lifetime.close().then(
            () => {
              if (!closed)
                receipts.emit({
                  type: 'failed',
                  code: 'agent_exited',
                  message: 'The agent process ended.',
                })
            },
            (error: unknown) => receipts.emit(failureCause(error)),
          )
        },
      )
    } catch (error) {
      await lifetime.close()
      throw error
    }
    let closing: Promise<void> | null = null
    const close = () => {
      closed = true
      activeTurn = null
      userIds = []
      options.signal?.removeEventListener('abort', abort)
      closing ??= rpc.close().finally(() => lifetime.close())
      return closing
    }
    const abort = () => {
      void close().catch((error: unknown) => receipts.emit(failureCause(error)))
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    try {
      await rpc.request('initialize', {
        clientInfo: {
          name: 'conductive',
          title: 'Conductive',
          version: '0.1.0',
        },
        capabilities: { experimentalApi: true },
      })
      rpc.notify('initialized')
      if (settings.tokenMode) await checkCodexGateway(rpc, options.endpoint)
      else
        await rpc.request('account/login/start', {
          type: 'apiKey',
          apiKey:
            options.credential.type === 'gateway'
              ? options.credential.token
              : options.credential.login.secret,
        })
      if (orgSkills.extraRoots.length)
        await rpc
          .request('skills/extraRoots/set', {
            extraRoots: orgSkills.extraRoots,
          })
          .catch(() => {
            options.warn(
              'The org skills could not be loaded. The turn will continue.',
            )
          })
      const thread = await openCodexThread(rpc, options, settings.modelProvider)
      threadId = thread
      options.event({ type: 'conversation', id: thread })
      return {
        send: async (command) => {
          if (command.type === 'notice' && !activeTurn) return
          if (!activeTurn) receipts.reset()
          const inputId = receipts.add(command)
          if (activeTurn) {
            const before = [...userIds]
            if (command.type !== 'notice') userIds.push(inputId)
            try {
              await rpc.request('turn/steer', {
                threadId: thread,
                expectedTurnId: activeTurn,
                clientUserMessageId: inputId,
                input: codexInput(command, inputs, options),
              })
            } catch (error) {
              userIds = before
              receipts.discard(inputId)
              throw error
            }
          } else {
            userIds = [inputId]
            activeChoice = choice
            if (choice.fast)
              options.event({ type: 'speed', speed: { state: 'fast' } })
            const result = object(
              await rpc.request('turn/start', {
                threadId: thread,
                input: codexInput(command, inputs, options),
                clientUserMessageId: inputId,
                model: choice.model,
                effort: choice.effort === 'none' ? 'none' : choice.effort,
                serviceTierForTurn: choice.fast ? 'priority' : 'default',
              }),
            )
            activeTurn = string(object(result.turn).id)
          }
        },
        model: async (next) => {
          choice = next
          return activeTurn &&
            (activeChoice.model !== choice.model ||
              activeChoice.effort !== choice.effort ||
              activeChoice.fast !== choice.fast)
            ? 'deferred'
            : 'applied'
        },
        interrupt: async () => {
          if (activeTurn)
            await rpc.request('turn/interrupt', {
              threadId: thread,
              turnId: activeTurn,
            })
        },
        stop: close,
        close,
      }
    } catch (error) {
      await close()
      throw error
    }
  }
}
