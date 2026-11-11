import type { ChatItem } from './conversations'
import { bullets } from './listConversations'

/**
 * A tool call that loads skills, as the runner gives it: the call keeps its
 * kind, and its target holds the skill names, joined by ", ". Its detail
 * holds the arguments of a Claude call, or the command of a Codex call.
 */
function skillCall(
  id: string,
  kind: 'other' | 'run',
  skills: readonly string[],
  detail?: string,
): ChatItem {
  return {
    kind: 'tool',
    id,
    tool: kind,
    target: skills.join(', '),
    detail,
    skills,
    status: 'done',
  }
}

/** A call of the `Skill` tool of Claude, which loads one skill. */
function claudeSkill(name: string, args?: string): ChatItem {
  return skillCall(`skill-${name}`, 'other', [name], args)
}

/** A Codex command that reads the `SKILL.md` file of each skill, in order. */
function codexSkills(...names: string[]): ChatItem {
  const reads = names.map(
    (name) => `sed -n '1,200p' .agents/skills/${name}/SKILL.md`,
  )
  return skillCall(
    `skills-${names.join('-')}`,
    'run',
    names,
    reads.join(' && '),
  )
}

/** A Codex command that loads no skill, which the chat shows as a run. */
function codexCommand(id: string, command: string): ChatItem {
  return { kind: 'tool', id, tool: 'run', target: command, status: 'done' }
}

/** The items, with each added call before the item whose ID is its key. */
function withCalls(
  items: readonly ChatItem[],
  before: Partial<Record<string, ChatItem>>,
): ChatItem[] {
  return items.flatMap((item) => {
    const added = before[item.id]
    return added ? [added, item] : [item]
  })
}

/**
 * A finished turn of a Codex session that loads five skills. Codex reads
 * the `SKILL.md` file of each skill with a command, and one command reads
 * two of them. A read of another file stays a plain command. The work folds
 * into one line, which names each skill once, in the order of first use.
 * The turn changes no files: the answer holds the plan and the notes.
 */
const fiveSkillsTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-next',
    text: 'Plan the next step for checkout, and draft the release notes for #482.',
  },
  {
    kind: 'agent',
    id: 'plan-next',
    blocks: ["I'll compare the options for the next step first."],
  },
  codexSkills('brainstorming'),
  codexCommand('read-form', "sed -n '1,160p' src/app/checkout/AddressForm.tsx"),
  codexSkills('plans', 'product-ui'),
  codexSkills('testing'),
  codexCommand('read-test', "sed -n '1,120p' tests/checkout/address.test.ts"),
  codexSkills('release-notes'),
  codexCommand('log', 'git log --oneline main..HEAD'),
  {
    kind: 'agent',
    id: 'next-done',
    blocks: [
      'Saved addresses are the best next step, because a returning customer can then skip the form. The plan:',
      bullets(
        'Store up to five addresses on the account.',
        'Show them above the address fields, the newest first.',
        'Test the list and the fallback to the manual fields.',
      ),
      'Release notes for #482: checkout suggests addresses as you type, and the manual fields stay as a fallback.',
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '2m 47s', files: [] },
]

/**
 * The chats with skill lines. `start`, `tests`, and `end` are the runs of
 * the canonical turn, and `running` is its end-to-end run while it runs.
 * Claude loads a skill in the first run, with its arguments, and one in the
 * run that holds the tests. The running turn and the finished turn share
 * both calls. The last chat is a Codex session that loads five skills.
 */
export function skillConversations(chats: {
  start: readonly ChatItem[]
  tests: readonly ChatItem[]
  end: readonly ChatItem[]
  running: ChatItem
}) {
  const start = withCalls(chats.start, {
    'read-form': claudeSkill('brainstorming', 'high'),
  })
  const tests = withCalls(chats.tests, {
    'create-test': claudeSkill('testing'),
  })
  return {
    'skills-running': [
      ...start,
      ...tests,
      chats.running,
      { kind: 'working', id: 'working', elapsed: '2m 41s' },
    ],
    'skills-in-work': [...start, ...tests, ...chats.end],
    'five-skills-in-work': fiveSkillsTurn,
  } as const satisfies Record<string, readonly ChatItem[]>
}
