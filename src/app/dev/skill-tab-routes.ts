import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { RunnerSkillError } from '../../shared/generated/RunnerSkillError'
import type { SkillLists } from '../../shared/generated/SkillLists'
import { isSkillName, skillContentPath } from '../../shared/skills'
import type { FakeWorkspaceEvents } from '../../test-support/fake-events'
import {
  FAKE_IDS,
  FAKE_ORIGIN,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { requireOrg, requireWorkspace, type DevBackend } from './backend'
import { ID, json, RouteError, type Route } from './router'
import { devSkillLists, devSkillText } from './skill-texts'

/**
 * The answers of the skill reads that `skillRead=` gives each read: a
 * removed skill, a text over the limit, a runner without skill reads, a
 * read that fails, or a read that never answers.
 */
export const DEV_SKILL_READS = [
  'gone',
  'too-large',
  'older-software',
  'failed',
  'wait',
] as const

export type DevSkillRead = (typeof DEV_SKILL_READS)[number]

/** The read limit of a skill text, as the Worker sends it: 1 MiB. */
const LIMIT_BYTES = 1_048_576

const codexChoice: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'high',
  fast: false,
}

/**
 * The skill lists of the report of the dev fake. With `skillRead=gone`,
 * the Claude list no longer holds `plans`, as after a rename of its folder,
 * so its tab shows the name without a description.
 */
function reportLists(skillRead: DevSkillRead | null): SkillLists {
  if (skillRead !== 'gone') return devSkillLists
  return {
    ...devSkillLists,
    claude: devSkillLists.claude.filter((skill) => skill.name !== 'plans'),
  }
}

/**
 * Puts the skills report of the dev fake, and two messages of Cal with
 * skill chips, into the history of `checkout-autocomplete`, after its
 * recorded chat. The first message went to Claude and the second to
 * Codex, so the chip `review` of each opens the skill of its own agent.
 */
export function seedSkillChips(
  events: FakeWorkspaceEvents,
  on: boolean,
  skillRead: DevSkillRead | null,
): void {
  if (!on) return
  const { message } = workspaceFixtures()
  const sent = [
    {
      ...message,
      id: 'skill-claude',
      text: 'Use /plans to plan a saved address book. Then run /review on the diff, and /findings for the open items.',
    },
    {
      ...message,
      id: 'skill-codex',
      text: 'Run /review on the address form.',
      choice: codexChoice,
    },
  ]
  const history = events.history(0, FAKE_IDS.workspace)
  const newest = history.events.reduce(
    (at, envelope) => Math.max(at, envelope.occurredAt),
    FAKE_TIME,
  )
  let eventNumber = history.throughEventNumber
  events.emit({
    workspaceId: FAKE_IDS.workspace,
    eventNumber: ++eventNumber,
    occurredAt: newest + 1_000,
    event: { type: 'skills.updated', skills: reportLists(skillRead) },
  })
  sent.forEach((each, index) =>
    events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: ++eventNumber,
      occurredAt: newest + 2_000 + index * 1_000,
      event: {
        type: 'message.accepted',
        message: { ...each, createdAt: newest + 2_000 + index * 1_000 },
      },
    }),
  )
}

/** The answer of a read whose runner refused it, as the Worker sends it. */
function refused(status: number, error: RunnerSkillError): Response {
  return json({ error }, status)
}

/**
 * The read of one skill of a workspace, as the Worker answers it: the text
 * of a skill of the dev fake, `skill_not_found` for another skill, and the
 * refusal of a cloud computer that is stopped or starts. `skillRead` gives
 * each read that answer instead. With `failed`, Try again reads again and
 * fails again, because the tab also reads again after each skills report.
 */
export function skillTabRoutes(
  backend: DevBackend,
  skillRead: DevSkillRead | null,
): Route[] {
  const path = new URL(
    skillContentPath(ID.org, ID.workspace, { agent: 'claude', name: 'x' }),
    FAKE_ORIGIN,
  ).pathname
  return [
    {
      method: 'GET',
      path,
      answer: ({ params, query }) => {
        const org = requireOrg(backend.state, params.org)
        const { state } = requireWorkspace(org, params.workspace)
        const agent = query.get('agent')
        const name = query.get('name') ?? ''
        if ((agent !== 'claude' && agent !== 'codex') || !isSkillName(name))
          throw new RouteError(400, 'invalid_input', 'Choose a skill to open.')
        if (state === 'stopped')
          throw new RouteError(
            503,
            'computer_stopped',
            'Resume the cloud computer to open this skill.',
          )
        if (state === 'starting')
          throw new RouteError(
            503,
            'computer_starting',
            'The cloud computer is starting.',
          )
        if (skillRead === 'wait') return new Promise<Response>(() => {})
        if (skillRead === 'older-software')
          throw new RouteError(
            409,
            'skill_reads_unsupported',
            'Restart the cloud computer to open this skill.',
          )
        if (skillRead === 'failed')
          throw new RouteError(
            503,
            'skill_unavailable',
            'The skill could not be read. Try again.',
          )
        const text = devSkillText({ agent, name })
        if (text === null || skillRead === 'gone')
          return refused(404, {
            code: 'skill_not_found',
            message: 'The skill is not available.',
          })
        if (skillRead === 'too-large')
          return refused(413, {
            code: 'skill_too_large',
            message: 'The skill is too large to open.',
            sizeBytes: LIMIT_BYTES + 4_096,
            limitBytes: LIMIT_BYTES,
          })
        return json({ text })
      },
    },
  ]
}
