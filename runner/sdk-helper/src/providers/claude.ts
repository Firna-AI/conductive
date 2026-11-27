import { query, type Query } from '@anthropic-ai/claude-agent-sdk'

import { WORKSPACE_TOOLS_MCP } from '../../../../src/shared/agent-tools'
import { claudeBinary } from './binaries'
import { ClaudeEvents } from './claude-events'
import { ClaudeBackground } from './claude-background'
import { ClaudeBackgroundNote } from './claude-background-note'
import { ClaudeOrphans } from './claude-orphans'
import { claudeEffortSettings, claudeStart } from './claude-effort'
import { claudeInput } from './claude-input'
import { ClaudeInputWindow, userInput } from './claude-input-window'
import { spawnClaudeProcess } from './claude-process'
import { writeClaudeProfile } from './claude-profile'
import { claudeSkillSettings, prepareClaudeSkills } from './claude-skills'
import { moveClaudeTranscript } from './claude-transcript'
import { readComputerServer } from './computer-mcp'
import {
  claudeConfigDirectory,
  prepareProviderHome,
  providerEnvironment,
} from './environment'
import { failureCause } from './failure'
import { ProviderLifetime } from './lifetime'
import { InputReceipts } from './input-receipts'
import type { ProviderFactory } from './types'

export interface ClaudeQuery extends AsyncIterable<unknown> {
  interrupt(): Promise<unknown>
  setModel(model?: string): Promise<void>
  setMaxThinkingTokens(tokens: number | null): Promise<void>
  applyFlagSettings(
    settings: Parameters<Query['applyFlagSettings']>[0],
  ): Promise<void>
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
    if (options.conversationId)
      await moveClaudeTranscript(
        claudeConfigDirectory(options.home),
        options.cwd,
        options.conversationId,
        options.warn,
      )
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
    const orgView = await prepareClaudeSkills(options, lifetime)
    const skillsDiscovery = orgView.directory
    const skillSettings = claudeSkillSettings(options.orgSkills)
    const env = providerEnvironment(
      options.home,
      options.tools,
      options.commitAuthor,
    )
    if (
      options.credential.type === 'gateway' &&
      options.credential.agent === 'claude' &&
      (options.credential.kind === 'token' ||
        options.credential.promptCacheTtl === '1h')
    )
      env.CLAUDE_CODE_PROMPT_CACHE_TTL = '1h'
    if (credentials) {
      env.ANTHROPIC_CONFIG_DIR = credentials.directory
      env.ANTHROPIC_PROFILE = credentials.name
    } else env.ANTHROPIC_BASE_URL = options.endpoint
    const input = new ClaudeInputWindow()
    const receipts = new InputReceipts(options.event)
    const background = new ClaudeBackground(options.event)
    const named = options.backgroundNoteIds ?? new Set<string>()
    const note = new ClaudeBackgroundNote(
      (id) => background.isAmbient(id),
      named,
    )
    let closed = false
    const orphans = new ClaudeOrphans({
      named,
      saveNamed: () => options.backgroundNotes?.([...named]),
      deliver: (content) => {
        if (closed) return null
        const message = userInput(options.conversationId ?? '', content)
        input.note(message)
        return message.uuid
      },
      settled: (uuid) => input.settle(uuid),
      changed: () => background.publish(),
    })
    background.watch(orphans)
    env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS = '1'
    const mapper = new ClaudeEvents(
      input.ids,
      receipts.emit,
      (uuid) => input.hasOutstanding(uuid),
      background,
      options.choice.fast,
      (userMessageIds) => {
        const message = userInput(
          options.conversationId ?? '',
          'The connection to the model dropped before your last response finished. Continue from where you stopped. Do not repeat work that is already done. Start your reply with one short sentence that says that the connection to the model dropped and that you continue.',
        )
        input.continue(userMessageIds, message)
        options.warn(
          'The Claude answer stream dropped. Continuing the agent once.',
        )
        return message.uuid
      },
      receipts.read,
    )
    let stream: ClaudeQuery
    try {
      options.signal?.throwIfAborted()
      stream = start({
        prompt: input,
        options: {
          cwd: options.cwd,
          systemPrompt: options.instructions,
          env,
          hooks: {
            Stop: [
              {
                hooks: [
                  async (hook) => {
                    if (
                      !closed &&
                      hook.hook_event_name === 'Stop' &&
                      !hook.agent_id
                    ) {
                      background.stop(hook.session_crons ?? [])
                      const context = note.context(hook)
                      if (context !== undefined) {
                        options.backgroundNotes?.([...named])
                        return {
                          hookSpecificOutput: {
                            hookEventName: 'Stop',
                            additionalContext: context,
                          },
                        }
                      }
                    }
                    return {}
                  },
                ],
              },
            ],
          },
          pathToClaudeCodeExecutable: binary(),
          model: options.choice.model,
          ...claudeStart(options.choice, skillSettings),
          ...(options.conversationId ? { resume: options.conversationId } : {}),
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          includePartialMessages: true,
          persistSession: true,
          settingSources: ['project'],
          ...(skillsDiscovery
            ? { additionalDirectories: [skillsDiscovery] }
            : {}),
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
          const completed = mapper.accept(message)
          if (completed) {
            input.complete(completed)
            background.result(!input.pending)
          }
        }
        if (!closed)
          receipts.emit({
            type: 'failed',
            code: 'agent_exited',
            message: 'The agent process ended.',
          })
      } catch (error) {
        if (!closed) receipts.emit(failureCause(error))
      }
    })()
    let closing: Promise<void> | null = null
    const close = () => {
      options.signal?.removeEventListener('abort', abort)
      if (closed) return closing ?? lifetime.close()
      closed = true
      orphans.close()
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
      void close().catch((error: unknown) => receipts.emit(failureCause(error)))
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    return {
      send: async (command) => {
        background.input()
        const content = await claudeInput(
          command,
          options.cwd,
          options,
          orgView.names,
        )
        input.push(
          receipts.add(command),
          userInput(options.conversationId ?? '', content),
        )
      },
      model: async (choice) => {
        await stream.setModel(choice.model)
        await stream.applyFlagSettings({
          ...claudeEffortSettings(choice.effort),
          fastMode: choice.fast,
          ...skillSettings,
        })
        mapper.speed.mode(choice.fast)
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
