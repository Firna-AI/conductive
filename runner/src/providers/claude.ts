import { randomUUID } from 'node:crypto'

import { query } from '@anthropic-ai/claude-agent-sdk'

import { WORKSPACE_TOOLS_MCP } from '../../../src/shared/agent-tools'
import { claudeBinary } from './binaries'
import { ClaudeEvents } from './claude-events'
import { ClaudeInputWindow } from './claude-input-window'
import { spawnClaudeProcess } from './claude-process'
import { writeClaudeProfile } from './claude-profile'
import { readComputerServer } from './computer-mcp'
import { prepareProviderHome, providerEnvironment } from './environment'
import { failureCause } from './failure'
import { ProviderLifetime } from './lifetime'
import { providerMessage } from './message'
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
  profile = writeClaudeProfile,
): ProviderFactory {
  return async (options) => {
    options.signal?.throwIfAborted()
    const lifetime = options.lifetime ?? new ProviderLifetime()
    await prepareProviderHome(options.home)
    options.signal?.throwIfAborted()
    const computer = await readComputerServer(options.warn)
    options.signal?.throwIfAborted()
    const preparation =
      options.credential.type === 'gateway'
        ? profile(
            options.home,
            options.sessionId,
            options.endpoint,
            options.credential.token,
          )
        : Promise.resolve(null)
    lifetime.registerCleanup(() =>
      preparation.then(
        (value) => value?.remove(),
        () => {},
      ),
    )
    const credentials = await preparation
    const env = providerEnvironment(options.home, options.tools)
    if (credentials) {
      env.ANTHROPIC_CONFIG_DIR = credentials.directory
      env.ANTHROPIC_PROFILE = credentials.name
    } else env.ANTHROPIC_BASE_URL = options.endpoint
    const input = new ClaudeInputWindow()
    let resultReceived = false
    const mapper = new ClaudeEvents(
      input.ids,
      (event) => {
        if (event.type === 'result') resultReceived = true
        options.event(event)
      },
      (uuid) => input.hasOutstanding(uuid),
    )
    let closed = false
    let stream: ClaudeQuery
    try {
      options.signal?.throwIfAborted()
      stream = start({
        prompt: input,
        options: {
          cwd: options.cwd,
          systemPrompt: options.instructions,
          env,
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
          mcpServers: {
            conductive: {
              command: WORKSPACE_TOOLS_MCP.command,
              args: [...WORKSPACE_TOOLS_MCP.args],
            },
            ...(computer ? { computer } : {}),
          },
          spawnClaudeCodeProcess: (request) => {
            options.signal?.throwIfAborted()
            return spawnClaudeProcess(
              request,
              options.credential.type === 'native'
                ? options.credential.login
                : null,
              lifetime,
            )
          },
        },
      })
    } catch (error) {
      input.discard()
      await lifetime.close()
      throw error
    }
    void (async () => {
      try {
        for await (const message of stream) {
          if (closed) continue
          resultReceived = false
          mapper.accept(message)
          if (resultReceived) input.complete(message)
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
    let closing: Promise<void> | null = null
    const close = () => {
      options.signal?.removeEventListener('abort', abort)
      if (closed) return closing ?? lifetime.close()
      closed = true
      input.discard()
      closing = (async () => {
        const exited = lifetime.close()
        try {
          stream.close()
        } finally {
          await exited
        }
      })()
      return closing
    }
    const abort = () => {
      void close().catch((error: unknown) => options.event(failureCause(error)))
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    return {
      send: async (command) => {
        const uuid = randomUUID()
        const attached = command.attachments
          .map((item) => `\nAttached file: ${item.path}`)
          .join('')
        input.push(command.message.id, {
          type: 'user',
          uuid,
          session_id: options.conversationId ?? '',
          parent_tool_use_id: null,
          message: {
            role: 'user',
            content: providerMessage(command.message) + attached,
          },
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
