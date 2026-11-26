import type { Agent } from '../../shared/generated/Agent'
import type { AgentSkill } from '../../shared/generated/AgentSkill'
import type { SkillLists } from '../../shared/generated/SkillLists'
import type { SkillIdentity } from '../../shared/skills'
import { plansSource } from '../../../docs/mockups/src/fixtures/skillFiles'
import { plansSkill } from '../../../docs/mockups/src/fixtures/skills'

/** A skill of the dev fake: its agent, its list entry, and its `SKILL.md`. */
interface DevSkill {
  agent: Agent
  skill: AgentSkill
  text: string
}

const findings: AgentSkill = {
  name: 'findings',
  description:
    'Use when the user asks to see, list, or reprint the open items, the findings, or the decisions of this conversation.',
}

const claudeReview: AgentSkill = {
  name: 'review',
  description: 'Review the diff of the branch before you open a pull request.',
}

const codexReview: AgentSkill = {
  name: 'review',
  description: 'Review the diff of the branch with the checks of Codex.',
}

/** The `SKILL.md` of a skill: its front matter, then its Markdown body. */
function skillText(skill: AgentSkill, body: string): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${body}\n`
}

/**
 * The skills of the dev fake. `plans` stands for a skill of the Claude
 * folder of the repository, with the text of the mockups, and `findings`
 * for an org skill. Both agents hold a skill named `review`, with other
 * texts, so a chip shows the skill of the agent of its message.
 */
const devSkills: readonly DevSkill[] = [
  {
    agent: 'claude',
    skill: findings,
    text: skillText(
      findings,
      [
        '# Findings',
        '',
        'List each open decision and finding of the conversation, highest severity first.',
        '',
        '1. Give each item its number, its severity, and its effort.',
        '2. Say what each item blocks.',
        '3. Ask for the answers in one message.',
      ].join('\n'),
    ),
  },
  { agent: 'claude', skill: plansSkill, text: plansSource },
  {
    agent: 'claude',
    skill: claudeReview,
    text: skillText(
      claudeReview,
      [
        '# Review',
        '',
        'Read the whole diff against the base branch before you comment.',
        '',
        '- Name each bug with the file and the line.',
        '- Run the tests of each changed file.',
      ].join('\n'),
    ),
  },
  {
    agent: 'codex',
    skill: codexReview,
    text: skillText(
      codexReview,
      [
        '# Review with Codex',
        '',
        'Run `npm run check`, then read the diff of each failing file.',
      ].join('\n'),
    ),
  },
]

/** The skill lists of the report of the dev fake, in name order. */
export const devSkillLists: SkillLists = {
  claude: devSkills
    .filter((each) => each.agent === 'claude')
    .map((each) => each.skill),
  codex: devSkills
    .filter((each) => each.agent === 'codex')
    .map((each) => each.skill),
}

/** The `SKILL.md` of a skill of the dev fake, or null for another skill. */
export function devSkillText(skill: SkillIdentity): string | null {
  const found = devSkills.find(
    (each) => each.agent === skill.agent && each.skill.name === skill.name,
  )
  return found?.text ?? null
}
