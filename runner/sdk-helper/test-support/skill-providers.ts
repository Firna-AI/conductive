import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { Agent } from '../src/generated/Agent'
import { object, string } from '../src/parse'
import { createClaudeFactory } from '../src/providers/claude'
import { createCodexFactory } from '../src/providers/codex'
import type { StartProcess } from '../src/providers/process'
import { readRequest } from '../src/read-request'
import { FakeAppServers } from './app-server'
import { FakeClaudeQuery } from './claude-query'
import { providerFixture } from './fixture'
import { fakeClaudeProfile } from './profile'

export async function skillProviders(agent: Agent, refuseRoots = false) {
  const h = await providerFixture(agent)
  const copy = join(h.home, 'copies', 'first', 'org-skills')
  h.options.cwd = join(h.home, 'workspace')
  h.options.orgSkills = { repository: 'Owner/Skills', directory: copy }
  h.options.conversationId = 'saved-conversation'
  await mkdir(h.options.cwd, { recursive: true })
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
  const write = async (path: string, text: string, root = copy) => {
    const file = join(root, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  }
  return {
    ...h,
    copy,
    servers,
    write,
    skill: (path: string, name: string, text = 'Skill', root = copy) =>
      write(
        join(path, 'SKILL.md'),
        `---\nname: ${name}\ndescription: ${text}\n---\n${text}\n`,
        root,
      ),
    open: async () => {
      const request = readRequest({
        type: 'start',
        requestId: 'skills-start',
        options: { ...h.options, backgroundNoteIds: [] },
      })
      if (request.type !== 'start')
        throw new Error('The test requires an agent start.')
      return factory({
        ...request.options,
        backgroundNoteIds: new Set(request.options.backgroundNoteIds),
        event: h.options.event,
        warn: h.options.warn,
      })
    },
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
