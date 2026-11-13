import type { AgentSkill } from '../../src/shared/skills'
import type { RunnerEventEnvelope } from '../../src/shared/runner'
import type { SkillEntry } from '../src/skill-report'
import { SkillLists } from '../src/skills'
import { FakeAppServers } from './app-server'

/** The front matter and text of a `SKILL.md`. */
export function skillText(fields: Record<string, string>, body = ''): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
  return `---\n${lines.join('\n')}\n---\n${body}`
}

/** A `skills/list` answer of the Codex app server for one folder. */
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

/** Fake Codex app servers that each answer `skills/list` with one answer. */
export function codexServers(answer: unknown | null) {
  const servers = new FakeAppServers()
  servers.prepare = (server) => {
    if (answer === null) server.unanswered.add('skills/list')
    else server.results.set('skills/list', answer)
  }
  return servers
}

/** Lists that resolve a wait when a scan gives a matching list. */
export class ObservedLists extends SkillLists {
  private waits: { match: () => boolean; resolve: () => void }[] = []

  override replace(lists: Parameters<SkillLists['replace']>[0]): void {
    super.replace(lists)
    this.waits = this.waits.filter((wait) => {
      if (wait.match()) wait.resolve()
      return !wait.match()
    })
  }

  until(match: (lists: SkillLists) => boolean): Promise<void> {
    return new Promise((resolve) => {
      this.waits.push({ match: () => match(this), resolve })
    })
  }
}

/** The skill reports that reached the endpoint, in order. */
export function skillReports(
  events: readonly RunnerEventEnvelope[],
): { claude: readonly AgentSkill[]; codex: readonly AgentSkill[] }[] {
  return events.flatMap(({ event }) =>
    event.type === 'skills.updated'
      ? [{ claude: event.claude, codex: event.codex }]
      : [],
  )
}
