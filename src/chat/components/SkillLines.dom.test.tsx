// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import { ended, said, skillUse, update } from './event-kit'
import { folds, textIn, topFolds } from './fold-markup-kit'
import { renderChat } from './render-kit'

/** The names of the icons in an element, in order, such as `book-open`. */
function iconsIn(element: Element | null | undefined): string[] {
  const icons = Array.from(element?.querySelectorAll('svg') ?? [])
  return icons.flatMap((icon) => {
    const name = /\blucide-([\w-]+)/.exec(icon.getAttribute('class') ?? '')
    return name ? [name[1]] : []
  })
}

/**
 * The line of a fold as drawn: whether the fold is open, its words with
 * their no-break space, the icons of its tool kinds, and whether it has the
 * layout of a line that names skills, which wraps beside the chevron.
 */
function lineOf(fold: Element) {
  const line = fold.querySelector(':scope > summary')
  return {
    open: fold.hasAttribute('open'),
    words: line?.textContent,
    icons: iconsIn(line?.querySelector(`.${styles.kinds}`)),
    named: line?.classList.contains(styles.named),
  }
}

/**
 * Each call line of a fold: its icon, its words, and the one text that the
 * skill names and the detail of a skill line form.
 */
function callsOf(fold: Element) {
  return Array.from(fold.querySelectorAll(':scope > ul > li'), (call) => ({
    icon: iconsIn(call)[0],
    words: textIn(call),
    text: textIn(call.querySelector(`.${styles.skillText}`)),
  }))
}

describe('skill lines', () => {
  it('shows a skill use as a skill line in its run, and names the skill on the line of the run, open and folded', async () => {
    const { chat, markup } = await renderChat({ conversation: 'running' })
    chat.emit(said('plan-2', 'I will plan the form first.'))
    chat.emit(skillUse('brainstorming', 'high', 'running'))
    const [, live] = topFolds(markup())
    expect(callsOf(live)).toEqual([
      {
        icon: 'book-open',
        words: 'Using skill brainstorming high',
        text: 'brainstorming high',
      },
    ])

    chat.emit(skillUse('brainstorming', 'high'))
    chat.emit(update('lint', 'npm run lint', 0))
    chat.emit(said('plan-3', 'The plan is ready.'))
    expect(topFolds(markup()).map(lineOf)).toEqual([
      { open: false, words: '1 tool call', icons: ['file-text'], named: false },
      {
        open: false,
        words: '2 tool calls\u00a0· Skill: brainstorming',
        icons: ['book-open', 'square-terminal'],
        named: true,
      },
    ])
  })

  it('names the loaded skills on the line of the work fold of an ended turn, keeps each name whole with the icons after the last, and lists the skill lines', async () => {
    const { chat, markup } = await renderChat({ conversation: 'running' })
    chat.emit(skillUse('brainstorming', 'high'))
    chat.emit(said('plan-2', 'Next I will write the tests.'))
    chat.emit(skillUse('plans', null, 'failed'))
    chat.emit(skillUse('testing', null))
    chat.emit(said('answer-2', 'The form now suggests addresses.'))
    chat.emit(ended('finished'))
    const [work] = topFolds(markup())
    const line = work.querySelector(':scope > summary')
    expect({
      line: lineOf(work),
      names: Array.from(
        line?.querySelectorAll(`.${styles.skillName}`) ?? [],
        (name) => name.textContent,
      ),
      withLastName: iconsIn(line?.querySelector(`.${styles.lastSkill}`)),
    }).toEqual({
      line: {
        open: false,
        words: '4 tool calls, 2 messages\u00a0· Skills: brainstorming, testing',
        icons: ['file-text', 'book-open'],
        named: true,
      },
      names: ['brainstorming,', 'testing'],
      withLastName: ['file-text', 'book-open'],
    })
    expect(folds(markup())[0].steps).toEqual([
      'I will check the checkout form.',
      'Read src/app/checkout/AddressForm.tsx',
      'Used skill brainstorming high',
      'Next I will write the tests.',
      'Used skill plans Failed',
      'Used skill testing',
    ])
  })
})
