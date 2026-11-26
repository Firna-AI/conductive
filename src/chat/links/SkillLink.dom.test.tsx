// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { UserMessage } from '../../shared/generated/UserMessage'
import type { SkillIdentity } from '../../shared/skills'
import { accessibleName } from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import { mount, press } from '../../test-support/mount'
import { AgentText } from '../components/AgentText'
import { UserBubble } from '../components/TranscriptItem'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { FakeSkills } from '../mentions/skills-test-kit'
import { Copying, copyAll } from './mention-copy-test-kit'
import { LinksProvider } from './LinksContext'

const noFiles = {
  tree: { entries: new Map() },
  treeError: null,
  treeUnavailable: false,
}

const opus: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
  fast: false,
}

const sol: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'high',
  fast: false,
}

/** A sent message of a member with `text`, to the agent of `choice`. */
function sent(text: string, choice: AgentChoice = opus): UserMessage {
  return {
    id: 'message-1',
    sessionId: FAKE_IDS.session,
    sender: senderSnapshot(fakeUser),
    text,
    attachments: [],
    choice,
    createdAt: FAKE_TIME,
    state: 'sent',
  }
}

/** The address of a skill tab, as the fake skill tabs give it. */
const tabHref = (skill: SkillIdentity) => `/skills/${skill.agent}/${skill.name}`

/**
 * Mounts `text` as the chat draws it: a sent message of a member, to the
 * agent of `choice`, or with `answer`, an answer of the agent. The skill
 * tabs record each skill that a chip opens.
 */
async function mountText(
  text: string,
  skills: FakeSkills | null,
  options: { answer?: boolean; choice?: AgentChoice } = {},
) {
  const opened: SkillIdentity[] = []
  const value: ChatMentions | null = skills && {
    files: { subscribe: () => () => undefined, getSnapshot: () => noFiles },
    skills,
    skillTabs: { open: (skill) => opened.push(skill), href: tabHref },
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (item) => `/files/${item.path}`,
  }
  const { container } = await mount(
    <LinksProvider value={{ links: { orgId: FAKE_IDS.org, workspaces: [] } }}>
      <MentionsProvider value={value}>
        <Copying>
          {options.answer ? (
            <AgentText id="agent:1" text={text} />
          ) : (
            <UserBubble message={sent(text, options.choice)} />
          )}
        </Copying>
      </MentionsProvider>
    </LinksProvider>,
  )
  const chipElements = () =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-mention]'))
  const chips = () =>
    chipElements().map((chip) => ({
      name: accessibleName(chip),
      title: chip.getAttribute('title'),
      href: chip.getAttribute('href'),
    }))
  return { container, chips, chipElements, opened }
}

const text = 'Run /plans and /codex-tests now, not /tmp, `/review` or src/plans'

describe('skill chips in a sent message', () => {
  test('a skill text of a skill of either agent is a chip that links to its skill tab, and every other skill text and code stays text', async () => {
    const view = await mountText(text, new FakeSkills())
    expect({
      chips: view.chips(),
      code: view.container.querySelector('code')?.textContent,
      text: view.container.textContent,
    }).toEqual({
      chips: [
        {
          name: 'Skill plans',
          title: 'Use before you write or change a plan file.',
          href: '/skills/claude/plans',
        },
        {
          name: 'Skill codex-tests',
          title: 'Run the tests of the repository.',
          href: '/skills/codex/codex-tests',
        },
      ],
      code: '/review',
      text: 'Run Skill plans/plans and Skill codex-tests/codex-tests now, not /tmp, /review or src/plans',
    })
  })

  test('a press on a chip opens the skill of the agent of the message, else of the other agent, and the title follows the same skill', async () => {
    const both = 'Run /review then /plans'
    const claude = await mountText(both, new FakeSkills())
    const codex = await mountText(both, new FakeSkills(), { choice: sol })
    for (const view of [claude, codex]) {
      for (const chip of view.chipElements()) await press(chip)
    }
    expect({
      claude: { chips: claude.chips(), opened: claude.opened },
      codex: { chips: codex.chips(), opened: codex.opened },
    }).toEqual({
      claude: {
        chips: [
          {
            name: 'Skill review',
            title: 'Review the diff of the branch.',
            href: '/skills/claude/review',
          },
          {
            name: 'Skill plans',
            title: 'Use before you write or change a plan file.',
            href: '/skills/claude/plans',
          },
        ],
        opened: [
          { agent: 'claude', name: 'review' },
          { agent: 'claude', name: 'plans' },
        ],
      },
      codex: {
        chips: [
          {
            name: 'Skill review',
            title: 'Review the diff with Codex.',
            href: '/skills/codex/review',
          },
          {
            name: 'Skill plans',
            title: 'Use before you write or change a plan file.',
            href: '/skills/claude/plans',
          },
        ],
        opened: [
          { agent: 'codex', name: 'review' },
          { agent: 'claude', name: 'plans' },
        ],
      },
    })
  })

  test('a copy of the message gives the skill text of each chip', async () => {
    const view = await mountText('Run /plans now', new FakeSkills())
    expect(copyAll(view.container)).toEqual({
      copying: true,
      native: true,
      text: 'Run /plans now',
    })
  })

  test('without a list, while it loads, when it is unavailable, or in a chat without mentions, each skill text stays text', async () => {
    const shown: (string | null)[] = []
    for (const skills of [
      new FakeSkills('loading'),
      new FakeSkills(null),
      null,
    ]) {
      const view = await mountText('Run /plans now', skills)
      shown.push(view.container.textContent)
      expect(view.chips()).toEqual([])
    }
    expect(shown).toEqual([
      'Run /plans now',
      'Run /plans now',
      'Run /plans now',
    ])
  })

  test('an answer keeps each skill text as text', async () => {
    const view = await mountText('Run /plans now', new FakeSkills(), {
      answer: true,
    })
    expect({
      chips: view.chips(),
      text: view.container.textContent,
    }).toEqual({ chips: [], text: 'Run /plans now' })
  })
})
