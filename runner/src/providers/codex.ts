import { WORKSPACE_TOOLS_MCP } from '../../../src/shared/agent-tools'
import { TOOL_ENV } from '../../../tools/context'
import { object, string } from '../parse'
import { codexNotification } from './codex-events'
import { startCodexServer } from './codex-server'
import { readComputerServer } from './computer-mcp'
import { startProcess, type StartProcess } from './process'
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
    const computer = await readComputerServer(options.warn)
    options.signal?.throwIfAborted()
    const configs = {
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
    let activeTurn: string | null = null
    let userIds: string[] = []
    let choice = options.choice
    let activeChoice = choice
    let closed = false
    const server = await startCodexServer(
      options,
      configs,
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
      start,
    )
    const { rpc } = server
    const close = () => {
      closed = true
      activeTurn = null
      userIds = []
      return server.close()
    }
    try {
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
