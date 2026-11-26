import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { SkillEntry } from '../src/generated/SkillEntry'
import { SkillScanner, type SkillScannerContext } from '../src/skills'
import { FakeAppServers } from './app-server'
import { providerFixture } from './fixture'

export function skillText(fields: Record<string, string>, body = ''): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
  return `---\n${lines.join('\n')}\n---\n${body}`
}

export function codexAnswer(
  cwd: string,
  skills: readonly (Omit<SkillEntry, 'manualOnly'> & { enabled?: boolean })[],
) {
  return {
    data: [
      {
        cwd,
        errors: [],
        skills: skills.map((skill) => ({
          scope: 'repo',
          enabled: true,
          pluginId: null,
          ...skill,
        })),
      },
    ],
  }
}

function codexServers(answer: unknown | null) {
  const servers = new FakeAppServers()
  servers.prepare = (server) => {
    if (answer === null) server.unanswered.add('skills/list')
    else server.results.set('skills/list', answer)
  }
  return servers
}

export async function scannerFixture(
  options: Partial<SkillScannerContext> = {},
) {
  const fixture = await providerFixture()
  const servers = codexServers({ data: [] })
  const scanner = new SkillScanner({
    repository: fixture.root,
    home: fixture.home,
    now: () => 100,
    warn: (warning) => fixture.warnings.push(warning),
    start: servers.start,
    ...options,
  })
  const write = async (path: string, text: string) => {
    const target = join(fixture.root, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, text)
  }
  return { ...fixture, scanner, servers, write }
}
