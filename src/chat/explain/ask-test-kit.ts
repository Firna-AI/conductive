import { act } from 'react'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { press, waitFor } from '../../test-support/mount'
import {
  FakeFiles,
  sampleTree,
} from '../components/chip-field/mention-field-test-kit'
import type { ChatMentions } from '../mentions/MentionsContext'
import { FakeSkills } from '../mentions/skills-test-kit'
import { answer, selectText, textNodeWith } from './explain-test-kit'
import { messageAttributes } from './selection'

// The helpers of the DOM tests of Ask: the quote and the question, the
// unsent popover from a selection of the recorded answer, and a press
// outside it. `ask-start-kit.ts` holds the starts that the fake answers.

/** The quote of each Ask of the tests, in the recorded answer. */
export const askQuote = 'Manual entry still works'

/** The question of each Ask of the tests, which titles its explanation. */
export const question = 'Does manual entry still fill the city?'

/** The body of the start of each Ask of the tests: the quote and the question. */
export const askBody = {
  messageId: answer.messageId,
  quote: askQuote,
  before: 'The checkout form now suggests addresses. ',
  after: '.',
  question,
}

/**
 * Selects the quote in the recorded answer, and gives Ask by it. The text
 * of the quote lies in one text node also when a mark splits the answer.
 */
export async function selectQuote(): Promise<HTMLElement> {
  const text = await waitFor(() => {
    const shown = queryAnswer()
    return shown && textNodeWith(shown, askQuote)
  }, 'the quote in the recorded answer')
  await selectText(text, askQuote)
  return waitFor(() => queryByRole('button', 'Ask'), 'Ask by the selection')
}

/** Selects the quote, presses Ask, and gives the unsent popover. */
export async function openAsk(): Promise<HTMLElement> {
  await press(await selectQuote())
  return byRole('dialog', 'Ask')
}

/** The field of the question in the unsent popover. */
export function questionField(popover: HTMLElement): HTMLElement {
  return byRole('textbox', 'Question', popover)
}

/** The element of the recorded answer in the parent chat, if it shows. */
function queryAnswer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[${messageAttributes.message}="${answer.messageId}"]`,
  )
}

/** The element of the recorded answer in the parent chat. */
export function parentAnswer(): HTMLElement {
  const element = queryAnswer()
  if (!element) throw new Error('The chat shows no recorded answer.')
  return element
}

/** The files of the workspace, as the shell gives them, so `@` finds files. */
export function workspaceFiles(): ChatMentions {
  return {
    files: new FakeFiles(sampleTree),
    skills: new FakeSkills(),
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (item) => `/files/${item.path}`,
  }
}

/** Presses the pointer on `target`, as a mouse does. */
export async function pointerDown(target: EventTarget): Promise<void> {
  await act(async () => {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  })
}
