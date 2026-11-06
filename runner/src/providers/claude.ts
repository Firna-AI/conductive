import { randomUUID } from 'node:crypto'

import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'

import { claudeBinary } from './binaries'
import { ClaudeEvents } from './claude-events'
import { prepareProviderHome, providerEnvironment } from './environment'
import { InputQueue } from './queue'
import { failureCause } from './failure'
import type { ProviderFactory } from './types'

export interface ClaudeQuery extends AsyncIterable<unknown> {
  interrupt(): Promise<unknown>
  setModel(model?: string): Promise<void>
  setMaxThinkingTokens(tokens: number | null): Promise<void>
  applyFlagSettings(settings: {
    effortLevel: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | null
  }): Promise<void>
  close(): void
}

export type ClaudeQueryFactory = (
  input: Parameters<typeof query>[0],
) => ClaudeQuery

export function createClaudeFactory(
  start: ClaudeQueryFactory = query,
  binary = claudeBinary,
): ProviderFactory {
  return async (options) => {
    await prepareProviderHome(options.home)
    const input = new InputQueue<SDKUserMessage>()
    const ids = new Map<string, string>()
    const mapper = new ClaudeEvents(ids, options.event)
    let closed = false
    const stream = start({
      prompt: input,
      options: {
        cwd: options.cwd,
        env: providerEnvironment(options.home, options.login),
        pathToClaudeCodeExecutable: binary(),
        model: options.choice.model,
        ...(options.choice.effort === 'none'
          ? { thinking: { type: 'disabled' } }
          : { effort: options.choice.effort }),
        ...(options.conversationId ? { resume: options.conversationId } : {}),
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        includePartialMessages: true,
        persistSession: true,
        settingSources: ['project'],
        mcpServers: { computer: { type: 'http', url: options.computerMcpUrl } },
      },
    })
    void (async () => {
      try {
        for await (const message of stream) {
          if (!closed) mapper.accept(message)
        }
        if (!closed)
          options.event({
            type: 'failed',
            code: 'agent_exited',
            message: 'The agent process ended.',
          })
      } catch (error) {
        if (!closed) options.event(failureCause(error))
      }
    })()
    const close = async () => {
      closed = true
      input.discard()
      stream.close()
    }
    return {
      send: async (command) => {
        const uuid = randomUUID()
        ids.set(uuid, command.message.id)
        const attached = command.attachments
          .map((item) => `\nAttached file: ${item.path}`)
          .join('')
        input.push({
          type: 'user',
          uuid,
          session_id: options.conversationId ?? '',
          parent_tool_use_id: null,
          message: { role: 'user', content: command.message.text + attached },
          priority: 'next',
        })
      },
      model: async (choice) => {
        await stream.setModel(choice.model)
        await stream.applyFlagSettings({
          effortLevel: choice.effort === 'none' ? null : choice.effort,
        })
        await stream.setMaxThinkingTokens(choice.effort === 'none' ? 0 : null)
        return 'applied'
      },
      interrupt: async () => {
        mapper.stopped = true
        await stream.interrupt()
      },
      stop: close,
      close,
    }
  }
}
