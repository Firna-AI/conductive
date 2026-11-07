import { object, string } from '../parse'
import { codexBinary } from './binaries'
import { codexNotification } from './codex-events'
import { prepareProviderHome, providerEnvironment } from './environment'
import { failureCause } from './failure'
import { startProcess, type StartProcess } from './process'
import { JsonRpc } from './rpc'
import type { ProviderFactory, ProviderInput } from './types'

function input(command: ProviderInput) {
  return [
    { type: 'text', text: command.message.text, text_elements: [] },
    ...command.attachments.map((attachment) => {
      const metadata = command.message.attachments.find(
        (item) => item.id === attachment.attachmentId,
      )
      return metadata?.kind === 'image'
        ? { type: 'localImage', path: attachment.path }
        : {
            type: 'text',
            text: `Attached file: ${attachment.path}`,
            text_elements: [],
          }
    }),
  ]
}

export function createCodexFactory(
  start: StartProcess = startProcess,
): ProviderFactory {
  return async (options) => {
    options.signal?.throwIfAborted()
    await prepareProviderHome(options.home)
    options.signal?.throwIfAborted()
    const configs = {
      model_provider: 'conducting',
      'model_providers.conducting.name': 'Conducting',
      'model_providers.conducting.base_url': 'https://api.openai.com/v1',
      'model_providers.conducting.env_key': 'OPENAI_API_KEY',
      'model_providers.conducting.wire_api': 'responses',
      'model_providers.conducting.requires_openai_auth': false,
      cli_auth_credentials_store: 'ephemeral',
      'mcp_servers.computer.url': options.computerMcpUrl,
    }
    const args = [
      codexBinary(),
      'app-server',
      ...Object.entries(configs).flatMap(([key, value]) => [
        '-c',
        `${key}=${JSON.stringify(value)}`,
      ]),
    ]
    let activeTurn: string | null = null
    let userIds: string[] = []
    let choice = options.choice
    let activeChoice = choice
    let closed = false
    const rpc = new JsonRpc(
      start({
        command: process.execPath,
        args,
        cwd: options.cwd,
        env: providerEnvironment(options.home, options.login),
        signal: options.signal,
      }),
      (method, params) => {
        if (method === 'turn/started')
          activeTurn = string(object(object(params).turn).id)
        codexNotification(method, params, userIds, options.event)
        if (method === 'turn/completed') activeTurn = null
      },
      () => {
        if (!closed)
          options.event({
            type: 'failed',
            code: 'agent_exited',
            message: 'The agent process ended.',
          })
      },
    )
    let closing: Promise<void> | null = null
    const close = () => {
      closed = true
      activeTurn = null
      userIds = []
      options.signal?.removeEventListener('abort', abort)
      closing ??= rpc.close()
      return closing
    }
    const abort = () => {
      void close().catch((error: unknown) => options.event(failureCause(error)))
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    try {
      await rpc.request('initialize', {
        clientInfo: {
          name: 'conducting',
          title: 'Conducting',
          version: '0.1.0',
        },
        capabilities: { experimentalApi: true },
      })
      rpc.notify('initialized')
      const response = object(
        await rpc.request(
          options.conversationId ? 'thread/resume' : 'thread/start',
          {
            ...(options.conversationId
              ? { threadId: options.conversationId }
              : {}),
            model: choice.model,
            modelProvider: 'conducting',
            cwd: options.cwd,
            approvalPolicy: 'never',
            sandbox: 'danger-full-access',
          },
        ),
      )
      const threadId = string(object(response.thread).id)
      options.event({ type: 'conversation', id: threadId })
      return {
        send: async (command) => {
          if (activeTurn) {
            const before = [...userIds]
            userIds.push(command.message.id)
            try {
              await rpc.request('turn/steer', {
                threadId,
                expectedTurnId: activeTurn,
                clientUserMessageId: command.message.id,
                input: input(command),
              })
            } catch (error) {
              userIds = before
              throw error
            }
          } else {
            userIds = [command.message.id]
            activeChoice = choice
            const result = object(
              await rpc.request('turn/start', {
                threadId,
                input: input(command),
                clientUserMessageId: command.message.id,
                model: choice.model,
                effort: choice.effort === 'none' ? 'none' : choice.effort,
              }),
            )
            activeTurn = string(object(result.turn).id)
          }
        },
        model: async (next) => {
          choice = next
          return activeTurn &&
            (activeChoice.model !== choice.model ||
              activeChoice.effort !== choice.effort)
            ? 'deferred'
            : 'applied'
        },
        interrupt: async () => {
          if (activeTurn)
            await rpc.request('turn/interrupt', {
              threadId,
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
