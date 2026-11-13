// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { accessibleName } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { mount } from '../../test-support/mount'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { FakeSkills } from '../mentions/skills-test-kit'
import { LinkedText } from './LinkedText'
import { Copying, copyAll } from './mention-copy-test-kit'
import { LinksProvider } from './LinksContext'

const noFiles = {
  tree: { entries: new Map() },
  treeError: null,
  treeUnavailable: false,
}

async function mountText(text: string, skills: FakeSkills | null) {
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
          <p>
            <LinkedText mentions text={text} />
          </p>
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
      text: 'Run Skill plans and Skill codex-tests now, not /tmp, /review or src/plans',
    })
  })

  test('a copy of the message gives the skill text of each chip', async () => {
    const view = await mountText('Run /plans now', new FakeSkills())
    expect(copyAll(view.container)).toEqual({
      kept: true,
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
})
