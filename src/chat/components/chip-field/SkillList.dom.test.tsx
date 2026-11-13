// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import {
  messageText,
  pressInField,
  typeMessage,
} from '../../../test-support/message-field'
import { FakeSkills } from '../../mentions/skills-test-kit'
import { mountField } from './chip-field-test-kit'
import { mountMentionField } from './mention-field-test-kit'

const plans = 'plans, Use before you write or change a plan file.'
const review = 'review, Review the diff of the branch.'

describe('the list of /', () => {
  test('/ at the start opens the list of Skills in the host above the box, with every skill of the agent in name order and the first highlighted', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, '/')
    expect({
      inHost: view.skills.inHost(),
      label: view.skills.label(),
      rows: view.skills.rows(),
      highlighted: view.skills.highlighted(),
      active: view.field.getAttribute('aria-activedescendant'),
      controls: view.field.getAttribute('aria-controls'),
    }).toEqual({
      inHost: true,
      label: 'Skills',
      rows: [
        'git-commit, Use before you commit. Write the plans of a commit.',
        plans,
        'playwright, Drive a browser to test the app.',
        review,
      ],
      highlighted:
        'git-commit, Use before you commit. Write the plans of a commit.',
      active: 'skill-mention-list-0',
      controls: 'skill-mention-list',
    })
  })

  test('a query after a space shows names that start with it, then names that hold it, then descriptions that hold it, without regard to case', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Use /PL')
    expect(view.skills.rows()).toEqual([
      'plans, Use before you write or change a plan file.',
      'playwright, Drive a browser to test the app.',
      'git-commit, Use before you commit. Write the plans of a commit.',
    ])
  })

  test('the arrow keys move the highlight, and Enter picks the row, puts its chip and a space in place of the query, and sends nothing', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Start with /p')
    pressInField(view.field, 'ArrowDown')
    pressInField(view.field, 'ArrowDown')
    pressInField(view.field, 'ArrowUp')
    const enter = pressInField(view.field, 'Enter')
    const chips = view.chips()
    typeMessage(view.field, `${messageText(view.field)}now`)
    expect({
      kept: enter.defaultPrevented,
      sends: view.sends(),
      rows: view.skills.rows(),
      chips,
      draft: view.draft(),
    }).toEqual({
      kept: true,
      sends: 0,
      rows: [],
      chips: ['Skill playwright'],
      draft: 'Start with /playwright now',
    })
  })

  test('Tab picks the highlighted row, and the caret stays after the chip and its space', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, '/rev')
    pressInField(view.field, 'Tab')
    expect({ chips: view.chips(), draft: view.draft() }).toEqual({
      chips: ['Skill review'],
      draft: '/review ',
    })
  })

  test('Esc closes the list and keeps the text, and then Enter sends', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Run /pla')
    const escape = pressInField(view.field, 'Escape')
    const closed = { rows: view.skills.rows(), draft: view.draft() }
    pressInField(view.field, 'Enter')
    expect({
      kept: escape.defaultPrevented,
      closed,
      sends: view.sends(),
    }).toEqual({
      kept: true,
      closed: { rows: [], draft: 'Run /pla' },
      sends: 1,
    })
  })

  test('when no skill matches, the list closes and Enter sends the text', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'see /tmp')
    const list = document.querySelector('#skill-mention-list')
    const enter = pressInField(view.field, 'Enter')
    expect({
      list,
      expanded: view.field.getAttribute('aria-expanded'),
      sends: view.sends(),
      kept: enter.defaultPrevented,
    }).toEqual({ list: null, expanded: null, sends: 1, kept: true })
  })

  test('a space after the query, or a / inside a word or a path, opens no list', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, 'Run /plans now')
    const spaced = view.skills.rows()
    typeMessage(view.field, 'Read src/plans')
    expect({ spaced, inPath: view.skills.rows() }).toEqual({
      spaced: [],
      inPath: [],
    })
  })

  test('a model of the other agent shows the skills of that agent', async () => {
    const view = await mountMentionField()
    typeMessage(view.field, '/')
    const claude = view.skills.rows()
    await view.chooseAgent('codex')
    expect({ claude: claude.length, codex: view.skills.rows() }).toEqual({
      claude: 4,
      codex: [
        'codex-tests, Run the tests of the repository.',
        'review, Review the diff with Codex.',
      ],
    })
  })

  test('the loading and the unavailable lines show for every query, and Enter then sends', async () => {
    const skills = new FakeSkills('loading')
    const view = await mountMentionField({ skills })
    typeMessage(view.field, 'see /tmp')
    const loading = view.skills.line()
    await skills.set(null)
    const unavailable = view.skills.line()
    pressInField(view.field, 'Enter')
    expect({ loading, unavailable, sends: view.sends() }).toEqual({
      loading: 'Loading skills…',
      unavailable: 'The list of skills is unavailable',
      sends: 1,
    })
  })

  test('an agent without skills says so for / alone, and a query after / closes the list', async () => {
    const skills = new FakeSkills({ claude: [], codex: [] })
    const view = await mountMentionField({ skills })
    typeMessage(view.field, '/')
    const alone = view.skills.line()
    typeMessage(view.field, '/tmp')
    expect({
      alone,
      query: document.querySelector('#skill-mention-list'),
    }).toEqual({ alone: 'This repository has no skills', query: null })
  })

  test('a field without the mentions of a chat, as in New workspace, opens no list', async () => {
    const view = await mountField()
    typeMessage(view.field, '/plans')
    expect(document.querySelector('#skill-mention-list')).toBeNull()
  })
})
