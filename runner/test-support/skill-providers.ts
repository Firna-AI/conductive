import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Agent } from '../../src/shared/agents'
import { object, string } from '../src/parse'
import { createClaudeFactory } from '../src/providers/claude'
import { createCodexFactory } from '../src/providers/codex'
import type { StartProcess } from '../src/providers/process'
import type { ProviderOptions } from '../src/providers/types'
import { FakeAppServers } from './app-server'
import { FakeClaudeQuery } from './claude-query'
import { turn } from './harness'
import { fakeClaudeProfile, fakeToolContext } from './providers'

export function skillProviders(
  h: { root: string; home: string; warnings: string[] },
  agent: Agent,
  refuseRoots = false,
) {
  const queries: FakeClaudeQuery[] = []
  const servers = new FakeAppServers()
  const start: StartProcess = (request) => {
    const port = servers.start(request)
    let receive: (line: string) => void = () => {}
    return {
      onExit: (listener) => port.onExit(listener),
      close: () => port.close(),
      onLine(listener) {
        receive = listener
        port.onLine(listener)
      },
      write(line) {
        const value = object(JSON.parse(line))
        if (refuseRoots && value.method === 'skills/extraRoots/set') {
          servers.latest.writes.push(value)
          queueMicrotask(() =>
            receive(
              JSON.stringify({
                id: value.id,
                error: { code: -32602, message: 'Cannot read skills' },
              }),
            ),
          )
        } else port.write(line)
      },
    }
  }
  const factory =
    agent === 'claude'
      ? createClaudeFactory(
          (parameters) => {
            const sdk = new FakeClaudeQuery()
            queries.push(sdk)
            return sdk.open(parameters)
          },
          () => '/fake/claude',
          fakeClaudeProfile,
        )
      : createCodexFactory(start)
  const options: ProviderOptions = {
    cwd: h.root,
    home: h.home,
    sessionId: 'skills-session',
    endpoint: 'https://machines.conductive.test/v1/model/agent',
    credential: {
      type: 'gateway',
      ...turn('skills', 'alice', agent).credential,
    },
    commitAuthor: null,
    choice: turn('skills', 'alice', agent).message.choice,
    conversationId: 'saved-conversation',
    instructions: 'Workspace instructions',
    tools: fakeToolContext,
    event: () => {},
    warn: (message) => h.warnings.push(message),
  }
  return {
    factory,
    options,
    sdk: () => queries.at(-1),
    paths: async (): Promise<string[]> => {
      if (agent === 'claude') {
        const directory =
          queries.at(-1)?.parameters?.options?.additionalDirectories?.[0]
        if (!directory) return []
        const skills = join(directory, '.claude', 'skills')
        return (await readdir(skills)).map((name) => join(skills, name))
      }
      const write = servers.latest.writes.find(
        (write) => write.method === 'skills/extraRoots/set',
      )
      if (!write) return []
      const roots = object(write.params).extraRoots
      if (!Array.isArray(roots))
        throw new Error('The test requires skill roots.')
      return roots.map(string)
    },
    skillConfigs: () =>
      servers.requests
        .at(-1)
        ?.args.filter((value) => value.startsWith('skills.config=')) ?? [],
    rootMethods: () =>
      servers.processes
        .at(-1)
        ?.writes.map((write) => write.method)
        .filter(
          (method) =>
            method === 'skills/extraRoots/set' || method === 'thread/resume',
        ) ?? [],
  }
}
