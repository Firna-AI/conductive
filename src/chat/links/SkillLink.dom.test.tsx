// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { UserMessage } from '../../shared/generated/UserMessage'
import { accessibleName } from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import { mount } from '../../test-support/mount'
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

/** A sent message of a member with `text`. */
function sent(text: string): UserMessage {
  return {
    id: 'message-1',
    sessionId: FAKE_IDS.session,
    sender: senderSnapshot(fakeUser),
    text,
    attachments: [],
    choice: opus,
    createdAt: FAKE_TIME,
    state: 'sent',
  }
}

/**
 * Mounts `text` as the chat draws it: a sent message of a member, or with
 * `answer`, an answer of the agent.
 */
async function mountText(
  text: string,
  skills: FakeSkills | null,
  answer = false,
) {
  const value: ChatMentions | null = skills && {
    files: { subscribe: () => () => undefined, getSnapshot: () => noFiles },
    skills,
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (item) => `/files/${item.path}`,
  }
  const { container } = await mount(
    <LinksProvider value={{ links: { orgId: FAKE_IDS.org, workspaces: [] } }}>
      <MentionsProvider value={value}>
        <Copying>
          {answer ? (
            <AgentText id="agent:1" text={text} />
          ) : (
            <UserBubble message={sent(text)} />
          )}
        </Copying>
      </MentionsProvider>
    </LinksProvider>,
  )
  const chips = () =>
    Array.from(container.querySelectorAll('[data-mention]'), (chip) => ({
      name: accessibleName(chip),
      title: chip.getAttribute('title'),
      tag: chip.tagName,
    }))
  return { container, chips }
}

const text = 'Run /plans and /codex-tests now, not /tmp, `/review` or src/plans'

describe('skill chips in a sent message', () => {
  test('a skill text of a skill of either agent is a chip that opens nothing, and every other skill text and code stays text', async () => {
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
          tag: 'SPAN',
        },
        {
          name: 'Skill codex-tests',
          title: 'Run the tests of the repository.',
          tag: 'SPAN',
        },
      ],
      code: '/review',
      text: 'Run Skill plans/plans and Skill codex-tests/codex-tests now, not /tmp, /review or src/plans',
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
    const view = await mountText('Run /plans now', new FakeSkills(), true)
    expect({
      chips: view.chips(),
      text: view.container.textContent,
    }).toEqual({ chips: [], text: 'Run /plans now' })
  })
})
