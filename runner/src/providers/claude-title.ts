import { query } from '@anthropic-ai/claude-agent-sdk'

import { claudeBinary } from './binaries'
import type { ClaudeQuery, ClaudeQueryFactory } from './claude'
import { spawnClaudeProcess } from './claude-process'
import { prepareProviderHome, providerEnvironment } from './environment'
import { object, string } from '../parse'
import { TITLE_SYSTEM_PROMPT, titlePrompt } from '../title-text'
import type { TitleRequest } from './title'

export function createClaudeTitle(
  start: ClaudeQueryFactory = query,
  binary = claudeBinary,
): TitleRequest {
  return async (options) => {
    const { signal, lifetime } = options
    let stream: ClaudeQuery | undefined
    let closing: Promise<void> | undefined
    const close = () => {
      closing ??= (async () => {
        const exited = lifetime.close()
        try {
          stream?.close()
        } finally {
          await exited
        }
      })()
      return closing
    }
    const abort = () => {
      void close().catch(() => {})
    }
    signal.addEventListener('abort', abort, { once: true })
    try {
      signal.throwIfAborted()
      await prepareProviderHome(options.home)
      signal.throwIfAborted()
      stream = start({
        prompt: titlePrompt(options.text),
        options: {
          cwd: options.cwd,
          env: providerEnvironment(options.home, options.tools),
          pathToClaudeCodeExecutable: binary(),
          model: options.choice.model,
          thinking: { type: 'disabled' },
          tools: [],
          mcpServers: {},
          settingSources: [],
          persistSession: false,
          maxTurns: 1,
          systemPrompt: TITLE_SYSTEM_PROMPT,
          spawnClaudeCodeProcess: (request) => {
            signal.throwIfAborted()
            return spawnClaudeProcess(request, options.login, lifetime)
          },
        },
      })
      for await (const value of stream) {
        signal.throwIfAborted()
        const message = object(value)
        if (message.type !== 'result') continue
        if (message.is_error === true)
          throw new Error('The title request failed.')
        return string(message.result)
      }
      throw new Error('The title request ended without a result.')
    } finally {
      signal.removeEventListener('abort', abort)
      await close()
    }
  }
}
