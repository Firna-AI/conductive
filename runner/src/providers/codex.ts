import { WORKSPACE_TOOLS_MCP } from '../../../src/shared/agent-tools'
import { TOOL_ENV } from '../../../tools/context'
import { object, string } from '../parse'
import {
  attachmentDescription,
  attachmentReadInstruction,
} from './attachment-description'
import { codexBinary } from './binaries'
import { codexNotification } from './codex-events'
import { readComputerServer } from './computer-mcp'
import { prepareProviderHome, providerEnvironment } from './environment'
import { failureCause } from './failure'
import { ProviderLifetime } from './lifetime'
import { providerMessage } from './message'
import { startProcess, type StartProcess } from './process'
import { JsonRpc } from './rpc'
import type { ProviderFactory, ProviderInput } from './types'

function input(command: ProviderInput) {
  return [
    { type: 'text', text: providerMessage(command.message), text_elements: [] },
    ...(command.attachments.length
      ? [
          {
            type: 'text',
            text:
              attachmentReadInstruction +
              (command.message.attachments.some((file) => file.kind === 'image')
                ? ' Each image is also in this message.'
                : ''),
            text_elements: [],
          },
        ]
      : []),
    ...command.attachments.flatMap((attachment) => {
      const metadata = command.message.attachments.find(
        (item) => item.id === attachment.attachmentId,
      )
      const description = {
        type: 'text',
        text: attachmentDescription(command, attachment),
        text_elements: [],
      }
      return metadata?.kind === 'image'
        ? [description, { type: 'localImage', path: attachment.path }]
        : [description]
    }),
  ]
}

export function createCodexFactory(
  start: StartProcess = startProcess,
): ProviderFactory {
  return async (options) => {
    options.signal?.throwIfAborted()
    const lifetime = options.lifetime ?? new ProviderLifetime()
    await prepareProviderHome(options.home)
    options.signal?.throwIfAborted()
    const computer = await readComputerServer(options.warn)
    options.signal?.throwIfAborted()
    const configs = {
      model_provider: 'conductive',
      'model_providers.conductive.name': 'Conductive',
      'model_providers.conductive.base_url': 'https://api.openai.com/v1',
      'model_providers.conductive.wire_api': 'responses',
      'model_providers.conductive.requires_openai_auth': true,
      cli_auth_credentials_store: 'ephemeral',
      'mcp_servers.conductive.command': WORKSPACE_TOOLS_MCP.command,
      'mcp_servers.conductive.args': WORKSPACE_TOOLS_MCP.args,
      'mcp_servers.conductive.env_vars': Object.values(TOOL_ENV),
      ...(computer
        ? {
            'mcp_servers.computer.command': computer.command,
            ...(computer.args
              ? { 'mcp_servers.computer.args': computer.args }
              : {}),
          }
        : {}),
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
        env: providerEnvironment(options.home, options.tools),
        signal: options.signal,
        lifetime,
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
      closing ??= rpc.close().finally(() => lifetime.close())
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
          name: 'conductive',
          title: 'Conductive',
          version: '0.1.0',
        },
        capabilities: { experimentalApi: true },
      })
      rpc.notify('initialized')
      await rpc.request('account/login/start', {
        type: 'apiKey',
        apiKey: options.login.secret,
      })
      const response = object(
        await rpc.request(
          options.conversationId ? 'thread/resume' : 'thread/start',
          {
            ...(options.conversationId
              ? { threadId: options.conversationId }
              : {}),
            model: choice.model,
            modelProvider: 'conductive',
            cwd: options.cwd,
            developerInstructions: options.instructions,
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
